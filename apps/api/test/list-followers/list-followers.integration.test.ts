import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ListFollower } from "../../src/list-followers/list-follower.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createList, createScoreSource } from "../helpers/factories.helper";

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic" });
});

const NON_EXISTENT_LIST_ID = "00000000-0000-4000-8000-000000000000";

async function setup(isPublic: boolean) {
	const owner = await createUserWithSession();
	const follower = await createUserWithSession();
	const stranger = await createUserWithSession();
	const list = await createList(owner.user.id, "metacritic", { isPublic });
	await ListFollower.create({ listId: list.id, userId: follower.user.id });
	return { owner, follower, stranger, list };
}

function getFollowers(listId: string, authorization?: string) {
	const request = api().get(`/lists/${listId}/followers`);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function usernames(response: {
	body: { data: { users: { username: string }[] } };
}) {
	return response.body.data.users.map(user => user.username);
}

void describe("GET /lists/:listId/followers", () => {
	void it("hides the followers of a private list from a third party", async () => {
		const { stranger, list } = await setup(false);

		const response = await getFollowers(list.id, stranger.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_LIST_NOT_FOUND");
	});

	void it("answers a private list the same way as a missing one", async () => {
		const { stranger, list } = await setup(false);

		const privateResponse = await getFollowers(
			list.id,
			stranger.authorization
		);
		const missingResponse = await getFollowers(
			NON_EXISTENT_LIST_ID,
			stranger.authorization
		);

		assert.equal(privateResponse.status, missingResponse.status);
		assert.equal(privateResponse.body.type, missingResponse.body.type);
	});

	void it("shows the followers of a private list to its owner", async () => {
		const { owner, follower, list } = await setup(false);

		const response = await getFollowers(list.id, owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(usernames(response), [follower.user.username]);
	});

	void it("shows the followers of a public list to anyone", async () => {
		const { stranger, follower, list } = await setup(true);

		const response = await getFollowers(list.id, stranger.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(usernames(response), [follower.user.username]);
	});

	void it("returns 404 for a list that does not exist", async () => {
		const { stranger } = await setup(true);

		const response = await getFollowers(
			NON_EXISTENT_LIST_ID,
			stranger.authorization
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_LIST_NOT_FOUND");
	});

	void it("rejects a request without credentials", async () => {
		const { list } = await setup(true);

		const response = await getFollowers(list.id);

		assert.equal(response.status, 422);
	});

	void it("rejects an invalid token with 401", async () => {
		const { list } = await setup(true);

		const response = await getFollowers(list.id, "Bearer invalid-token");

		assert.equal(response.status, 401);
	});
});

void describe("GET /users/:username/following-lists", () => {
	function getFollowingLists(username: string, authorization?: string) {
		const request = api().get(`/users/${username}/following-lists`);
		return authorization
			? request.set("Authorization", authorization)
			: request;
	}

	function listIds(response: {
		body: { data: { followingLists: { id: string }[] } };
	}) {
		return response.body.data.followingLists.map(list => list.id);
	}

	async function setupFollowedLists() {
		const owner = await createUserWithSession();
		const follower = await createUserWithSession();
		const viewer = await createUserWithSession();
		const publicList = await createList(owner.user.id, "metacritic", {
			isPublic: true
		});
		const privateList = await createList(owner.user.id, "metacritic", {
			isPublic: false
		});
		const viewerPrivateList = await createList(
			viewer.user.id,
			"metacritic",
			{ isPublic: false }
		);
		for (const list of [publicList, privateList, viewerPrivateList])
			await ListFollower.create({
				listId: list.id,
				userId: follower.user.id
			});
		return {
			follower,
			viewer,
			publicList,
			privateList,
			viewerPrivateList
		};
	}

	void it("hides followed private lists from a third party", async () => {
		const { follower, viewer, publicList, viewerPrivateList } =
			await setupFollowedLists();

		const response = await getFollowingLists(
			follower.user.username,
			viewer.authorization
		);

		assert.equal(response.status, 200);
		assert.deepEqual(
			new Set(listIds(response)),
			new Set([publicList.id, viewerPrivateList.id])
		);
		assert.equal(response.body.data.total, 2);
	});

	void it("shows only public lists to an anonymous viewer", async () => {
		const { follower, publicList } = await setupFollowedLists();

		const response = await getFollowingLists(follower.user.username);

		assert.equal(response.status, 200);
		assert.deepEqual(listIds(response), [publicList.id]);
		assert.equal(response.body.data.total, 1);
	});

	void it("keeps every followed list for the user themselves", async () => {
		const { follower, publicList, privateList, viewerPrivateList } =
			await setupFollowedLists();

		const response = await getFollowingLists(
			follower.user.username,
			follower.authorization
		);

		assert.equal(response.status, 200);
		assert.deepEqual(
			new Set(listIds(response)),
			new Set([publicList.id, privateList.id, viewerPrivateList.id])
		);
	});
});
