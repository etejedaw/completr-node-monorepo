/// <reference types="node" />

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { UniqueConstraintError, ValidationError } from "sequelize";

import { Backlog } from "../../src/backlog/backlog.model";
import * as backlogService from "../../src/backlog/backlog.service";
import { sequelize } from "../../src/database/sequelize.database";
import * as gamesCompilationService from "../../src/games/services/games-compilation.service";
import { Queue } from "../../src/queue/queue.model";
import { asModel } from "../unit-helpers/as-model";
import { captureRejection, spy, stub } from "../unit-helpers/mocks";

const registerDto = {
	gameId: "game-1",
	platformId: "platform-1",
	score: 4,
	duration: 10
};

function stubCompilation(options: { exists: boolean; belongs: boolean }) {
	stub(
		gamesCompilationService,
		"existsActiveCompilation",
		async () => options.exists
	);
	stub(
		gamesCompilationService,
		"gameBelongsToCompilation",
		async () => options.belongs
	);
}

function errorCode(error: unknown) {
	return (error as { code: string }).code;
}

describe("backlogService.createBacklog", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("creates the entry for the user and reloads it with its relations", async () => {
		const reload = spy();
		const entry = asModel({ reload });
		const create = stub(Backlog, "create", async () => entry);

		const result = await backlogService.createBacklog(
			"u-1",
			registerDto as never
		);

		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			...registerDto,
			userId: "u-1"
		});
		assert.equal(reload.mock.callCount(), 1);
		assert.equal(result, entry);
	});

	it("rejects a compilation that is not an active compilation", async () => {
		stubCompilation({ exists: false, belongs: true });
		const create = stub(Backlog, "create", async () => ({}));

		const error = await captureRejection(
			backlogService.createBacklog("u-1", {
				...registerDto,
				compilationGameId: "comp-1"
			} as never)
		);

		assert.equal(errorCode(error), "BACKLOG_COMPILATION_CONTEXT_INVALID");
		assert.equal(create.mock.callCount(), 0);
	});

	it("rejects a game that is not part of the given compilation", async () => {
		stubCompilation({ exists: true, belongs: false });

		const error = await captureRejection(
			backlogService.createBacklog("u-1", {
				...registerDto,
				compilationGameId: "comp-1"
			} as never)
		);

		assert.equal(errorCode(error), "BACKLOG_COMPILATION_CONTEXT_INVALID");
	});

	it("accepts a game that belongs to an active compilation", async () => {
		stubCompilation({ exists: true, belongs: true });
		stub(Backlog, "create", async () => asModel({ reload: spy() }));

		await backlogService.createBacklog("u-1", {
			...registerDto,
			compilationGameId: "comp-1"
		} as never);
	});

	it("does not check compilations when no compilation game is given", async () => {
		const exists = stub(
			gamesCompilationService,
			"existsActiveCompilation",
			async () => false
		);
		stub(Backlog, "create", async () => asModel({ reload: spy() }));

		await backlogService.createBacklog("u-1", registerDto as never);

		assert.equal(exists.mock.callCount(), 0);
	});

	it("maps unique and validation errors to service errors", async () => {
		stub(Backlog, "create", async () => {
			throw new UniqueConstraintError({});
		});
		const unique = await captureRejection(
			backlogService.createBacklog("u-1", registerDto as never)
		);
		mock.restoreAll();

		stub(Backlog, "create", async () => {
			throw new ValidationError("bad", []);
		});
		const validation = await captureRejection(
			backlogService.createBacklog("u-1", registerDto as never)
		);

		assert.equal(errorCode(unique), "BACKLOG_UNIQUE_CONSTRAINT");
		assert.equal(errorCode(validation), "BACKLOG_VALIDATION_ERROR");
	});
});

describe("backlogService.updateBacklog", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	function stubOwnedEntry(ownerId = "owner") {
		const update = spy();
		const entry = asModel<Backlog>({
			id: "b-1",
			userId: ownerId,
			gameId: "game-1",
			update
		});
		stub(Backlog, "findOne", async () => entry);
		return { entry, update };
	}

	it("fails with BACKLOG_NOT_FOUND when the entry does not exist", async () => {
		stub(Backlog, "findOne", async () => null);

		const error = await captureRejection(
			backlogService.updateBacklog("b-1", "owner", {})
		);

		assert.equal(errorCode(error), "BACKLOG_NOT_FOUND");
	});

	it("fails with BACKLOG_FORBIDDEN when the entry belongs to someone else", async () => {
		const { update } = stubOwnedEntry("owner");

		const error = await captureRejection(
			backlogService.updateBacklog("b-1", "intruder", {
				status: "playing"
			})
		);

		assert.equal(errorCode(error), "BACKLOG_FORBIDDEN");
		assert.equal(update.mock.callCount(), 0);
	});

	for (const status of [
		"playing",
		"completed",
		"abandoned",
		"endless"
	] as const) {
		it(`removes the queue entry and reports queueRemoved when moving to ${status}`, async () => {
			stubOwnedEntry();
			const destroy = stub(Queue, "destroy", async () => 1);

			const result = await backlogService.updateBacklog("b-1", "owner", {
				status
			});

			assert.deepEqual(destroy.mock.calls[0]?.arguments, [
				{ where: { backlogId: "b-1" } }
			]);
			assert.equal(result.queueRemoved, true);
		});
	}

	it("reports queueRemoved false when the entry was not queued", async () => {
		stubOwnedEntry();
		stub(Queue, "destroy", async () => 0);

		const result = await backlogService.updateBacklog("b-1", "owner", {
			status: "playing"
		});

		assert.equal(result.queueRemoved, false);
	});

	it("keeps the queue entry when the status is not_started or not changed", async () => {
		stubOwnedEntry();
		const destroy = stub(Queue, "destroy", async () => 1);

		const toNotStarted = await backlogService.updateBacklog(
			"b-1",
			"owner",
			{ status: "not_started" }
		);
		const noStatus = await backlogService.updateBacklog("b-1", "owner", {
			notes: "x"
		});

		assert.equal(destroy.mock.callCount(), 0);
		assert.equal(toNotStarted.queueRemoved, false);
		assert.equal(noStatus.queueRemoved, false);
	});

	it("validates the compilation context against the stored game", async () => {
		stubOwnedEntry();
		const belongs = stub(
			gamesCompilationService,
			"gameBelongsToCompilation",
			async () => false
		);
		stub(
			gamesCompilationService,
			"existsActiveCompilation",
			async () => true
		);

		const error = await captureRejection(
			backlogService.updateBacklog("b-1", "owner", {
				compilationGameId: "comp-1"
			})
		);

		assert.equal(errorCode(error), "BACKLOG_COMPILATION_CONTEXT_INVALID");
		assert.deepEqual(belongs.mock.calls[0]?.arguments, [
			"game-1",
			"comp-1"
		]);
	});

	it("allows clearing the compilation game without validating it", async () => {
		const { update } = stubOwnedEntry();
		const exists = stub(
			gamesCompilationService,
			"existsActiveCompilation",
			async () => false
		);

		await backlogService.updateBacklog("b-1", "owner", {
			compilationGameId: null
		});

		assert.equal(exists.mock.callCount(), 0);
		assert.equal(update.mock.callCount(), 1);
	});
});

describe("backlogService.removeBacklog", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("fails with BACKLOG_NOT_FOUND for a missing entry", async () => {
		stub(Backlog, "findOne", async () => null);

		const error = await captureRejection(
			backlogService.removeBacklog("b-1", "u-1")
		);

		assert.equal(errorCode(error), "BACKLOG_NOT_FOUND");
	});

	it("fails with BACKLOG_FORBIDDEN and keeps the entry of another user", async () => {
		stub(Backlog, "findOne", async () =>
			asModel({ id: "b-1", userId: "owner" })
		);
		const destroy = stub(Backlog, "destroy", async () => 0);

		const error = await captureRejection(
			backlogService.removeBacklog("b-1", "intruder")
		);

		assert.equal(errorCode(error), "BACKLOG_FORBIDDEN");
		assert.equal(destroy.mock.callCount(), 0);
	});

	it("deletes the entry of its owner", async () => {
		stub(Backlog, "findOne", async () =>
			asModel({ id: "b-1", userId: "owner" })
		);
		const destroy = stub(Backlog, "destroy", async () => 1);

		assert.equal(await backlogService.removeBacklog("b-1", "owner"), true);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "b-1" } }
		]);
	});
});

describe("backlogService empty input shortcuts", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("skip the database when there are no ids, games or statuses", async () => {
		const findAll = stub(Backlog, "findAll", async () => []);
		const count = stub(Backlog, "count", async () => 5);
		const query = stub(sequelize, "query", async () => []);

		assert.deepEqual(
			await backlogService.findBacklogsByUserAndIds("u", []),
			[]
		);
		assert.deepEqual(
			await backlogService.findGameIdsInBacklogByUser("u", []),
			[]
		);
		assert.deepEqual(
			await backlogService.findBacklogSummariesByUserAndGameIds("u", []),
			[]
		);
		assert.deepEqual(
			await backlogService.findDistinctGameIdsByUserAndStatuses("u", []),
			[]
		);
		assert.equal(
			await backlogService.countDistinctGamesByUserStatusAndGameIds(
				"u",
				[],
				["completed"]
			),
			0
		);
		assert.equal(
			await backlogService.countDistinctGamesByUserStatusAndGameIds(
				"u",
				["g"],
				[]
			),
			0
		);
		assert.equal(
			(await backlogService.findLatestCompletedDurations([])).size,
			0
		);

		assert.equal(findAll.mock.callCount(), 0);
		assert.equal(count.mock.callCount(), 0);
		assert.equal(query.mock.callCount(), 0);
	});

	it("restrict the distinct game count to public entries when asked", async () => {
		const count = stub(Backlog, "count", async () => 2);

		await backlogService.countDistinctGamesByUserStatusAndGameIds(
			"u",
			["g"],
			["completed"],
			true
		);
		await backlogService.countDistinctGamesByUserStatusAndGameIds(
			"u",
			["g"],
			["completed"]
		);

		const publicWhere = (
			count.mock.calls[0]?.arguments[0] as {
				where: Record<string, unknown>;
			}
		).where;
		const ownerWhere = (
			count.mock.calls[1]?.arguments[0] as {
				where: Record<string, unknown>;
			}
		).where;
		assert.equal(publicWhere.isPublic, true);
		assert.equal("isPublic" in ownerWhere, false);
	});
});

describe("backlogService.findLatestCompletedDurations", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("keys the durations by user and game", async () => {
		const query = stub(sequelize, "query", async () => [
			{ userId: "u-1", gameId: "g-1", realDuration: 12 },
			{ userId: "u-2", gameId: "g-1", realDuration: 30 }
		]);

		const result = await backlogService.findLatestCompletedDurations([
			{ userId: "u-1", gameId: "g-1" },
			{ userId: "u-2", gameId: "g-1" }
		]);

		assert.equal(result.get("u-1:g-1"), 12);
		assert.equal(result.get("u-2:g-1"), 30);
		const options = query.mock.calls[0]?.arguments[1] as {
			replacements: Record<string, string[]>;
		};
		assert.deepEqual(options.replacements.gameIds, ["g-1"]);
	});
});
