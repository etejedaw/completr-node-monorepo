import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UserFollower } from "../../src/user-followers/user-follower.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createUser } from "../helpers/factories.helper";
import { countQueries } from "../helpers/query-counter.helper";

useTestDatabase();

type ConnectionKind = "followers" | "following";

const CONNECTION_KINDS: ConnectionKind[] = ["followers", "following"];

interface ConnectionsQuery {
	limit?: number | string;
	offset?: number | string;
	search?: string;
}

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

function listConnections(
	username: string,
	kind: ConnectionKind,
	query: ConnectionsQuery = {}
) {
	return api().get(`/users/${username}/${kind}`).query(query);
}

function minutesAfter(base: Date, minutes: number) {
	return new Date(base.getTime() + minutes * 60_000);
}

async function seedConnection(
	owner: User,
	kind: ConnectionKind,
	createdAt: Date
) {
	const other = await createUser();
	await UserFollower.create(
		kind === "followers"
			? { followerId: other.id, followingId: owner.id, createdAt }
			: { followerId: owner.id, followingId: other.id, createdAt }
	);
	return other;
}

async function seedConnections(
	owner: User,
	kind: ConnectionKind,
	followedAt: Date[]
) {
	const others: User[] = [];
	for (const createdAt of followedAt) {
		others.push(await seedConnection(owner, kind, createdAt));
	}
	return others;
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
		assert.equal(followers.body.data.total, 2);

		const following = await api().get(
			`/users/${target.user.username}/following`
		);
		assert.equal(following.status, 200);
		assert.deepEqual(connectionUsernames(following), [first.user.username]);
		assert.equal(following.body.data.total, 1);
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

		for (const kind of CONNECTION_KINDS) {
			const response = await api()
				.get(`/users/${target.user.username}/${kind}`)
				.query({ limit: 5, search: "u_" })
				.set("Authorization", viewer.authorization);

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "USER_PRIVATE");
		}
	});

	void it("answers 404 USER_NOT_FOUND for an unknown username", async () => {
		for (const kind of CONNECTION_KINDS) {
			const response = await listConnections("ghost_user", kind, {
				limit: 5
			});

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		}
	});
});

for (const kind of CONNECTION_KINDS) {
	void describe(`GET /users/:username/${kind} pagination`, () => {
		void it("pages newest first with limit, offset and the full total", async () => {
			const owner = await createUser();
			const base = new Date("2026-03-01T10:00:00.000Z");
			const others = await seedConnections(owner, kind, [
				minutesAfter(base, 0),
				minutesAfter(base, 1),
				minutesAfter(base, 2),
				minutesAfter(base, 3),
				minutesAfter(base, 4)
			]);
			const newestFirst = others
				.map(other => other.username)
				.toReversed();

			const firstPage = await listConnections(owner.username, kind, {
				limit: 2
			});
			const secondPage = await listConnections(owner.username, kind, {
				limit: 2,
				offset: 2
			});
			const lastPage = await listConnections(owner.username, kind, {
				limit: 2,
				offset: 4
			});
			const pastTheEnd = await listConnections(owner.username, kind, {
				limit: 2,
				offset: 6
			});

			assert.equal(firstPage.status, 200);
			assert.deepEqual(
				connectionUsernames(firstPage),
				newestFirst.slice(0, 2)
			);
			assert.deepEqual(
				connectionUsernames(secondPage),
				newestFirst.slice(2, 4)
			);
			assert.deepEqual(
				connectionUsernames(lastPage),
				newestFirst.slice(4)
			);
			assert.deepEqual(connectionUsernames(pastTheEnd), []);
			for (const page of [firstPage, secondPage, lastPage, pastTheEnd]) {
				assert.equal(page.body.data.total, 5);
			}
		});

		void it("returns 24 users per page by default", async () => {
			const owner = await createUser();
			const base = new Date("2026-03-01T10:00:00.000Z");
			await seedConnections(
				owner,
				kind,
				Array.from({ length: 25 }, (_, index) =>
					minutesAfter(base, index)
				)
			);

			const response = await listConnections(owner.username, kind);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.users.length, 24);
			assert.equal(response.body.data.total, 25);
		});

		void it("breaks ties on the same follow date by id so pages never overlap", async () => {
			const owner = await createUser();
			const followedAt = new Date("2026-03-01T10:00:00.000Z");
			const others = await seedConnections(
				owner,
				kind,
				Array.from({ length: 4 }, () => followedAt)
			);
			const edges = await UserFollower.findAll({
				where:
					kind === "followers"
						? { followingId: owner.id }
						: { followerId: owner.id }
			});
			const usernameById = new Map(
				others.map(other => [other.id, other.username])
			);
			const expected = edges
				.toSorted((a, b) => (a.id < b.id ? 1 : -1))
				.map(edge =>
					usernameById.get(
						kind === "followers"
							? edge.followerId
							: edge.followingId
					)
				);

			const pages = [];
			for (const offset of [0, 1, 2, 3]) {
				const page = await listConnections(owner.username, kind, {
					limit: 1,
					offset
				});
				pages.push(...connectionUsernames(page));
			}

			assert.deepEqual(pages, expected);
		});

		void it("searches by username or name, case-insensitively, and counts only the matches", async () => {
			const owner = await createUser();
			const base = new Date("2026-03-01T10:00:00.000Z");
			const byUsername = await seedConnection(owner, kind, base);
			const byName = await seedConnection(
				owner,
				kind,
				minutesAfter(base, 1)
			);
			const unrelated = await seedConnection(
				owner,
				kind,
				minutesAfter(base, 2)
			);
			await byUsername.update({
				username: `zeldafan_${byUsername.id.slice(0, 6)}`
			});
			await byName.update({ name: "Hyrule Zeldafan" });

			const both = await listConnections(owner.username, kind, {
				search: "ZELDAFAN"
			});
			const onlyName = await listConnections(owner.username, kind, {
				search: "hyrule"
			});

			assert.equal(both.status, 200);
			assert.deepEqual(connectionUsernames(both), [
				byName.username,
				byUsername.username
			]);
			assert.equal(both.body.data.total, 2);
			assert.deepEqual(connectionUsernames(onlyName), [byName.username]);
			assert.equal(onlyName.body.data.total, 1);
			assert.ok(!connectionUsernames(both).includes(unrelated.username));
		});

		void it("pages inside the search results", async () => {
			const owner = await createUser();
			const base = new Date("2026-03-01T10:00:00.000Z");
			const oldestSamus = await seedConnection(owner, kind, base);
			await seedConnection(owner, kind, minutesAfter(base, 1));
			const newestSamus = await seedConnection(
				owner,
				kind,
				minutesAfter(base, 2)
			);
			await oldestSamus.update({ name: "Samus Fan" });
			await newestSamus.update({ name: "Samus Hunter" });

			const response = await listConnections(owner.username, kind, {
				search: "samus",
				limit: 1,
				offset: 1
			});

			assert.deepEqual(connectionUsernames(response), [
				oldestSamus.username
			]);
			assert.equal(response.body.data.total, 2);
		});

		void it("treats LIKE wildcards in the search as literal text", async () => {
			const owner = await createUser();
			await seedConnections(owner, kind, [
				new Date("2026-03-01T10:00:00.000Z")
			]);

			for (const search of ["zzz%", "zzz_", "zzz\\"]) {
				const response = await listConnections(owner.username, kind, {
					search
				});

				assert.deepEqual(connectionUsernames(response), []);
				assert.equal(response.body.data.total, 0);
			}
		});

		void it("does not filter when the search has no letters or digits", async () => {
			const owner = await createUser();
			const [other] = await seedConnections(owner, kind, [
				new Date("2026-03-01T10:00:00.000Z")
			]);

			for (const search of ["%", "_", "%_\\"]) {
				const response = await listConnections(owner.username, kind, {
					search
				});

				assert.deepEqual(connectionUsernames(response), [
					other!.username
				]);
				assert.equal(response.body.data.total, 1);
			}
		});

		void it("leaves deactivated accounts out of the page and the total", async () => {
			const owner = await createUser();
			const base = new Date("2026-03-01T10:00:00.000Z");
			const active = await seedConnection(owner, kind, base);
			const inactive = await seedConnection(
				owner,
				kind,
				minutesAfter(base, 1)
			);
			const alsoActive = await seedConnection(
				owner,
				kind,
				minutesAfter(base, 2)
			);
			await inactive.update({ isActive: false });

			const response = await listConnections(owner.username, kind, {
				limit: 2
			});

			assert.deepEqual(connectionUsernames(response), [
				alsoActive.username,
				active.username
			]);
			assert.equal(response.body.data.total, 2);
		});

		void it("rejects invalid pagination or search with 422 COMMON_SCHEMA_INVALID", async () => {
			const owner = await createUser();
			const invalidQueries: ConnectionsQuery[] = [
				{ limit: 0 },
				{ limit: 101 },
				{ limit: "abc" },
				{ offset: -1 },
				{ search: "x".repeat(101) }
			];

			for (const query of invalidQueries) {
				const response = await listConnections(
					owner.username,
					kind,
					query
				);

				assert.equal(response.status, 422, JSON.stringify(query));
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			}
		});

		void it("runs the same number of queries whatever the page size", async () => {
			const owner = await createUser();
			const viewer = await createUserWithSession();
			const base = new Date("2026-03-01T10:00:00.000Z");
			await seedConnections(
				owner,
				kind,
				Array.from({ length: 10 }, (_, index) =>
					minutesAfter(base, index)
				)
			);

			const request = (limit: number) =>
				listConnections(owner.username, kind, { limit })
					.set("Authorization", viewer.authorization)
					.expect(200);

			const single = await countQueries(() => request(1));
			const many = await countQueries(() => request(10));

			assert.equal(many, single);
		});
	});
}
