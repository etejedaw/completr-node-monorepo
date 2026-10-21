import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import * as backlogService from "../../src/backlog/backlog.service";
import { sequelize } from "../../src/database/sequelize.database";
import { Queue } from "../../src/queue/queue.model";
import * as queueService from "../../src/queue/queue.service";
import { asModel } from "../unit-helpers/as-model";
import {
	buildRequestUser,
	captureRejection,
	stub,
	stubTransaction
} from "../unit-helpers/mocks";

const FREE_QUEUE_LIMIT = 10;
const FREE_USER = buildRequestUser();

function errorCode(error: unknown) {
	return (error as { code: string }).code;
}

function backlogEntry(overrides: Record<string, unknown> = {}) {
	return asModel({
		id: "b-1",
		userId: "user-1",
		status: "not_started",
		...overrides
	});
}

void describe("queueService.addFromBacklog", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects a free user whose queue is already at the limit", async () => {
		stub(Queue, "count", async () => FREE_QUEUE_LIMIT);
		const find = stub(backlogService, "findBacklogBasicById", async () =>
			backlogEntry()
		);

		const error = await captureRejection(
			queueService.addFromBacklog("b-1", FREE_USER)
		);

		assert.equal(errorCode(error), "QUEUE_LIMIT_REACHED");
		assert.equal(find.mock.callCount(), 0);
	});

	void it("skips the limit for premium users", async () => {
		const count = stub(Queue, "count", async () => 500);
		stub(backlogService, "findBacklogBasicById", async () => null);

		const error = await captureRejection(
			queueService.addFromBacklog(
				"b-1",
				buildRequestUser({ role: "premium" })
			)
		);

		assert.equal(errorCode(error), "QUEUE_BACKLOG_NOT_FOUND");
		assert.equal(count.mock.callCount(), 0);
	});

	void it("fails when the backlog does not exist", async () => {
		stub(Queue, "count", async () => 0);
		stub(backlogService, "findBacklogBasicById", async () => null);

		const error = await captureRejection(
			queueService.addFromBacklog("b-1", FREE_USER)
		);

		assert.equal(errorCode(error), "QUEUE_BACKLOG_NOT_FOUND");
	});

	void it("fails when the backlog belongs to another user", async () => {
		stub(Queue, "count", async () => 0);
		stub(backlogService, "findBacklogBasicById", async () =>
			backlogEntry({ userId: "owner" })
		);

		const error = await captureRejection(
			queueService.addFromBacklog("b-1", FREE_USER)
		);

		assert.equal(errorCode(error), "QUEUE_BACKLOG_NOT_OWNED");
	});

	for (const status of ["playing", "completed", "abandoned", "endless"]) {
		void it(`only accepts not_started backlogs, rejecting ${status}`, async () => {
			stub(Queue, "count", async () => 0);
			stub(backlogService, "findBacklogBasicById", async () =>
				backlogEntry({ status })
			);

			const error = await captureRejection(
				queueService.addFromBacklog("b-1", FREE_USER)
			);

			assert.equal(errorCode(error), "QUEUE_BACKLOG_NOT_STARTED");
		});
	}

	void it("rejects a backlog that is already queued", async () => {
		stub(Queue, "count", async () => 0);
		stub(backlogService, "findBacklogBasicById", async () =>
			backlogEntry()
		);
		stub(Queue, "findOne", async () => asModel({ id: "q-1" }));

		const error = await captureRejection(
			queueService.addFromBacklog("b-1", FREE_USER)
		);

		assert.equal(errorCode(error), "QUEUE_ALREADY_EXISTS");
	});

	void it("appends the entry after the last position inside a locked transaction", async () => {
		stub(Queue, "count", async () => 2);
		stub(backlogService, "findBacklogBasicById", async () =>
			backlogEntry()
		);
		const { transaction } = stubTransaction();
		const lock = stub(sequelize, "query", async () => []);
		const max = stub(Queue, "max", async () => 5);
		const findOne = stub(Queue, "findOne", async () => null);
		const create = stub(Queue, "create", async () => ({}));

		await queueService.addFromBacklog("b-1", FREE_USER);

		assert.match(
			String(lock.mock.calls[0]?.arguments[0]),
			/pg_advisory_xact_lock/
		);
		assert.deepEqual(max.mock.calls[0]?.arguments, [
			"position",
			{ where: { userId: "user-1" }, transaction }
		]);
		assert.deepEqual(create.mock.calls[0]?.arguments, [
			{ userId: "user-1", backlogId: "b-1", position: 6 },
			{ transaction }
		]);
		assert.equal(findOne.mock.callCount(), 2);
	});

	void it("starts at position 1 when the queue is empty", async () => {
		stub(Queue, "count", async () => 0);
		stub(backlogService, "findBacklogBasicById", async () =>
			backlogEntry()
		);
		stubTransaction();
		stub(sequelize, "query", async () => []);
		stub(Queue, "max", async () => null);
		stub(Queue, "findOne", async () => null);
		const create = stub(Queue, "create", async () => ({}));

		await queueService.addFromBacklog("b-1", FREE_USER);

		assert.equal(
			(create.mock.calls[0]?.arguments[0] as { position: number })
				.position,
			1
		);
	});
});

void describe("queueService.replaceQueue", () => {
	beforeEach(() => {
		stub(sequelize, "query", async () => []);
	});

	afterEach(() => {
		mock.restoreAll();
	});

	void it("clears the queue when the new list is empty", async () => {
		const destroy = stub(Queue, "destroy", async () => 2);

		assert.deepEqual(await queueService.replaceQueue(FREE_USER, []), []);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1" } }
		]);
	});

	void it("rejects more entries than the free limit before touching the database", async () => {
		const find = stub(
			backlogService,
			"findBacklogsByUserAndIds",
			async () => []
		);
		const ids = Array.from(
			{ length: FREE_QUEUE_LIMIT + 1 },
			(_, index) => `b-${index}`
		);

		const error = await captureRejection(
			queueService.replaceQueue(FREE_USER, ids)
		);

		assert.equal(errorCode(error), "QUEUE_LIMIT_REACHED");
		assert.equal(find.mock.callCount(), 0);
	});

	void it("accepts exactly the free limit", async () => {
		const ids = Array.from(
			{ length: FREE_QUEUE_LIMIT },
			(_, index) => `b-${index}`
		);
		stub(backlogService, "findBacklogsByUserAndIds", async () =>
			ids.map(id => ({ id, status: "not_started" }))
		);
		stubTransaction();
		stub(Queue, "destroy", async () => 0);
		const bulkCreate = stub(Queue, "bulkCreate", async () => []);
		stub(Queue, "findAll", async () => []);

		await queueService.replaceQueue(FREE_USER, ids);

		assert.equal(
			(bulkCreate.mock.calls[0]?.arguments[0] as unknown[]).length,
			FREE_QUEUE_LIMIT
		);
	});

	void it("does not limit premium users", async () => {
		const ids = Array.from({ length: 50 }, (_, index) => `b-${index}`);
		stub(backlogService, "findBacklogsByUserAndIds", async () =>
			ids.map(id => ({ id, status: "not_started" }))
		);
		stubTransaction();
		stub(Queue, "destroy", async () => 0);
		stub(Queue, "bulkCreate", async () => []);
		stub(Queue, "findAll", async () => []);

		await queueService.replaceQueue(
			buildRequestUser({ role: "premium" }),
			ids
		);
	});

	void it("fails when some backlogs are not the user's", async () => {
		stub(backlogService, "findBacklogsByUserAndIds", async () => [
			{ id: "b-1", status: "not_started" }
		]);

		const error = await captureRejection(
			queueService.replaceQueue(FREE_USER, ["b-1", "b-2"])
		);

		assert.equal(errorCode(error), "QUEUE_BACKLOGS_NOT_FOUND");
	});

	void it("fails when any backlog is not in not_started", async () => {
		stub(backlogService, "findBacklogsByUserAndIds", async () => [
			{ id: "b-1", status: "not_started" },
			{ id: "b-2", status: "playing" }
		]);

		const error = await captureRejection(
			queueService.replaceQueue(FREE_USER, ["b-1", "b-2"])
		);

		assert.equal(errorCode(error), "QUEUE_BACKLOG_NOT_STARTED");
	});

	void it("rebuilds the queue positions in the given order inside a transaction", async () => {
		stub(backlogService, "findBacklogsByUserAndIds", async () => [
			{ id: "b-2", status: "not_started" },
			{ id: "b-1", status: "not_started" }
		]);
		const { transaction } = stubTransaction();
		const destroy = stub(Queue, "destroy", async () => 0);
		const bulkCreate = stub(Queue, "bulkCreate", async () => []);
		stub(Queue, "findAll", async () => []);

		await queueService.replaceQueue(FREE_USER, ["b-2", "b-1"]);

		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1" }, transaction }
		]);
		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments, [
			[
				{ userId: "user-1", backlogId: "b-2", position: 1 },
				{ userId: "user-1", backlogId: "b-1", position: 2 }
			],
			{ transaction }
		]);
	});
});

void describe("queueService.compactPositions", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("locks the user's queue and renumbers it from 1 keeping the order", async () => {
		const transaction = { id: "tx" };
		const query = stub(sequelize, "query", async () => []);

		await queueService.compactPositions("user-1", transaction as never);

		assert.equal(query.mock.callCount(), 2);
		const [lockSql, lockOptions] = query.mock.calls[0]!.arguments;
		assert.match(String(lockSql), /pg_advisory_xact_lock/);
		assert.deepEqual(lockOptions, {
			replacements: { lockKey: "queue:user-1" },
			transaction
		});
		const [compactSql, compactOptions] = query.mock.calls[1]!.arguments;
		assert.match(
			String(compactSql),
			/ROW_NUMBER\(\) OVER \(ORDER BY "position", "createdAt", "id"\)/
		);
		assert.deepEqual(compactOptions, {
			replacements: { userId: "user-1" },
			transaction
		});
	});
});

void describe("queueService.removeByBacklogId", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("removes the user's entry and compacts in the same transaction", async () => {
		const { transaction } = stubTransaction();
		const query = stub(sequelize, "query", async () => []);
		const destroy = stub(Queue, "destroy", async () => 1);

		assert.equal(
			await queueService.removeByBacklogId("b-1", "user-1"),
			true
		);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { backlogId: "b-1", userId: "user-1" }, transaction }
		]);
		assert.equal(query.mock.callCount(), 3);
		assert.match(
			String(query.mock.calls[2]?.arguments[0]),
			/UPDATE "Queues"/
		);
	});

	void it("skips the compaction when the backlog was not queued", async () => {
		stubTransaction();
		const query = stub(sequelize, "query", async () => []);
		stub(Queue, "destroy", async () => 0);

		assert.equal(
			await queueService.removeByBacklogId("b-1", "user-1"),
			false
		);
		assert.equal(query.mock.callCount(), 1);
	});
});
