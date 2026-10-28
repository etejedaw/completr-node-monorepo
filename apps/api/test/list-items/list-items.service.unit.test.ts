import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { sequelize } from "../../src/database/sequelize.database";
import * as gameScoresService from "../../src/game-scores/game-scores.service";
import * as gameTimesService from "../../src/game-times/game-times.service";
import * as gamesSearchService from "../../src/games/services/games-search.service";
import { ListItem } from "../../src/list-items/list-item.model";
import * as listItemsService from "../../src/list-items/list-items.service";
import { List } from "../../src/lists/list.model";
import * as scoreSourcesService from "../../src/score-sources/score-sources.service";
import { asModel } from "../unit-helpers/as-model";
import {
	buildRequestUser,
	captureRejection,
	stub,
	stubTransaction
} from "../unit-helpers/mocks";

const FREE_OWNED_LISTS_LIMIT = 5;
const FREE_USER = buildRequestUser();

function errorCode(error: unknown) {
	return (error as { code: string }).code;
}

function stubList(overrides: Record<string, unknown> = {}) {
	stub(List, "findOne", async () =>
		asModel({
			id: "l-1",
			userId: "user-1",
			scoreSource: "completr",
			durationSource: "hltb",
			...overrides
		})
	);
}

function stubOwnedListCount(count: number) {
	return stub(List, "count", async () => count);
}

function stubSources(
	options: {
		scores?: { gameId: string; score: number }[];
		times?: { gameId: string; duration: number }[];
		scale?: number;
	} = {}
) {
	stub(
		gameScoresService,
		"findScoresByGameIdsAndSource",
		async () => options.scores ?? []
	);
	stub(
		gameTimesService,
		"findTimesByGameIdsAndSource",
		async () => options.times ?? []
	);
	stub(scoreSourcesService, "findByCode", async () =>
		asModel({ scale: options.scale ?? 5 })
	);
}

function stubGamesExist(ids: string[]) {
	stub(gamesSearchService, "findGamesByIds", async () =>
		ids.map(id => ({ id }))
	);
}

void describe("listItemsService access rules", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("fails with LIST_ITEM_LIST_NOT_FOUND when the list does not exist", async () => {
		stub(List, "findOne", async () => null);

		for (const action of [
			() => listItemsService.addItem("l-1", FREE_USER, "g-1"),
			() => listItemsService.replaceItems("l-1", FREE_USER, ["g-1"]),
			() => listItemsService.removeItem("l-1", FREE_USER, "g-1"),
			() => listItemsService.refreshScores("l-1", FREE_USER)
		]) {
			assert.equal(
				errorCode(await captureRejection(action())),
				"LIST_ITEM_LIST_NOT_FOUND"
			);
		}
	});

	void it("fails with LIST_ITEM_FORBIDDEN when the list belongs to someone else", async () => {
		stubList({ userId: "owner" });

		for (const action of [
			() => listItemsService.addItem("l-1", FREE_USER, "g-1"),
			() => listItemsService.replaceItems("l-1", FREE_USER, ["g-1"]),
			() => listItemsService.removeItem("l-1", FREE_USER, "g-1"),
			() => listItemsService.refreshScores("l-1", FREE_USER)
		]) {
			assert.equal(
				errorCode(await captureRejection(action())),
				"LIST_ITEM_FORBIDDEN"
			);
		}
	});

	void it("freezes add, replace and refresh for a free user above the list limit", async () => {
		stubList();
		stubOwnedListCount(FREE_OWNED_LISTS_LIMIT + 1);

		for (const action of [
			() => listItemsService.addItem("l-1", FREE_USER, "g-1"),
			() => listItemsService.replaceItems("l-1", FREE_USER, ["g-1"]),
			() => listItemsService.refreshScores("l-1", FREE_USER)
		]) {
			assert.equal(
				errorCode(await captureRejection(action())),
				"LIST_ITEM_FROZEN"
			);
		}
	});

	void it("still allows removing an item while frozen", async () => {
		stubList();
		const count = stubOwnedListCount(FREE_OWNED_LISTS_LIMIT + 1);
		const { transaction } = stubTransaction();
		stub(sequelize, "query", async () => []);
		const destroy = stub(ListItem, "destroy", async () => 1);

		await listItemsService.removeItem("l-1", FREE_USER, "g-1");

		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { listId: "l-1", gameId: "g-1" }, transaction }
		]);
		assert.equal(count.mock.callCount(), 0);
	});

	void it("renumbers the remaining items in the same transaction", async () => {
		stubList();
		const { transaction } = stubTransaction();
		const query = stub(sequelize, "query", async () => []);
		stub(ListItem, "destroy", async () => 1);

		await listItemsService.removeItem("l-1", FREE_USER, "g-1");

		const [sql, options] = query.mock.calls[0]!.arguments;
		assert.match(
			String(sql),
			/ROW_NUMBER\(\) OVER \(ORDER BY "position", "createdAt", "id"\)/
		);
		assert.deepEqual(options, {
			replacements: { listId: "l-1" },
			transaction
		});
	});

	void it("skips the renumbering when the game was not in the list", async () => {
		stubList();
		stubTransaction();
		const query = stub(sequelize, "query", async () => []);
		stub(ListItem, "destroy", async () => 0);

		await listItemsService.removeItem("l-1", FREE_USER, "g-1");

		assert.equal(query.mock.callCount(), 0);
	});

	void it("never freezes premium users", async () => {
		stubList();
		const count = stubOwnedListCount(100);
		stub(ListItem, "findAll", async () => []);

		assert.equal(
			await listItemsService.refreshScores(
				"l-1",
				buildRequestUser({ role: "premium" })
			),
			0
		);
		assert.equal(count.mock.callCount(), 0);
	});
});

void describe("listItemsService.addItem", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns the existing item without creating a duplicate", async () => {
		stubList();
		stubOwnedListCount(1);
		const existing = asModel({ id: "li-1" });
		stub(ListItem, "findOne", async () => existing);
		const create = stub(ListItem, "create", async () => ({}));

		assert.equal(
			await listItemsService.addItem("l-1", FREE_USER, "g-1"),
			existing
		);
		assert.equal(create.mock.callCount(), 0);
	});

	void it("fails when the game does not exist", async () => {
		stubList();
		stubOwnedListCount(1);
		stub(ListItem, "findOne", async () => null);
		stubGamesExist([]);

		const error = await captureRejection(
			listItemsService.addItem("l-1", FREE_USER, "g-1")
		);

		assert.equal(errorCode(error), "LIST_ITEM_GAMES_NOT_FOUND");
	});

	void it("appends after the highest position and copies score and duration from the list sources", async () => {
		stubList();
		stubOwnedListCount(1);
		stub(ListItem, "findOne", async () => null);
		stubGamesExist(["g-1"]);
		stub(ListItem, "max", async () => 7);
		stubSources({
			scores: [{ gameId: "g-1", score: 4.2 }],
			times: [{ gameId: "g-1", duration: 12 }]
		});
		const create = stub(ListItem, "create", async () => ({}));

		await listItemsService.addItem("l-1", FREE_USER, "g-1");

		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			listId: "l-1",
			gameId: "g-1",
			position: 8,
			score: 4.2,
			duration: 12
		});
	});

	void it("starts at position 1 in an empty list and leaves missing data as null", async () => {
		stubList();
		stubOwnedListCount(1);
		stub(ListItem, "findOne", async () => null);
		stubGamesExist(["g-1"]);
		stub(ListItem, "max", async () => null);
		stubSources();
		const create = stub(ListItem, "create", async () => ({}));

		await listItemsService.addItem("l-1", FREE_USER, "g-1");

		const values = create.mock.calls[0]?.arguments[0] as Record<
			string,
			unknown
		>;
		assert.equal(values.position, 1);
		assert.equal(values.score, null);
		assert.equal(values.duration, null);
	});

	void it("normalizes scores from non 0-5 sources to the 0-5 scale rounded to two decimals", async () => {
		stubList({ scoreSource: "metacritic" });
		stubOwnedListCount(1);
		stub(ListItem, "findOne", async () => null);
		stubGamesExist(["g-1"]);
		stub(ListItem, "max", async () => 0);
		stubSources({ scores: [{ gameId: "g-1", score: 87 }], scale: 100 });
		const create = stub(ListItem, "create", async () => ({}));

		await listItemsService.addItem("l-1", FREE_USER, "g-1");

		assert.equal(
			(create.mock.calls[0]?.arguments[0] as { score: number }).score,
			4.35
		);
	});
});

void describe("listItemsService.replaceItems", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("clears the list when no games are given", async () => {
		stubList();
		stubOwnedListCount(1);
		const destroy = stub(ListItem, "destroy", async () => 3);

		assert.deepEqual(
			await listItemsService.replaceItems("l-1", FREE_USER, []),
			[]
		);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { listId: "l-1" } }
		]);
	});

	void it("fails and reports the games that do not exist", async () => {
		stubList();
		stubOwnedListCount(1);
		stubGamesExist(["g-1"]);

		const error = await captureRejection(
			listItemsService.replaceItems("l-1", FREE_USER, ["g-1", "g-2"])
		);

		assert.equal(errorCode(error), "LIST_ITEM_GAMES_NOT_FOUND");
	});

	void it("deletes removed items, creates new ones and only moves items whose position changed", async () => {
		stubList();
		stubOwnedListCount(1);
		stubGamesExist(["g-3", "g-1", "g-2"]);
		const query = stub(sequelize, "query", async () => []);
		stub(ListItem, "findAll", async () => [
			{ id: "li-a", gameId: "g-1", position: 1 },
			{ id: "li-b", gameId: "g-9", position: 2 },
			{ id: "li-c", gameId: "g-2", position: 3 }
		]);
		stubSources({
			scores: [{ gameId: "g-3", score: 3 }],
			times: [{ gameId: "g-3", duration: 5 }]
		});
		const { transaction } = stubTransaction();
		const destroy = stub(ListItem, "destroy", async () => 1);
		const bulkCreate = stub(ListItem, "bulkCreate", async () => []);

		await listItemsService.replaceItems("l-1", FREE_USER, [
			"g-3",
			"g-1",
			"g-2"
		]);

		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: ["li-b"] }, transaction }
		]);
		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments, [
			[
				{
					listId: "l-1",
					gameId: "g-3",
					position: 1,
					score: 3,
					duration: 5
				}
			],
			{ transaction }
		]);
		assert.equal(query.mock.callCount(), 1);
		assert.deepEqual(query.mock.calls[0]?.arguments[1], {
			replacements: ["li-a", 2],
			transaction
		});
	});
});

void describe("listItemsService.refreshScores", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("reapplies the declared sources to every item and returns the count", async () => {
		stubList();
		stubOwnedListCount(1);
		const query = stub(sequelize, "query", async () => []);
		stub(ListItem, "findAll", async () => [
			{ id: "li-1", gameId: "g-1" },
			{ id: "li-2", gameId: "g-2" }
		]);
		stubSources({
			scores: [{ gameId: "g-1", score: 4 }],
			times: [{ gameId: "g-1", duration: 10 }]
		});
		const { transaction } = stubTransaction();

		const refreshed = await listItemsService.refreshScores(
			"l-1",
			FREE_USER
		);

		assert.equal(refreshed, 2);
		assert.equal(query.mock.callCount(), 1);
		assert.deepEqual(query.mock.calls[0]?.arguments[1], {
			replacements: ["li-1", 4, 10, "li-2", null, null],
			transaction
		});
	});
});

void describe("listItemsService.copyItemsToList", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("does not touch the database when there are no items to copy", async () => {
		const bulkCreate = stub(ListItem, "bulkCreate", async () => []);

		await listItemsService.copyItemsToList("l-1", [], {
			id: "tx"
		} as never);

		assert.equal(bulkCreate.mock.callCount(), 0);
	});

	void it("copies position, score and duration into the target list inside the transaction", async () => {
		const bulkCreate = stub(ListItem, "bulkCreate", async () => []);
		const transaction = { id: "tx" } as never;

		await listItemsService.copyItemsToList(
			"l-2",
			[
				{ gameId: "g-1", position: 1, score: 4, duration: 10 },
				{ gameId: "g-2", position: 2, score: null, duration: null }
			],
			transaction
		);

		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments, [
			[
				{
					listId: "l-2",
					gameId: "g-1",
					position: 1,
					score: 4,
					duration: 10
				},
				{
					listId: "l-2",
					gameId: "g-2",
					position: 2,
					score: null,
					duration: null
				}
			],
			{ transaction }
		]);
	});
});

void describe("listItemsService.findGameIdsByListId", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns only the game ids and an empty array for an empty list", async () => {
		stub(ListItem, "findAll", async () => [
			{ gameId: "g-1" },
			{ gameId: "g-2" }
		]);
		assert.deepEqual(await listItemsService.findGameIdsByListId("l-1"), [
			"g-1",
			"g-2"
		]);

		mock.restoreAll();
		stub(ListItem, "findAll", async () => []);
		assert.deepEqual(await listItemsService.findGameIdsByListId("l-1"), []);
	});
});
