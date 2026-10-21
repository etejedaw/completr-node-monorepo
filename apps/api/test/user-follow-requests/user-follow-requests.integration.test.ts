import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { UserFollowRequest } from "../../src/user-follow-requests/user-follow-request.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

const REQUESTS_PATH = "/users/me/follow-requests";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

async function createPrivateUser(acceptFollowRequests = true) {
	const account = await createUserWithSession();
	await User.update(
		{ profileVisibility: "private", acceptFollowRequests },
		{ where: { id: account.user.id } }
	);
	return account;
}

function requestToFollow(requester: Account, target: Account) {
	return api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", requester.authorization);
}

async function incomingRequesterIds(target: Account) {
	const response = await api()
		.get(REQUESTS_PATH)
		.set("Authorization", target.authorization)
		.expect(200);
	return (response.body.data.requests as { requesterId: string }[]).map(
		request => request.requesterId
	);
}

function isFollowing(followerId: string, followingId: string) {
	return UserFollower.count({ where: { followerId, followingId } }).then(
		count => count > 0
	);
}

void describe("follow requests to a private profile", () => {
	void it("creates a pending request listed to the target with the requester", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();

		const response = await requestToFollow(requester, target);

		assert.equal(response.status, 201);
		assert.deepEqual(response.body.data, {
			status: "pending",
			targetId: target.user.id
		});
		assert.equal(
			await isFollowing(requester.user.id, target.user.id),
			false
		);
		const listed = await api()
			.get(REQUESTS_PATH)
			.set("Authorization", target.authorization)
			.expect(200);
		assert.equal(listed.body.data.requests.length, 1);
		assert.equal(
			listed.body.data.requests[0].user.username,
			requester.user.username
		);
	});

	void it("rejects a repeated request with 409 USER_FOLLOW_REQUEST_ALREADY_REQUESTED", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();
		await requestToFollow(requester, target).expect(201);

		const response = await requestToFollow(requester, target);

		assert.equal(response.status, 409);
		assert.equal(
			response.body.type,
			"USER_FOLLOW_REQUEST_ALREADY_REQUESTED"
		);
		assert.deepEqual(await incomingRequesterIds(target), [
			requester.user.id
		]);
	});
});

void describe("POST /users/me/follow-requests/:requesterId/accept", () => {
	void it("turns the request into a follow", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();
		await requestToFollow(requester, target).expect(201);

		const response = await api()
			.post(`${REQUESTS_PATH}/${requester.user.id}/accept`)
			.set("Authorization", target.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await isFollowing(requester.user.id, target.user.id),
			true
		);
		assert.deepEqual(await incomingRequesterIds(target), []);
	});

	void it("answers 404 USER_FOLLOW_REQUEST_NOT_FOUND without a pending request", async () => {
		const target = await createPrivateUser();
		const stranger = await createUserWithSession();

		const response = await api()
			.post(`${REQUESTS_PATH}/${stranger.user.id}/accept`)
			.set("Authorization", target.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOW_REQUEST_NOT_FOUND");
		assert.equal(
			await isFollowing(stranger.user.id, target.user.id),
			false
		);
	});

	void it("does not let the requester accept its own request", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();
		await requestToFollow(requester, target).expect(201);

		const response = await api()
			.post(`${REQUESTS_PATH}/${requester.user.id}/accept`)
			.set("Authorization", requester.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOW_REQUEST_NOT_FOUND");
		assert.equal(
			await isFollowing(requester.user.id, target.user.id),
			false
		);
	});

	void it("rejects a malformed requester id with 422 COMMON_SCHEMA_INVALID", async () => {
		const target = await createPrivateUser();

		const response = await api()
			.post(`${REQUESTS_PATH}/not-a-uuid/accept`)
			.set("Authorization", target.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.post(`${REQUESTS_PATH}/${randomUUID()}/accept`)
			.set("Authorization", "Bearer invalid");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("POST /users/me/follow-requests/:requesterId/reject", () => {
	void it("drops the request without following", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();
		await requestToFollow(requester, target).expect(201);

		const response = await api()
			.post(`${REQUESTS_PATH}/${requester.user.id}/reject`)
			.set("Authorization", target.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await isFollowing(requester.user.id, target.user.id),
			false
		);
		assert.deepEqual(await incomingRequesterIds(target), []);
		await requestToFollow(requester, target).expect(201);
	});

	void it("answers 404 USER_FOLLOW_REQUEST_NOT_FOUND without a pending request", async () => {
		const target = await createPrivateUser();

		const response = await api()
			.post(`${REQUESTS_PATH}/${randomUUID()}/reject`)
			.set("Authorization", target.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOW_REQUEST_NOT_FOUND");
	});
});

void describe("DELETE /users/me/follow-requests/sent/:username", () => {
	void it("cancels an outgoing request", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();
		await requestToFollow(requester, target).expect(201);

		const response = await api()
			.delete(`${REQUESTS_PATH}/sent/${target.user.username}`)
			.set("Authorization", requester.authorization);

		assert.equal(response.status, 204);
		assert.deepEqual(await incomingRequesterIds(target), []);
	});

	void it("answers 404 USER_FOLLOW_REQUEST_NOT_FOUND without an outgoing request", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();

		const response = await api()
			.delete(`${REQUESTS_PATH}/sent/${target.user.username}`)
			.set("Authorization", requester.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOW_REQUEST_NOT_FOUND");
	});

	void it("answers 404 USER_FOLLOW_REQUEST_USER_NOT_FOUND for an unknown username", async () => {
		const requester = await createUserWithSession();

		const response = await api()
			.delete(`${REQUESTS_PATH}/sent/ghost_user`)
			.set("Authorization", requester.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOW_REQUEST_USER_NOT_FOUND");
	});
});

void describe("turning off follow requests", () => {
	void it("drops the pending requests when the target stops accepting them", async () => {
		const target = await createPrivateUser();
		const requester = await createUserWithSession();
		await requestToFollow(requester, target).expect(201);

		await api()
			.patch("/users/me")
			.set("Authorization", target.authorization)
			.send({ acceptFollowRequests: false })
			.expect(200);

		assert.equal(
			await UserFollowRequest.count({
				where: { targetId: target.user.id }
			}),
			0
		);
	});
});
