import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UserFollower } from "../../src/user-followers/user-follower.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";

useTestDatabase();

function follow(authorization: string, username: string) {
	return api()
		.post(`/users/${username}/follow`)
		.set("Authorization", authorization);
}

function connectionUsernames(response: {
	body: { data: { users: { username: string }[] } };
}) {
	return response.body.data.users.map(user => user.username);
}

void describe("POST /users/:username/follow", () => {
	void it("follows a public profile and records the activity on both sides", async () => {
		const follower = await createUserWithSession();
		const target = await createUserWithSession();

		const response = await follow(
			follower.authorization,
			target.user.username
		);

		assert.equal(response.status, 201);
		assert.deepEqual(response.body.data, {
			status: "accepted",
			targetId: target.user.id
		});
		assert.equal(
			await UserFollower.count({
				where: {
					followerId: follower.user.id,
					followingId: target.user.id
				}
			}),
			1
		);
		await eventually(async () => {
			const profile = await api()
				.get(`/users/${follower.user.username}`)
				.set("Authorization", follower.authorization)
				.expect(200);
			assert.ok(
				profile.body.data.recentActivity.some(
					(activity: {
						type: string;
						target: { id: string } | null;
					}) =>
						activity.type === "user_followed" &&
						activity.target?.id === target.user.id
				)
			);
		});
	});

	void it("follows a private profile that does not accept requests right away", async () => {
		const follower = await createUserWithSession();
		const target = await createUserWithSession();
		await User.update(
			{ profileVisibility: "private", acceptFollowRequests: false },
			{ where: { id: target.user.id } }
		);

		const response = await follow(
			follower.authorization,
			target.user.username
		);

		assert.equal(response.status, 201);
		assert.equal(response.body.data.status, "accepted");
	});

	void it("rejects following oneself with 400 USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF", async () => {
		const user = await createUserWithSession();

		const response = await follow(user.authorization, user.user.username);

		assert.equal(response.status, 400);
		assert.equal(
			response.body.type,
			"USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF"
		);
	});

	void it("rejects following twice with 409 USER_FOLLOW_REQUEST_ALREADY_FOLLOWING", async () => {
		const follower = await createUserWithSession();
		const target = await createUserWithSession();
		await follow(follower.authorization, target.user.username).expect(201);

		const response = await follow(
			follower.authorization,
			target.user.username
		);

		assert.equal(response.status, 409);
		assert.equal(
			response.body.type,
			"USER_FOLLOW_REQUEST_ALREADY_FOLLOWING"
		);
	});

	void it("answers 404 USER_FOLLOW_REQUEST_USER_NOT_FOUND for an unknown username", async () => {
		const follower = await createUserWithSession();

		const response = await follow(follower.authorization, "ghost_user");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOW_REQUEST_USER_NOT_FOUND");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const target = await createUserWithSession();

		const response = await follow("Bearer invalid", target.user.username);

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("DELETE /users/:username/follow", () => {
	void it("unfollows a followed profile", async () => {
		const follower = await createUserWithSession();
		const target = await createUserWithSession();
		await follow(follower.authorization, target.user.username).expect(201);

		const response = await api()
			.delete(`/users/${target.user.username}/follow`)
			.set("Authorization", follower.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await UserFollower.count({
				where: { followerId: follower.user.id }
			}),
			0
		);
	});

	void it("answers 404 USER_FOLLOWER_NOT_FOLLOWING when not following", async () => {
		const follower = await createUserWithSession();
		const target = await createUserWithSession();

		const response = await api()
			.delete(`/users/${target.user.username}/follow`)
			.set("Authorization", follower.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOWER_NOT_FOLLOWING");
	});

	void it("answers 404 USER_FOLLOWER_USER_NOT_FOUND for an unknown username", async () => {
		const follower = await createUserWithSession();

		const response = await api()
			.delete("/users/ghost_user/follow")
			.set("Authorization", follower.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOWER_USER_NOT_FOUND");
	});
});

void describe("GET /users/:username/followers and /following", () => {
	void it("lists followers and followings of a public profile without authentication", async () => {
		const target = await createUserWithSession();
		const first = await createUserWithSession();
		const second = await createUserWithSession();
		await follow(first.authorization, target.user.username).expect(201);
		await follow(second.authorization, target.user.username).expect(201);
		await follow(target.authorization, first.user.username).expect(201);

		const followers = await api().get(
			`/users/${target.user.username}/followers`
		);
		assert.equal(followers.status, 200);
		assert.deepEqual(
			new Set(connectionUsernames(followers)),
			new Set([first.user.username, second.user.username])
		);

		const following = await api().get(
			`/users/${target.user.username}/following`
		);
		assert.equal(following.status, 200);
		assert.deepEqual(connectionUsernames(following), [first.user.username]);
	});

	void it("flags whether the viewer follows each listed user", async () => {
		const target = await createUserWithSession();
		const viewer = await createUserWithSession();
		const followed = await createUserWithSession();
		const notFollowed = await createUserWithSession();
		await follow(followed.authorization, target.user.username).expect(201);
		await follow(notFollowed.authorization, target.user.username).expect(
			201
		);
		await follow(viewer.authorization, followed.user.username).expect(201);

		const response = await api()
			.get(`/users/${target.user.username}/followers`)
			.set("Authorization", viewer.authorization)
			.expect(200);

		const isFollowingByUsername = new Map(
			response.body.data.users.map(
				(user: { username: string; isFollowing: boolean }) => [
					user.username,
					user.isFollowing
				]
			)
		);
		assert.equal(isFollowingByUsername.get(followed.user.username), true);
		assert.equal(
			isFollowingByUsername.get(notFollowed.user.username),
			false
		);
	});

	void it("rejects the connections of a private profile with 403 USER_PRIVATE", async () => {
		const target = await createUserWithSession();
		const viewer = await createUserWithSession();
		await User.update(
			{ profileVisibility: "private" },
			{ where: { id: target.user.id } }
		);

		const response = await api()
			.get(`/users/${target.user.username}/followers`)
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});

	void it("answers 404 USER_NOT_FOUND for an unknown username", async () => {
		const response = await api().get("/users/ghost_user/following");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});
});
