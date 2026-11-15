import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ListFollower } from "../../src/list-followers/list-follower.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createList, createScoreSource } from "../helpers/factories.helper";

const FOLLOWERS_COUNT = 5;

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic" });
});

async function setupFollowedList() {
	const owner = await createUserWithSession();
	const stranger = await createUserWithSession();
	const list = await createList(owner.user.id, "metacritic", {
		isPublic: true
	});
	const followers = [];
	for (let index = 0; index < FOLLOWERS_COUNT; index++) {
		const follower = await createUserWithSession();
		await ListFollower.create({
			listId: list.id,
			userId: follower.user.id
		});
		followers.push(follower);
	}
	return { owner, stranger, list, followers };
}

function getFollowers(listId: string, authorization: string, query = "") {
	return api()
		.get(`/lists/${listId}/followers${query}`)
		.set("Authorization", authorization);
}

function usernames(response: {
	body: { data: { users: { username: string }[] } };
}) {
	return response.body.data.users.map(user => user.username);
}

void describe("GET /lists/:listId/followers privacy and pagination", () => {
	void it("shows the owner every follower, hidden ones included", async () => {
		const { owner, list, followers } = await setupFollowedList();
		await ListFollower.update(
			{ isVisible: false },
			{ where: { listId: list.id, userId: followers[0]!.user.id } }
		);

		const response = await getFollowers(list.id, owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, FOLLOWERS_COUNT);
		assert.equal(usernames(response).length, FOLLOWERS_COUNT);
	});

	void it("hides from anyone else the followers that turned their visibility off", async () => {
		const { stranger, list, followers } = await setupFollowedList();
		await ListFollower.update(
			{ isVisible: false },
			{ where: { listId: list.id, userId: followers[0]!.user.id } }
		);

		const response = await getFollowers(list.id, stranger.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, FOLLOWERS_COUNT - 1);
		assert.ok(!usernames(response).includes(followers[0]!.user.username));
	});

	void it("leaves out deactivated followers for the owner and for everyone else", async () => {
		const { owner, stranger, list, followers } = await setupFollowedList();
		await User.update(
			{ isActive: false },
			{ where: { id: followers[1]!.user.id } }
		);

		for (const viewer of [owner, stranger]) {
			const response = await getFollowers(list.id, viewer.authorization);

			assert.equal(response.body.data.total, FOLLOWERS_COUNT - 1);
			assert.ok(
				!usernames(response).includes(followers[1]!.user.username)
			);
		}
	});

	void it("paginates without repeating or skipping followers", async () => {
		const { owner, list } = await setupFollowedList();

		const first = await getFollowers(
			list.id,
			owner.authorization,
			"?limit=2&offset=0"
		);
		const second = await getFollowers(
			list.id,
			owner.authorization,
			"?limit=2&offset=2"
		);
		const third = await getFollowers(
			list.id,
			owner.authorization,
			"?limit=2&offset=4"
		);

		const all = [
			...usernames(first),
			...usernames(second),
			...usernames(third)
		];
		assert.equal(first.body.data.total, FOLLOWERS_COUNT);
		assert.deepEqual(
			[
				usernames(first).length,
				usernames(second).length,
				usernames(third).length
			],
			[2, 2, 1]
		);
		assert.equal(new Set(all).size, FOLLOWERS_COUNT);
	});

	void it("returns an empty page with the total when the offset is past the end", async () => {
		const { owner, list } = await setupFollowedList();

		const response = await getFollowers(
			list.id,
			owner.authorization,
			"?offset=100"
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.users, []);
		assert.equal(response.body.data.total, FOLLOWERS_COUNT);
	});

	void it("rejects garbage pagination with 422", async () => {
		const { owner, list } = await setupFollowedList();

		for (const query of [
			"?limit=0",
			"?limit=101",
			"?offset=-1",
			"?limit=abc"
		]) {
			const response = await getFollowers(
				list.id,
				owner.authorization,
				query
			);
			assert.equal(response.status, 422, query);
		}
	});
});
