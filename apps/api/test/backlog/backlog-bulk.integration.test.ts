import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { Activity } from "../../src/activity/activity.model";
import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { Queue } from "../../src/queue/queue.model";
import { createUserWithSession } from "../helpers/auth.helper";
import {
	type BulkResponseData,
	itRejectsInvalidBulkRequests,
	postBulk,
	skippedIds
} from "../helpers/bulk.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

const BULK_PATH = "/users/me/backlog/bulk";

useTestDatabase();

async function createRun(
	userId: string,
	status: BacklogStatus = "not_started"
) {
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	return createBacklog(userId, game.id, platform.id, { status });
}

async function createRuns(
	userId: string,
	count: number,
	status: BacklogStatus = "not_started"
) {
	const runs = [];
	for (let index = 0; index < count; index++) {
		runs.push(await createRun(userId, status));
	}
	return runs;
}

async function queueRuns(userId: string, runIds: string[]) {
	await Queue.bulkCreate(
		runIds.map((backlogId, index) => ({
			userId,
			backlogId,
			position: index + 1
		}))
	);
}

async function queueOrder(userId: string) {
	const entries = await Queue.findAll({
		where: { userId },
		order: [["position", "ASC"]]
	});
	return entries.map(entry => ({
		backlogId: entry.backlogId,
		position: entry.position
	}));
}

function bulkUpdate(
	authorization: string,
	ids: string[],
	changes: Record<string, unknown>
) {
	return postBulk(BULK_PATH, authorization, "update", { ids, changes });
}

function bulkDelete(authorization: string, ids: string[]) {
	return postBulk(BULK_PATH, authorization, "delete", { ids });
}

function statusActivities(userId: string) {
	return Activity.findAll({ where: { userId } });
}

void describe("POST /users/me/backlog/bulk?action=update", () => {
	void it("updates every owned run and answers with the bulk shape", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 3);
		const ids = runs.map(run => run.id);

		const response = await bulkUpdate(owner.authorization, ids, {
			isPublic: false,
			startedAt: "2026-10-01"
		});

		assert.equal(response.status, 200);
		const data = response.body.data as BulkResponseData;
		assert.equal(data.action, "update");
		assert.deepEqual(data.succeeded, ids);
		assert.deepEqual(data.skipped, []);
		assert.deepEqual(data.queueRemoved, []);
		const stored = await Backlog.findAll({ where: { id: ids } });
		for (const run of stored) {
			assert.equal(run.isPublic, false);
			assert.equal(run.startedAt, "2026-10-01");
		}
	});

	void it("skips runs of another user with BACKLOG_NOT_FOUND and leaves them untouched", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const own = await createRun(owner.user.id);
		const foreign = await createRun(stranger.id);

		const response = await bulkUpdate(
			owner.authorization,
			[own.id, foreign.id],
			{ status: "playing" }
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [own.id]);
		assert.deepEqual(response.body.data.skipped, [
			{ id: foreign.id, code: "BACKLOG_NOT_FOUND" }
		]);
		await foreign.reload();
		assert.equal(foreign.status, "not_started");
	});

	void it("skips ids that do not exist with BACKLOG_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const missing = randomUUID();

		const response = await bulkUpdate(owner.authorization, [missing], {
			isPublic: false
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, []);
		assert.deepEqual(response.body.data.skipped, [
			{ id: missing, code: "BACKLOG_NOT_FOUND" }
		]);
	});

	void it("deduplicates repeated ids", async () => {
		const owner = await createUserWithSession();
		const run = await createRun(owner.user.id);

		const response = await bulkUpdate(
			owner.authorization,
			[run.id, run.id, run.id],
			{ status: "playing" }
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [run.id]);
		await delay(150);
		const activities = await statusActivities(owner.user.id);
		assert.equal(activities.length, 1);
	});

	void it("mixes valid ids, foreign ids and missing ids in a single batch", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const [first, second] = await createRuns(owner.user.id, 2);
		const foreign = await createRun(stranger.id);
		const missing = randomUUID();

		const response = await bulkUpdate(
			owner.authorization,
			[missing, first!.id, foreign.id, second!.id, first!.id],
			{ userRating: 4.5 }
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [first!.id, second!.id]);
		assert.deepEqual(
			skippedIds(response.body.data.skipped),
			[missing, foreign.id].sort()
		);
		await first!.reload();
		assert.equal(first!.userRating, 4.5);
	});

	void it("removes runs from the queue when the status leaves not_started and renumbers the rest", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 4);
		await queueRuns(
			owner.user.id,
			runs.map(run => run.id)
		);
		const [first, second, third, fourth] = runs;

		const response = await bulkUpdate(
			owner.authorization,
			[first!.id, third!.id],
			{ status: "playing" }
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.queueRemoved, [
			first!.id,
			third!.id
		]);
		assert.deepEqual(await queueOrder(owner.user.id), [
			{ backlogId: second!.id, position: 1 },
			{ backlogId: fourth!.id, position: 2 }
		]);
	});

	for (const status of ["completed", "abandoned", "endless"] as const) {
		void it(`removes runs from the queue when moved to ${status}`, async () => {
			const owner = await createUserWithSession();
			const [queued] = await createRuns(owner.user.id, 1);
			await queueRuns(owner.user.id, [queued!.id]);

			const response = await bulkUpdate(
				owner.authorization,
				[queued!.id],
				{
					status
				}
			);

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.queueRemoved, [queued!.id]);
			assert.equal(
				await Queue.count({ where: { userId: owner.user.id } }),
				0
			);
		});
	}

	void it("keeps queued runs in the queue when the status stays not_started", async () => {
		const owner = await createUserWithSession();
		const [queued] = await createRuns(owner.user.id, 1);
		await queueRuns(owner.user.id, [queued!.id]);

		const response = await bulkUpdate(owner.authorization, [queued!.id], {
			status: "not_started",
			isPublic: false
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.queueRemoved, []);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			1
		);
	});

	void it("does not report runs that were not queued in queueRemoved", async () => {
		const owner = await createUserWithSession();
		const [queued, loose] = await createRuns(owner.user.id, 2);
		await queueRuns(owner.user.id, [queued!.id]);

		const response = await bulkUpdate(
			owner.authorization,
			[loose!.id, queued!.id],
			{ status: "completed" }
		);

		assert.deepEqual(response.body.data.queueRemoved, [queued!.id]);
	});

	void it("records activity only for runs whose status really changed", async () => {
		const owner = await createUserWithSession();
		const [idle] = await createRuns(owner.user.id, 1);
		const [alreadyPlaying] = await createRuns(owner.user.id, 1, "playing");

		const response = await bulkUpdate(
			owner.authorization,
			[idle!.id, alreadyPlaying!.id],
			{ status: "playing" }
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [
			idle!.id,
			alreadyPlaying!.id
		]);
		await eventually(async () => {
			const activities = await statusActivities(owner.user.id);
			assert.equal(activities.length, 1);
			assert.equal(activities[0]!.type, "backlog_playing");
		});
		await delay(150);
		assert.equal((await statusActivities(owner.user.id)).length, 1);
	});

	void it("records no activity when the batch does not change the status", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 2);

		await bulkUpdate(
			owner.authorization,
			runs.map(run => run.id),
			{ isPublic: false, userRating: 3 }
		).expect(200);

		await delay(150);
		assert.equal((await statusActivities(owner.user.id)).length, 0);
	});

	void it("is idempotent when the same batch is sent twice", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 2);
		const ids = runs.map(run => run.id);
		await queueRuns(owner.user.id, ids);

		const first = await bulkUpdate(owner.authorization, ids, {
			status: "completed"
		});
		const second = await bulkUpdate(owner.authorization, ids, {
			status: "completed"
		});

		assert.deepEqual(first.body.data.queueRemoved, ids);
		assert.deepEqual(second.body.data.succeeded, ids);
		assert.deepEqual(second.body.data.queueRemoved, []);
		await delay(150);
		assert.equal((await statusActivities(owner.user.id)).length, 2);
	});

	void it("survives two identical batches sent at the same time", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 3);
		const ids = runs.map(run => run.id);
		await queueRuns(owner.user.id, ids);

		const responses = await Promise.all([
			bulkUpdate(owner.authorization, ids, { status: "playing" }),
			bulkUpdate(owner.authorization, ids, { status: "playing" })
		]);

		for (const response of responses) assert.equal(response.status, 200);
		const removed = responses.flatMap(
			response => response.body.data.queueRemoved as string[]
		);
		assert.deepEqual(removed.sort(), [...ids].sort());
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("clears nullable fields with null", async () => {
		const owner = await createUserWithSession();
		const run = await createRun(owner.user.id, "completed");
		await run.update({ userRating: 4, finishedAt: "2026-10-10" });

		const response = await bulkUpdate(owner.authorization, [run.id], {
			userRating: null,
			finishedAt: null
		});

		assert.equal(response.status, 200);
		await run.reload();
		assert.equal(run.userRating, null);
		assert.equal(run.finishedAt, null);
	});

	for (const [label, changes] of [
		["empty changes", {}],
		["a rating out of steps of 0.5", { userRating: 3.3 }],
		["a rating above 5", { userRating: 5.5 }],
		["an unknown status", { status: "paused" }],
		["a malformed date", { startedAt: "01/10/2026" }],
		["a field outside the bulk contract", { notes: "hello" }],
		["a compilation context", { compilationGameId: randomUUID() }]
	] as const) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const owner = await createUserWithSession();
			const run = await createRun(owner.user.id);

			const response = await bulkUpdate(owner.authorization, [run.id], {
				...changes
			});

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("rejects a batch without changes with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const run = await createRun(owner.user.id);

		const response = await postBulk(
			BULK_PATH,
			owner.authorization,
			"update",
			{
				ids: [run.id]
			}
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "update",
		idsKey: "ids",
		extraBody: { changes: { isPublic: true } },
		otherActionBody: { backlogIds: [randomUUID()] }
	});
});

void describe("POST /users/me/backlog/bulk?action=delete", () => {
	void it("deletes every owned run and answers with the bulk shape", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 3);
		const ids = runs.map(run => run.id);

		const response = await bulkDelete(owner.authorization, ids);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			action: "delete",
			succeeded: ids,
			skipped: []
		});
		assert.equal(await Backlog.count({ where: { id: ids } }), 0);
	});

	void it("skips foreign and missing runs with BACKLOG_NOT_FOUND without deleting them", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const own = await createRun(owner.user.id);
		const foreign = await createRun(stranger.id);
		const missing = randomUUID();

		const response = await bulkDelete(owner.authorization, [
			foreign.id,
			own.id,
			missing,
			own.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [own.id]);
		assert.deepEqual(response.body.data.skipped, [
			{ id: foreign.id, code: "BACKLOG_NOT_FOUND" },
			{ id: missing, code: "BACKLOG_NOT_FOUND" }
		]);
		assert.notEqual(await Backlog.findByPk(foreign.id), null);
	});

	void it("removes deleted runs from the queue and renumbers the rest", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 4);
		await queueRuns(
			owner.user.id,
			runs.map(run => run.id)
		);
		const [first, second, third, fourth] = runs;

		await bulkDelete(owner.authorization, [second!.id, first!.id]).expect(
			200
		);

		assert.deepEqual(await queueOrder(owner.user.id), [
			{ backlogId: third!.id, position: 1 },
			{ backlogId: fourth!.id, position: 2 }
		]);
	});

	void it("skips everything on a second identical batch", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 2);
		const ids = runs.map(run => run.id);

		await bulkDelete(owner.authorization, ids).expect(200);
		const response = await bulkDelete(owner.authorization, ids);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, []);
		assert.deepEqual(
			skippedIds(response.body.data.skipped),
			[...ids].sort()
		);
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "delete",
		idsKey: "ids",
		otherActionBody: { ids: [randomUUID()], changes: { isPublic: true } }
	});
});
