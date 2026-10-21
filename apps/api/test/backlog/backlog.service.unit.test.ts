import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { UniqueConstraintError, ValidationError } from "sequelize";

import { Backlog } from "../../src/backlog/backlog.model";
import * as backlogService from "../../src/backlog/backlog.service";
import * as backlogProgressService from "../../src/backlog-progress/backlog-progress.service";
import { sequelize } from "../../src/database/sequelize.database";
import * as gameShelfService from "../../src/game-shelf/game-shelf.service";
import * as gamesCompilationService from "../../src/games/services/games-compilation.service";
import * as moodTagsService from "../../src/mood-tags/mood-tags.service";
import * as queueService from "../../src/queue/queue.service";
import * as reviewsService from "../../src/reviews/reviews.service";
import { asModel } from "../unit-helpers/as-model";
import {
	buildRequestUser,
	captureRejection,
	spy,
	stub,
	stubTransaction
} from "../unit-helpers/mocks";

const USER = buildRequestUser({ id: "u-1" });
const TRANSACTION = { id: "tx" };

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

void describe("backlogService.createBacklog", () => {
	beforeEach(() => {
		stubTransaction();
	});

	afterEach(() => {
		mock.restoreAll();
	});

	void it("creates the entry for the user and reloads it with its relations", async () => {
		const reload = spy();
		const entry = asModel({ reload });
		const create = stub(Backlog, "create", async () => entry);

		const result = await backlogService.createBacklog(
			USER,
			registerDto as never
		);

		assert.deepEqual(create.mock.calls[0]?.arguments, [
			{ ...registerDto, userId: "u-1" },
			{ transaction: TRANSACTION }
		]);
		assert.equal(reload.mock.callCount(), 1);
		assert.deepEqual(result, {
			backlog: entry,
			reviewCreated: false,
			addedToQueue: false,
			addedToShelf: false
		});
	});

	void it("rejects a compilation that is not an active compilation", async () => {
		stubCompilation({ exists: false, belongs: true });
		const create = stub(Backlog, "create", async () => ({}));

		const error = await captureRejection(
			backlogService.createBacklog(USER, {
				...registerDto,
				compilationGameId: "comp-1"
			} as never)
		);

		assert.equal(errorCode(error), "BACKLOG_COMPILATION_CONTEXT_INVALID");
		assert.equal(create.mock.callCount(), 0);
	});

	void it("rejects a game that is not part of the given compilation", async () => {
		stubCompilation({ exists: true, belongs: false });

		const error = await captureRejection(
			backlogService.createBacklog(USER, {
				...registerDto,
				compilationGameId: "comp-1"
			} as never)
		);

		assert.equal(errorCode(error), "BACKLOG_COMPILATION_CONTEXT_INVALID");
	});

	void it("accepts a game that belongs to an active compilation", async () => {
		stubCompilation({ exists: true, belongs: true });
		stub(Backlog, "create", async () => asModel({ reload: spy() }));

		await backlogService.createBacklog(USER, {
			...registerDto,
			compilationGameId: "comp-1"
		} as never);
	});

	void it("does not check compilations when no compilation game is given", async () => {
		const exists = stub(
			gamesCompilationService,
			"existsActiveCompilation",
			async () => false
		);
		stub(Backlog, "create", async () => asModel({ reload: spy() }));

		await backlogService.createBacklog(USER, registerDto as never);

		assert.equal(exists.mock.callCount(), 0);
	});

	void it("maps unique and validation errors to service errors", async () => {
		stub(Backlog, "create", async () => {
			throw new UniqueConstraintError({});
		});
		const unique = await captureRejection(
			backlogService.createBacklog(USER, registerDto as never)
		);
		mock.restoreAll();
		stubTransaction();

		stub(Backlog, "create", async () => {
			throw new ValidationError("bad", []);
		});
		const validation = await captureRejection(
			backlogService.createBacklog(USER, registerDto as never)
		);

		assert.equal(errorCode(unique), "BACKLOG_UNIQUE_CONSTRAINT");
		assert.equal(errorCode(validation), "BACKLOG_VALIDATION_ERROR");
	});
});

void describe("backlogService.createBacklog extras", () => {
	const createdEntry = {
		id: "b-1",
		gameId: "game-1",
		platformId: "platform-1"
	};
	const extrasDto = {
		...registerDto,
		status: "completed",
		addToQueue: true,
		addToShelf: true,
		moodTags: ["cozy"],
		review: { content: "Great", rating: 4.5 },
		progressNote: "Chapter 3"
	};

	function stubExtras(
		options: {
			reviewExists?: boolean;
			shelfExists?: boolean;
			queueFails?: boolean;
		} = {}
	) {
		const create = stub(Backlog, "create", async () =>
			asModel({ ...createdEntry, reload: spy() })
		);
		stub(reviewsService, "findReviewByUserAndGame", async () =>
			options.reviewExists ? { id: "r-1" } : null
		);
		stub(gameShelfService, "existsGameShelfEntry", async () =>
			Boolean(options.shelfExists)
		);
		return {
			create,
			createReview: stub(
				reviewsService,
				"createReview",
				async () => ({})
			),
			replaceTags: stub(moodTagsService, "replaceTags", async () => []),
			addProgress: stub(
				backlogProgressService,
				"addProgress",
				async () => ({})
			),
			addFromBacklog: stub(queueService, "addFromBacklog", async () => {
				if (options.queueFails)
					throw Object.assign(new Error("limit"), {
						code: "QUEUE_LIMIT_REACHED"
					});
				return {};
			}),
			registerGameShelf: stub(
				gameShelfService,
				"registerGameShelf",
				async () => ({})
			)
		};
	}

	beforeEach(() => {
		stubTransaction();
	});

	afterEach(() => {
		mock.restoreAll();
	});

	void it("creates every requested extra inside the backlog transaction", async () => {
		const extras = stubExtras();

		const result = await backlogService.createBacklog(
			USER,
			extrasDto as never
		);

		assert.deepEqual(extras.createReview.mock.calls[0]?.arguments, [
			"u-1",
			"game-1",
			{ content: "Great", rating: 4.5 },
			TRANSACTION
		]);
		assert.deepEqual(extras.replaceTags.mock.calls[0]?.arguments, [
			USER,
			"game-1",
			["cozy"],
			TRANSACTION
		]);
		assert.deepEqual(extras.addProgress.mock.calls[0]?.arguments, [
			"u-1",
			"b-1",
			"Chapter 3",
			TRANSACTION
		]);
		assert.deepEqual(extras.addFromBacklog.mock.calls[0]?.arguments, [
			"b-1",
			USER,
			TRANSACTION
		]);
		assert.deepEqual(extras.registerGameShelf.mock.calls[0]?.arguments, [
			USER,
			{ gameId: "game-1", platformId: "platform-1" },
			TRANSACTION
		]);
		assert.equal(result.reviewCreated, true);
		assert.equal(result.addedToQueue, true);
		assert.equal(result.addedToShelf, true);
	});

	void it("does not persist the extras fields on the backlog row", async () => {
		const { create } = stubExtras();

		await backlogService.createBacklog(USER, extrasDto as never);

		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			...registerDto,
			status: "completed",
			userId: "u-1"
		});
	});

	void it("skips the review and the shelf entry when they already exist", async () => {
		const extras = stubExtras({ reviewExists: true, shelfExists: true });

		const result = await backlogService.createBacklog(
			USER,
			extrasDto as never
		);

		assert.equal(extras.createReview.mock.callCount(), 0);
		assert.equal(extras.registerGameShelf.mock.callCount(), 0);
		assert.equal(result.reviewCreated, false);
		assert.equal(result.addedToShelf, false);
	});

	void it("calls no other module when no extras are requested", async () => {
		const extras = stubExtras();

		await backlogService.createBacklog(USER, registerDto as never);

		const { create: _create, ...otherModules } = extras;
		for (const call of Object.values(otherModules))
			assert.equal(call.mock.callCount(), 0);
	});

	void it("stops at the first failing extra and rejects with its error", async () => {
		const extras = stubExtras({ queueFails: true });

		const error = await captureRejection(
			backlogService.createBacklog(USER, extrasDto as never)
		);

		assert.equal(errorCode(error), "QUEUE_LIMIT_REACHED");
		assert.equal(extras.registerGameShelf.mock.callCount(), 0);
	});
});

void describe("backlogService.updateBacklog", () => {
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

	void it("fails with BACKLOG_NOT_FOUND when the entry does not exist", async () => {
		stub(Backlog, "findOne", async () => null);

		const error = await captureRejection(
			backlogService.updateBacklog("b-1", "owner", {})
		);

		assert.equal(errorCode(error), "BACKLOG_NOT_FOUND");
	});

	void it("fails with BACKLOG_FORBIDDEN when the entry belongs to someone else", async () => {
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
		void it(`removes the queue entry and reports queueRemoved when moving to ${status}`, async () => {
			stubOwnedEntry();
			const remove = stub(
				queueService,
				"removeByBacklogId",
				async () => true
			);

			const result = await backlogService.updateBacklog("b-1", "owner", {
				status
			});

			assert.deepEqual(remove.mock.calls[0]?.arguments, ["b-1", "owner"]);
			assert.equal(result.queueRemoved, true);
		});
	}

	void it("reports queueRemoved false when the entry was not queued", async () => {
		stubOwnedEntry();
		stub(queueService, "removeByBacklogId", async () => false);

		const result = await backlogService.updateBacklog("b-1", "owner", {
			status: "playing"
		});

		assert.equal(result.queueRemoved, false);
	});

	void it("keeps the queue entry when the status is not_started or not changed", async () => {
		stubOwnedEntry();
		const remove = stub(
			queueService,
			"removeByBacklogId",
			async () => true
		);

		const toNotStarted = await backlogService.updateBacklog(
			"b-1",
			"owner",
			{ status: "not_started" }
		);
		const noStatus = await backlogService.updateBacklog("b-1", "owner", {
			notes: "x"
		});

		assert.equal(remove.mock.callCount(), 0);
		assert.equal(toNotStarted.queueRemoved, false);
		assert.equal(noStatus.queueRemoved, false);
	});

	void it("validates the compilation context against the stored game", async () => {
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

	void it("allows clearing the compilation game without validating it", async () => {
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

void describe("backlogService.removeBacklog", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("fails with BACKLOG_NOT_FOUND for a missing entry", async () => {
		stub(Backlog, "findOne", async () => null);

		const error = await captureRejection(
			backlogService.removeBacklog("b-1", "u-1")
		);

		assert.equal(errorCode(error), "BACKLOG_NOT_FOUND");
	});

	void it("fails with BACKLOG_FORBIDDEN and keeps the entry of another user", async () => {
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

	void it("locks the queue, deletes the entry and compacts the queue in that order inside one transaction", async () => {
		stub(Backlog, "findOne", async () =>
			asModel({ id: "b-1", userId: "owner" })
		);
		const { transaction } = stubTransaction();
		const steps: string[] = [];
		const lock = stub(queueService, "lockUserQueue", async () => {
			steps.push("lock");
		});
		const destroy = stub(Backlog, "destroy", async () => {
			steps.push("destroy");
			return 1;
		});
		const compact = stub(queueService, "compactPositions", async () => {
			steps.push("compact");
		});

		assert.equal(await backlogService.removeBacklog("b-1", "owner"), true);
		assert.deepEqual(steps, ["lock", "destroy", "compact"]);
		assert.deepEqual(lock.mock.calls[0]?.arguments, ["owner", transaction]);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "b-1" }, transaction }
		]);
		assert.deepEqual(compact.mock.calls[0]?.arguments, [
			"owner",
			transaction
		]);
	});
});

void describe("backlogService empty input shortcuts", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("skip the database when there are no ids, games or statuses", async () => {
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

	void it("restrict the distinct game count to public entries when asked", async () => {
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

void describe("backlogService.findLatestCompletedDurations", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("keys the durations by user and game", async () => {
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
