/// <reference types="node" />

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import * as backlogService from "../../src/backlog/backlog.service";
import { sequelize } from "../../src/database/sequelize.database";
import { ListItem } from "../../src/list-items/list-item.model";
import { List } from "../../src/lists/list.model";
import * as listsService from "../../src/lists/lists.service";
import * as scoreSourcesService from "../../src/score-sources/score-sources.service";
import { asModel } from "../unit-helpers/as-model";
import {
	buildRequestUser,
	captureRejection,
	spy,
	stub
} from "../unit-helpers/mocks";

const FREE_LIST_LIMIT = 5;
const FREE_USER = buildRequestUser();

const registerDto = {
	name: "Best RPGs",
	isPublic: true,
	scoreSource: "completr",
	durationSource: "hltb"
};

function errorCode(error: unknown) {
	return (error as { code: string }).code;
}

function stubScoreSource(exists: boolean) {
	return stub(scoreSourcesService, "existsByCode", async () => exists);
}

describe("listsService.createList", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("creates the list for the requesting user", async () => {
		stub(List, "count", async () => 0);
		stubScoreSource(true);
		const create = stub(List, "create", async (values: object) => values);

		await listsService.createList(FREE_USER, registerDto as never);

		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			...registerDto,
			userId: "user-1"
		});
	});

	it("allows a free user one below the limit", async () => {
		stub(List, "count", async () => FREE_LIST_LIMIT - 1);
		stubScoreSource(true);
		const create = stub(List, "create", async () => ({}));

		await listsService.createList(FREE_USER, registerDto as never);

		assert.equal(create.mock.callCount(), 1);
	});

	it("rejects a free user at the limit with LIST_LIMIT_REACHED", async () => {
		stub(List, "count", async () => FREE_LIST_LIMIT);
		const create = stub(List, "create", async () => ({}));

		const error = await captureRejection(
			listsService.createList(FREE_USER, registerDto as never)
		);

		assert.equal(errorCode(error), "LIST_LIMIT_REACHED");
		assert.equal(create.mock.callCount(), 0);
	});

	it("does not limit premium, moderator and admin users", async () => {
		const count = stub(List, "count", async () => 1000);
		stubScoreSource(true);
		stub(List, "create", async () => ({}));

		for (const role of ["premium", "moderator", "admin"]) {
			await listsService.createList(
				buildRequestUser({ role }),
				registerDto as never
			);
		}

		assert.equal(count.mock.callCount(), 0);
	});

	it("rejects an unknown score source with LIST_SCORE_SOURCE_NOT_FOUND", async () => {
		stub(List, "count", async () => 0);
		stubScoreSource(false);
		const create = stub(List, "create", async () => ({}));

		const error = await captureRejection(
			listsService.createList(FREE_USER, registerDto as never)
		);

		assert.equal(errorCode(error), "LIST_SCORE_SOURCE_NOT_FOUND");
		assert.equal(create.mock.callCount(), 0);
	});
});

describe("listsService.duplicateList", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	function stubSource(overrides: Record<string, unknown> = {}) {
		const source = asModel({
			id: "src-1",
			userId: "owner",
			isPublic: true,
			description: "desc",
			scoreSource: "completr",
			durationSource: "hltb",
			ListItems: [
				{ gameId: "g-1", position: 1, score: 4, duration: 10 },
				{ gameId: "g-2", position: 2, score: 3, duration: null }
			],
			...overrides
		});
		stub(List, "findOne", async () => source);
	}

	it("fails with LIST_NOT_FOUND when the source does not exist", async () => {
		stub(List, "findOne", async () => null);

		const error = await captureRejection(
			listsService.duplicateList(FREE_USER, "src-1", { name: "Copy" })
		);

		assert.equal(errorCode(error), "LIST_NOT_FOUND");
	});

	it("fails with LIST_FORBIDDEN when copying someone else's private list", async () => {
		stubSource({ isPublic: false });

		const error = await captureRejection(
			listsService.duplicateList(FREE_USER, "src-1", { name: "Copy" })
		);

		assert.equal(errorCode(error), "LIST_FORBIDDEN");
	});

	it("lets the owner duplicate their own private list", async () => {
		stubSource({ isPublic: false, userId: "user-1" });
		stub(List, "count", async () => 0);
		const { transaction } = { transaction: { id: "tx" } };
		stub(
			sequelize,
			"transaction",
			async (callback: (t: object) => unknown) => callback(transaction)
		);
		stub(List, "create", async () => asModel({ id: "new-1" }));
		stub(ListItem, "bulkCreate", async () => []);

		const result = await listsService.duplicateList(FREE_USER, "src-1", {
			name: "Copy"
		});

		assert.equal(result.id, "new-1");
	});

	it("rejects a free user at the list limit", async () => {
		stubSource();
		stub(List, "count", async () => FREE_LIST_LIMIT);

		const error = await captureRejection(
			listsService.duplicateList(FREE_USER, "src-1", { name: "Copy" })
		);

		assert.equal(errorCode(error), "LIST_LIMIT_REACHED");
	});

	it("copies sources and items into a private list by default inside a transaction", async () => {
		stubSource();
		stub(List, "count", async () => 0);
		const transaction = { id: "tx" };
		stub(
			sequelize,
			"transaction",
			async (callback: (t: object) => unknown) => callback(transaction)
		);
		const create = stub(List, "create", async () =>
			asModel({ id: "new-1" })
		);
		const bulkCreate = stub(ListItem, "bulkCreate", async () => []);

		await listsService.duplicateList(FREE_USER, "src-1", { name: "Copy" });

		assert.deepEqual(create.mock.calls[0]?.arguments, [
			{
				userId: "user-1",
				name: "Copy",
				description: "desc",
				isPublic: false,
				scoreSource: "completr",
				durationSource: "hltb"
			},
			{ transaction }
		]);
		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments, [
			[
				{
					listId: "new-1",
					gameId: "g-1",
					position: 1,
					score: 4,
					duration: 10
				},
				{
					listId: "new-1",
					gameId: "g-2",
					position: 2,
					score: 3,
					duration: null
				}
			],
			{ transaction }
		]);
	});

	it("skips the item insert for an empty source list", async () => {
		stubSource({ ListItems: [] });
		stub(List, "count", async () => 0);
		stub(
			sequelize,
			"transaction",
			async (callback: (t: object) => unknown) => callback({})
		);
		stub(List, "create", async () => asModel({ id: "new-1" }));
		const bulkCreate = stub(ListItem, "bulkCreate", async () => []);

		await listsService.duplicateList(FREE_USER, "src-1", {
			name: "Copy",
			isPublic: true
		});

		assert.equal(bulkCreate.mock.callCount(), 0);
	});
});

describe("listsService.updateList", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	function stubOwnedList(ownerId = "user-1") {
		const update = spy();
		stub(List, "findOne", async () =>
			asModel({ id: "l-1", userId: ownerId, update })
		);
		return update;
	}

	it("fails with LIST_NOT_FOUND for a missing list", async () => {
		stub(List, "findOne", async () => null);

		const error = await captureRejection(
			listsService.updateList("l-1", FREE_USER, {})
		);

		assert.equal(errorCode(error), "LIST_NOT_FOUND");
	});

	it("fails with LIST_FORBIDDEN for someone else's list", async () => {
		const update = stubOwnedList("owner");

		const error = await captureRejection(
			listsService.updateList("l-1", FREE_USER, { name: "x" })
		);

		assert.equal(errorCode(error), "LIST_FORBIDDEN");
		assert.equal(update.mock.callCount(), 0);
	});

	it("fails with LIST_FROZEN when a free user owns more lists than the limit", async () => {
		const update = stubOwnedList();
		stub(List, "count", async () => FREE_LIST_LIMIT + 1);

		const error = await captureRejection(
			listsService.updateList("l-1", FREE_USER, { name: "x" })
		);

		assert.equal(errorCode(error), "LIST_FROZEN");
		assert.equal(update.mock.callCount(), 0);
	});

	it("does not freeze a free user who owns exactly the limit", async () => {
		const update = stubOwnedList();
		stub(List, "count", async () => FREE_LIST_LIMIT);

		await listsService.updateList("l-1", FREE_USER, { name: "x" });

		assert.equal(update.mock.callCount(), 1);
	});

	it("never freezes premium users", async () => {
		const update = stubOwnedList();
		const count = stub(List, "count", async () => 100);

		await listsService.updateList(
			"l-1",
			buildRequestUser({ role: "premium" }),
			{ name: "x" }
		);

		assert.equal(count.mock.callCount(), 0);
		assert.equal(update.mock.callCount(), 1);
	});

	it("validates the score source only when it changes", async () => {
		stubOwnedList();
		stub(List, "count", async () => 0);
		const exists = stubScoreSource(false);

		await listsService.updateList("l-1", FREE_USER, { name: "x" });
		const error = await captureRejection(
			listsService.updateList("l-1", FREE_USER, { scoreSource: "ghost" })
		);

		assert.equal(exists.mock.callCount(), 1);
		assert.equal(errorCode(error), "LIST_SCORE_SOURCE_NOT_FOUND");
	});
});

describe("listsService.removeList", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("fails with LIST_NOT_FOUND and LIST_FORBIDDEN", async () => {
		stub(List, "findOne", async () => null);
		const missing = await captureRejection(
			listsService.removeList("l-1", FREE_USER)
		);
		mock.restoreAll();

		stub(List, "findOne", async () => asModel({ userId: "owner" }));
		const forbidden = await captureRejection(
			listsService.removeList("l-1", FREE_USER)
		);

		assert.equal(errorCode(missing), "LIST_NOT_FOUND");
		assert.equal(errorCode(forbidden), "LIST_FORBIDDEN");
	});

	it("deletes the list of its owner even when the account is frozen", async () => {
		stub(List, "findOne", async () => asModel({ userId: "user-1" }));
		const destroy = stub(List, "destroy", async () => 1);
		const count = stub(List, "count", async () => 100);

		assert.equal(await listsService.removeList("l-1", FREE_USER), true);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "l-1" } }
		]);
		assert.equal(count.mock.callCount(), 0);
	});
});

describe("listsService.findListsByUserId", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("flags a free user above the limit as frozen", async () => {
		stub(List, "findAndCountAll", async () => ({
			rows: [],
			count: FREE_LIST_LIMIT + 1
		}));
		stub(List, "count", async () => FREE_LIST_LIMIT + 1);

		const result = await listsService.findListsByUserId(FREE_USER);

		assert.equal(result.frozen, true);
		assert.equal(result.total, FREE_LIST_LIMIT + 1);
	});

	it("does not flag as frozen at the limit nor for premium users", async () => {
		stub(List, "findAndCountAll", async () => ({ rows: [], count: 0 }));
		stub(List, "count", async () => FREE_LIST_LIMIT);

		assert.equal(
			(await listsService.findListsByUserId(FREE_USER)).frozen,
			false
		);
		assert.equal(
			(
				await listsService.findListsByUserId(
					buildRequestUser({ role: "admin" })
				)
			).frozen,
			false
		);
	});
});

describe("listsService.getBacklogSummaryMap", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("returns an empty map without querying when there are no games", async () => {
		const find = stub(
			backlogService,
			"findBacklogSummariesByUserAndGameIds",
			async () => []
		);

		assert.equal(
			(await listsService.getBacklogSummaryMap([], "u-1")).size,
			0
		);
		assert.equal(find.mock.callCount(), 0);
	});

	it("derives the personal ratio from score and real duration, null when missing", async () => {
		stub(
			backlogService,
			"findBacklogSummariesByUserAndGameIds",
			async () => [
				{
					gameId: "g-1",
					status: "completed",
					score: 4,
					realDuration: 10
				},
				{
					gameId: "g-2",
					status: "playing",
					score: 4,
					realDuration: null
				}
			]
		);

		const map = await listsService.getBacklogSummaryMap(
			["g-1", "g-2"],
			"u-1"
		);

		assert.deepEqual(map.get("g-1"), {
			status: "completed",
			realDuration: 10,
			personalRatio: 8
		});
		assert.deepEqual(map.get("g-2"), {
			status: "playing",
			realDuration: null,
			personalRatio: null
		});
	});

	it("forwards the publicOnly flag", async () => {
		const find = stub(
			backlogService,
			"findBacklogSummariesByUserAndGameIds",
			async () => []
		);

		await listsService.getBacklogSummaryMap(["g-1"], "u-1", true);

		assert.deepEqual(find.mock.calls[0]?.arguments, ["u-1", ["g-1"], true]);
	});
});

describe("listsService.getListProgress", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("returns zero progress for an empty list without counting backlogs", async () => {
		stub(ListItem, "findAll", async () => []);
		const count = stub(
			backlogService,
			"countDistinctGamesByUserStatusAndGameIds",
			async () => 9
		);

		assert.deepEqual(await listsService.getListProgress("l-1", "u-1"), {
			completed: 0,
			total: 0
		});
		assert.equal(count.mock.callCount(), 0);
	});

	it("counts completed, abandoned and endless games as finished", async () => {
		stub(ListItem, "findAll", async () => [
			{ gameId: "g-1" },
			{ gameId: "g-2" },
			{ gameId: "g-3" }
		]);
		const count = stub(
			backlogService,
			"countDistinctGamesByUserStatusAndGameIds",
			async () => 2
		);

		const progress = await listsService.getListProgress("l-1", "u-1", true);

		assert.deepEqual(progress, { completed: 2, total: 3 });
		assert.deepEqual(count.mock.calls[0]?.arguments, [
			"u-1",
			["g-1", "g-2", "g-3"],
			["completed", "abandoned", "endless"],
			true
		]);
	});
});

describe("listsService.findUserListsWithGameFlag", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("marks which of the user's lists already contain the game", async () => {
		stub(List, "findAll", async () => [
			{ id: "l-1", name: "A", isPublic: true },
			{ id: "l-2", name: "B", isPublic: false }
		]);
		stub(ListItem, "findAll", async () => [{ listId: "l-2" }]);

		const result = await listsService.findUserListsWithGameFlag(
			"u-1",
			"g-1"
		);

		assert.deepEqual(result, [
			{ id: "l-1", name: "A", isPublic: true, contains: false },
			{ id: "l-2", name: "B", isPublic: false, contains: true }
		]);
	});
});
