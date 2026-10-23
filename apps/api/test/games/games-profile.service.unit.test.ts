import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import * as backlogService from "../../src/backlog/backlog.service";
import * as gamesProfileService from "../../src/games/services/games-profile.service";
import * as listsService from "../../src/lists/lists.service";
import * as userFollowersService from "../../src/user-followers/user-followers.service";
import { asModel } from "../unit-helpers/as-model";
import { captureRejection, stub } from "../unit-helpers/mocks";

type PublicList = Awaited<
	ReturnType<typeof listsService.findPublicListsByGameId>
>[number];

function buildPublicList(
	overrides: {
		id?: string;
		name?: string;
		description?: string | null;
		User?: { role: string; username: string } | null;
	} = {}
) {
	return asModel<PublicList>({
		id: "list-1",
		name: "List",
		description: null,
		User: { role: "user", username: "owner" },
		...overrides
	});
}

function stubProgress(progressByListId: Record<string, [number, number]>) {
	return stub(listsService, "getListsProgress", async (listIds: string[]) => {
		return new Map(
			listIds.map(listId => {
				const [completed, total] = progressByListId[listId] ?? [0, 0];
				return [listId, { completed, total }];
			})
		);
	});
}

void describe("gamesProfileService.getListsForGame", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns the enriched public lists together with the viewer lists", async () => {
		const myLists = [
			{ id: "mine", name: "Mine", isPublic: false, contains: true }
		];
		const findPublic = stub(
			listsService,
			"findPublicListsByGameId",
			async () => [
				buildPublicList({ id: "a", name: "A", description: "desc" })
			]
		);
		const findMine = stub(
			listsService,
			"findUserListsWithGameFlag",
			async () => myLists
		);
		stubProgress({ a: [1, 2] });

		const bundle = await gamesProfileService.getListsForGame(
			"viewer",
			"game"
		);

		assert.deepEqual(bundle, {
			lists: [
				{
					id: "a",
					name: "A",
					description: "desc",
					isOfficial: false,
					ownerUsername: "owner",
					completed: false
				}
			],
			myLists
		});
		assert.deepEqual(findPublic.mock.calls[0]?.arguments, [
			"game",
			"viewer"
		]);
		assert.deepEqual(findMine.mock.calls[0]?.arguments, ["viewer", "game"]);
	});

	void it("marks a list as completed only when it has items and all of them are completed", async () => {
		stub(listsService, "findPublicListsByGameId", async () => [
			buildPublicList({ id: "full" }),
			buildPublicList({ id: "partial" }),
			buildPublicList({ id: "empty" })
		]);
		stub(listsService, "findUserListsWithGameFlag", async () => []);
		stubProgress({ full: [3, 3], partial: [2, 3], empty: [0, 0] });

		const { lists } = await gamesProfileService.getListsForGame("v", "g");

		assert.deepEqual(
			lists.map(list => [list.id, list.completed]),
			[
				["full", true],
				["partial", false],
				["empty", false]
			]
		);
	});

	void it("flags lists owned by an admin as official and puts them first", async () => {
		stub(listsService, "findPublicListsByGameId", async () => [
			buildPublicList({ id: "user-1" }),
			buildPublicList({
				id: "admin-1",
				User: { role: "admin", username: "root" }
			}),
			buildPublicList({ id: "user-2" }),
			buildPublicList({
				id: "admin-2",
				User: { role: "admin", username: "root" }
			})
		]);
		stub(listsService, "findUserListsWithGameFlag", async () => []);
		stubProgress({});

		const { lists } = await gamesProfileService.getListsForGame("v", "g");

		assert.deepEqual(
			lists.map(list => [list.id, list.isOfficial]),
			[
				["admin-1", true],
				["admin-2", true],
				["user-1", false],
				["user-2", false]
			]
		);
	});

	void it("returns a null owner username and a non-official list when the owner is missing", async () => {
		stub(listsService, "findPublicListsByGameId", async () => [
			buildPublicList({ User: null })
		]);
		stub(listsService, "findUserListsWithGameFlag", async () => []);
		stubProgress({});

		const { lists } = await gamesProfileService.getListsForGame("v", "g");

		assert.equal(lists[0]?.ownerUsername, null);
		assert.equal(lists[0]?.isOfficial, false);
	});

	void it("requests the progress of every list for the viewer in one call", async () => {
		stub(listsService, "findPublicListsByGameId", async () => [
			buildPublicList({ id: "a" }),
			buildPublicList({ id: "b" })
		]);
		stub(listsService, "findUserListsWithGameFlag", async () => []);
		const progress = stubProgress({});

		await gamesProfileService.getListsForGame("viewer", "g");

		assert.deepEqual(
			progress.mock.calls.map(call => call.arguments),
			[[["a", "b"], "viewer"]]
		);
	});

	void it("returns empty collections when there are no lists", async () => {
		stub(listsService, "findPublicListsByGameId", async () => []);
		stub(listsService, "findUserListsWithGameFlag", async () => []);
		const progress = stubProgress({});

		const bundle = await gamesProfileService.getListsForGame("v", "g");

		assert.deepEqual(bundle, { lists: [], myLists: [] });
		assert.deepEqual(
			progress.mock.calls.map(call => call.arguments),
			[[[], "v"]]
		);
	});

	void it("propagates the error when a list query fails", async () => {
		stub(listsService, "findPublicListsByGameId", async () => {
			throw new Error("db down");
		});
		stub(listsService, "findUserListsWithGameFlag", async () => []);

		const error = await captureRejection(
			gamesProfileService.getListsForGame("v", "g")
		);

		assert.equal((error as Error).message, "db down");
	});
});

void describe("gamesProfileService.getFriendsActivityForGame", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("resolves following and mutual ids before querying the friends activity", async () => {
		const activity = [{ userId: "f1" }];
		const following = stub(
			userFollowersService,
			"getFollowingIds",
			async () => ["f1", "f2"]
		);
		const mutual = stub(
			userFollowersService,
			"getMutualFollowerIds",
			async () => ["f1"]
		);
		const find = stub(
			backlogService,
			"findFriendsActivityForGame",
			async () => activity
		);

		const result = await gamesProfileService.getFriendsActivityForGame(
			"viewer",
			"game"
		);

		assert.equal(result, activity);
		assert.deepEqual(following.mock.calls[0]?.arguments, ["viewer"]);
		assert.deepEqual(mutual.mock.calls[0]?.arguments, [
			"viewer",
			["f1", "f2"]
		]);
		assert.deepEqual(find.mock.calls[0]?.arguments, [
			["f1", "f2"],
			["f1"],
			"game"
		]);
	});

	void it("propagates the error when the followers lookup fails", async () => {
		stub(userFollowersService, "getFollowingIds", async () => {
			throw new Error("followers down");
		});
		const find = stub(
			backlogService,
			"findFriendsActivityForGame",
			async () => []
		);

		const error = await captureRejection(
			gamesProfileService.getFriendsActivityForGame("v", "g")
		);

		assert.equal((error as Error).message, "followers down");
		assert.equal(find.mock.callCount(), 0);
	});
});

void describe("gamesProfileService.getPlayersForGame", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("looks up random players excluding the viewer and prioritising friends", async () => {
		const players = [{ userId: "p1" }];
		stub(userFollowersService, "getFollowingIds", async () => ["f1"]);
		const find = stub(
			backlogService,
			"findRandomPlayersForGame",
			async () => players
		);

		const result = await gamesProfileService.getPlayersForGame(
			"viewer",
			"game"
		);

		assert.equal(result, players);
		assert.deepEqual(find.mock.calls[0]?.arguments, [
			"game",
			"viewer",
			["f1"]
		]);
	});
});
