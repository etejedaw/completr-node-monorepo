import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ListFollower } from "../../src/list-followers/list-follower.model";
import { List } from "../../src/lists/list.model";
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

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

async function setupFollowedList() {
	const owner = await createUserWithSession();
	const follower = await createUserWithSession();
	const otherFollower = await createUserWithSession();
	const stranger = await createUserWithSession();
	const list = await createList(owner.user.id, "metacritic", {
		isPublic: true
	});
	await ListFollower.create({ listId: list.id, userId: follower.user.id });
	await ListFollower.create({
		listId: list.id,
		userId: otherFollower.user.id
	});
	return { owner, follower, otherFollower, stranger, list };
}

function patchFollow(
	account: Account,
	listId: string,
	body: unknown = { isVisible: false }
) {
	return api()
		.patch(`/lists/${listId}/follow`)
		.set("Authorization", account.authorization)
		.send(body as object);
}

function deleteFollow(account: Account, listId: string) {
	return api()
		.delete(`/lists/${listId}/follow`)
		.set("Authorization", account.authorization);
}

async function getListDetail(account: Account, listId: string) {
	const response = await api()
		.get(`/lists/${listId}`)
		.set("Authorization", account.authorization)
		.expect(200);
	return response.body.data.list as {
		followerCount: number;
		isFollowing: boolean;
	};
}

async function getFollowedLists(account: Account) {
	const response = await api()
		.get("/lists/following")
		.set("Authorization", account.authorization)
		.expect(200);
	return response.body.data.lists as { id: string; isVisible: boolean }[];
}

async function getPublicFollowingListIds(username: string, viewer: Account) {
	const response = await api()
		.get(`/users/${username}/following-lists`)
		.set("Authorization", viewer.authorization)
		.expect(200);
	return (response.body.data.followingLists as { id: string }[]).map(
		list => list.id
	);
}

async function getFollowerUsernames(account: Account, listId: string) {
	const response = await getFollowers(listId, account.authorization);
	return usernames(response);
}

void describe("PATCH /lists/:listId/follow", () => {
	void it("hides a follow and reports it as not visible in the followed lists", async () => {
		const { follower, list } = await setupFollowedList();

		const response = await patchFollow(follower, list.id, {
			isVisible: false
		});

		assert.equal(response.status, 204);
		assert.deepEqual(response.body, {});
		const stored = await ListFollower.findOne({
			where: { listId: list.id, userId: follower.user.id }
		});
		assert.equal(stored?.isVisible, false);
		const followed = await getFollowedLists(follower);
		assert.deepEqual(
			followed.map(entry => [entry.id, entry.isVisible]),
			[[list.id, false]]
		);
	});

	void it("removes a hidden follow from the public profile listing and brings it back when shown again", async () => {
		const { follower, stranger, list } = await setupFollowedList();
		assert.deepEqual(
			await getPublicFollowingListIds(follower.user.username, stranger),
			[list.id]
		);

		await patchFollow(follower, list.id, { isVisible: false }).expect(204);

		assert.deepEqual(
			await getPublicFollowingListIds(follower.user.username, stranger),
			[]
		);

		await patchFollow(follower, list.id, { isVisible: true }).expect(204);

		assert.deepEqual(
			await getPublicFollowingListIds(follower.user.username, stranger),
			[list.id]
		);
		const followed = await getFollowedLists(follower);
		assert.equal(followed[0]?.isVisible, true);
	});

	void it("excludes a hidden follow from the total of the public profile listing", async () => {
		const { follower, stranger, list } = await setupFollowedList();
		await patchFollow(follower, list.id, { isVisible: false }).expect(204);

		const response = await api()
			.get(`/users/${follower.user.username}/following-lists`)
			.set("Authorization", stranger.authorization)
			.expect(200);

		assert.equal(response.body.data.followingLists.length, 0);
		assert.equal(response.body.data.total, 0);
	});

	void it("keeps the follow itself: follower count, isFollowing and follower list do not change", async () => {
		const { owner, follower, otherFollower, list } =
			await setupFollowedList();

		await patchFollow(follower, list.id, { isVisible: false }).expect(204);

		const detail = await getListDetail(follower, list.id);
		assert.equal(detail.followerCount, 2);
		assert.equal(detail.isFollowing, true);
		assert.deepEqual(
			new Set(await getFollowerUsernames(owner, list.id)),
			new Set([follower.user.username, otherFollower.user.username])
		);
	});

	void it("is idempotent when the visibility already has that value", async () => {
		const { follower, list } = await setupFollowedList();

		await patchFollow(follower, list.id, { isVisible: true }).expect(204);
		await patchFollow(follower, list.id, { isVisible: true }).expect(204);

		const followed = await getFollowedLists(follower);
		assert.equal(followed[0]?.isVisible, true);
	});

	void it("changes only the follow of the requesting user", async () => {
		const { follower, otherFollower, list } = await setupFollowedList();

		await patchFollow(follower, list.id, { isVisible: false }).expect(204);

		const untouched = await ListFollower.findOne({
			where: { listId: list.id, userId: otherFollower.user.id }
		});
		assert.equal(untouched?.isVisible, true);
	});

	void it("returns 404 when the user does not follow the list", async () => {
		const { stranger, list } = await setupFollowedList();

		const response = await patchFollow(stranger, list.id, {
			isVisible: false
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_NOT_FOLLOWING");
	});

	void it("returns 404 when the owner patches their own list without following it", async () => {
		const { owner, list } = await setupFollowedList();

		const response = await patchFollow(owner, list.id, {
			isVisible: false
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_NOT_FOLLOWING");
	});

	void it("returns 404 for a list that does not exist", async () => {
		const { follower } = await setupFollowedList();

		const response = await patchFollow(follower, NON_EXISTENT_LIST_ID, {
			isVisible: false
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_NOT_FOLLOWING");
	});

	void it("rejects a body without isVisible with 422", async () => {
		const { follower, list } = await setupFollowedList();

		const response = await patchFollow(follower, list.id, {});

		assert.equal(response.status, 422);
	});

	void it("rejects an isVisible that is not a boolean with 422", async () => {
		const { follower, list } = await setupFollowedList();

		const asString = await patchFollow(follower, list.id, {
			isVisible: "false"
		});
		const asNumber = await patchFollow(follower, list.id, {
			isVisible: 0
		});

		assert.equal(asString.status, 422);
		assert.equal(asNumber.status, 422);
		const stored = await ListFollower.findOne({
			where: { listId: list.id, userId: follower.user.id }
		});
		assert.equal(stored?.isVisible, true);
	});

	void it("rejects unknown fields in the body with 422", async () => {
		const { follower, list } = await setupFollowedList();

		const response = await patchFollow(follower, list.id, {
			isVisible: false,
			listId: NON_EXISTENT_LIST_ID
		});

		assert.equal(response.status, 422);
	});

	void it("rejects a listId that is not a UUID with 422", async () => {
		const { follower } = await setupFollowedList();

		const response = await patchFollow(follower, "not-a-uuid", {
			isVisible: false
		});

		assert.equal(response.status, 422);
	});

	void it("rejects a request without credentials", async () => {
		const { list } = await setupFollowedList();

		const response = await api()
			.patch(`/lists/${list.id}/follow`)
			.send({ isVisible: false });

		assert.equal(response.status, 422);
	});

	void it("rejects an invalid token with 401", async () => {
		const { list } = await setupFollowedList();

		const response = await api()
			.patch(`/lists/${list.id}/follow`)
			.set("Authorization", "Bearer invalid-token")
			.send({ isVisible: false });

		assert.equal(response.status, 401);
	});
});

void describe("DELETE /lists/:listId/follow", () => {
	void it("stops following the list with 204 and no body", async () => {
		const { follower, list } = await setupFollowedList();

		const response = await deleteFollow(follower, list.id);

		assert.equal(response.status, 204);
		assert.deepEqual(response.body, {});
		const stored = await ListFollower.findOne({
			where: { listId: list.id, userId: follower.user.id }
		});
		assert.equal(stored, null);
	});

	void it("decrements the follower count and clears isFollowing on the list", async () => {
		const { follower, list } = await setupFollowedList();
		const before = await getListDetail(follower, list.id);
		assert.equal(before.followerCount, 2);
		assert.equal(before.isFollowing, true);

		await deleteFollow(follower, list.id).expect(204);

		const after = await getListDetail(follower, list.id);
		assert.equal(after.followerCount, 1);
		assert.equal(after.isFollowing, false);
	});

	void it("removes the list from the followed lists of the user", async () => {
		const { follower, list } = await setupFollowedList();
		const otherList = await createList(follower.user.id, "metacritic", {
			isPublic: true
		});
		await ListFollower.create({
			listId: otherList.id,
			userId: follower.user.id
		});
		assert.equal((await getFollowedLists(follower)).length, 2);

		await deleteFollow(follower, list.id).expect(204);

		const followed = await getFollowedLists(follower);
		assert.deepEqual(
			followed.map(entry => entry.id),
			[otherList.id]
		);
	});

	void it("removes the user from the followers of the list and from their public profile listing", async () => {
		const { owner, follower, otherFollower, stranger, list } =
			await setupFollowedList();

		await deleteFollow(follower, list.id).expect(204);

		assert.deepEqual(await getFollowerUsernames(owner, list.id), [
			otherFollower.user.username
		]);
		assert.deepEqual(
			await getPublicFollowingListIds(follower.user.username, stranger),
			[]
		);
	});

	void it("keeps the follows of the other followers", async () => {
		const { follower, otherFollower, list } = await setupFollowedList();

		await deleteFollow(follower, list.id).expect(204);

		const detail = await getListDetail(otherFollower, list.id);
		assert.equal(detail.isFollowing, true);
		assert.equal(detail.followerCount, 1);
		assert.deepEqual(
			(await getFollowedLists(otherFollower)).map(entry => entry.id),
			[list.id]
		);
	});

	void it("allows following the list again after leaving it", async () => {
		const { follower, list } = await setupFollowedList();
		await deleteFollow(follower, list.id).expect(204);

		await api()
			.post(`/lists/${list.id}/follow`)
			.set("Authorization", follower.authorization)
			.expect(201);

		const detail = await getListDetail(follower, list.id);
		assert.equal(detail.isFollowing, true);
		assert.equal(detail.followerCount, 2);
	});

	void it("lets a follower leave a list that has since become private", async () => {
		const { follower, list } = await setupFollowedList();
		await List.update({ isPublic: false }, { where: { id: list.id } });

		const response = await deleteFollow(follower, list.id);

		assert.equal(response.status, 204);
		const stored = await ListFollower.findOne({
			where: { listId: list.id, userId: follower.user.id }
		});
		assert.equal(stored, null);
	});

	void it("returns 404 when the follow was already removed", async () => {
		const { follower, list } = await setupFollowedList();
		await deleteFollow(follower, list.id).expect(204);

		const response = await deleteFollow(follower, list.id);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_NOT_FOLLOWING");
	});

	void it("returns 404 when the user never followed the list and leaves other follows intact", async () => {
		const { stranger, list } = await setupFollowedList();

		const response = await deleteFollow(stranger, list.id);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_NOT_FOLLOWING");
		assert.equal(
			await ListFollower.count({ where: { listId: list.id } }),
			2
		);
	});

	void it("returns 404 for a list that does not exist", async () => {
		const { follower } = await setupFollowedList();

		const response = await deleteFollow(follower, NON_EXISTENT_LIST_ID);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_FOLLOWER_NOT_FOLLOWING");
	});

	void it("rejects a listId that is not a UUID with 422", async () => {
		const { follower } = await setupFollowedList();

		const response = await deleteFollow(follower, "not-a-uuid");

		assert.equal(response.status, 422);
	});

	void it("rejects a request without credentials", async () => {
		const { list } = await setupFollowedList();

		const response = await api().delete(`/lists/${list.id}/follow`);

		assert.equal(response.status, 422);
	});

	void it("rejects an invalid token with 401", async () => {
		const { list } = await setupFollowedList();

		const response = await api()
			.delete(`/lists/${list.id}/follow`)
			.set("Authorization", "Bearer invalid-token");

		assert.equal(response.status, 401);
	});
});
