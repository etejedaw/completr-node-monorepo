import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { Activity } from "../../src/activity/activity.model";
import { type BacklogStatus } from "../../src/backlog/backlog.model";
import { Queue } from "../../src/queue/queue.model";
import { createUserWithSession } from "../helpers/auth.helper";
import {
	itRejectsInvalidBulkRequests,
	postBulk,
	skippedIds
} from "../helpers/bulk.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

const BULK_PATH = "/users/me/queue/bulk";
const FREE_QUEUE_LIMIT = 10;

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

async function createRuns(userId: string, count: number) {
	const runs = [];
	for (let index = 0; index < count; index++) {
		runs.push(await createRun(userId));
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
	return entries.map(entry => [entry.backlogId, entry.position]);
}

function bulkAdd(authorization: string, backlogIds: string[]) {
	return postBulk(BULK_PATH, authorization, "add", { backlogIds });
}

function bulkRemove(authorization: string, backlogIds: string[]) {
	return postBulk(BULK_PATH, authorization, "remove", { backlogIds });
}

function queueActivities(userId: string) {
	return Activity.count({ where: { userId, type: "queue_added" } });
}

void describe("POST /users/me/queue/bulk?action=add", () => {
	void it("appends runs at the end of the queue in the order received", async () => {
		const owner = await createUserWithSession();
		const [queued, first, second] = await createRuns(owner.user.id, 3);
		await queueRuns(owner.user.id, [queued!.id]);

		const response = await bulkAdd(owner.authorization, [
			second!.id,
			first!.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			action: "add",
			succeeded: [second!.id, first!.id],
			skipped: []
		});
		assert.deepEqual(await queueOrder(owner.user.id), [
			[queued!.id, 1],
			[second!.id, 2],
			[first!.id, 3]
		]);
	});

	void it("reports a run already in the queue as succeeded without duplicating it", async () => {
		const owner = await createUserWithSession();
		const [queued, fresh] = await createRuns(owner.user.id, 2);
		await queueRuns(owner.user.id, [queued!.id]);

		const response = await bulkAdd(owner.authorization, [
			queued!.id,
			fresh!.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [queued!.id, fresh!.id]);
		assert.deepEqual(await queueOrder(owner.user.id), [
			[queued!.id, 1],
			[fresh!.id, 2]
		]);
	});

	void it("skips runs that are not not_started with QUEUE_BACKLOG_NOT_STARTED", async () => {
		const owner = await createUserWithSession();
		const fresh = await createRun(owner.user.id);
		const playing = await createRun(owner.user.id, "playing");
		const completed = await createRun(owner.user.id, "completed");

		const response = await bulkAdd(owner.authorization, [
			playing.id,
			fresh.id,
			completed.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [fresh.id]);
		assert.deepEqual(response.body.data.skipped, [
			{ id: playing.id, code: "QUEUE_BACKLOG_NOT_STARTED" },
			{ id: completed.id, code: "QUEUE_BACKLOG_NOT_STARTED" }
		]);
	});

	void it("skips foreign and missing runs with QUEUE_BACKLOG_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const foreign = await createRun(stranger.id);
		const missing = randomUUID();

		const response = await bulkAdd(owner.authorization, [
			foreign.id,
			missing
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, []);
		assert.deepEqual(response.body.data.skipped, [
			{ id: foreign.id, code: "QUEUE_BACKLOG_NOT_FOUND" },
			{ id: missing, code: "QUEUE_BACKLOG_NOT_FOUND" }
		]);
		assert.equal(await Queue.count({ where: { userId: stranger.id } }), 0);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("deduplicates repeated ids", async () => {
		const owner = await createUserWithSession();
		const run = await createRun(owner.user.id);

		const response = await bulkAdd(owner.authorization, [
			run.id,
			run.id,
			run.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [run.id]);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			1
		);
	});

	void it("records queue_added only for runs that were actually added", async () => {
		const owner = await createUserWithSession();
		const [queued, fresh] = await createRuns(owner.user.id, 2);
		await queueRuns(owner.user.id, [queued!.id]);

		await bulkAdd(owner.authorization, [queued!.id, fresh!.id]).expect(200);

		await delay(150);
		assert.equal(await queueActivities(owner.user.id), 1);
	});

	void it("answers 402 QUEUE_LIMIT_REACHED and adds nothing when the batch exceeds the free limit", async () => {
		const owner = await createUserWithSession();
		const queued = await createRuns(owner.user.id, FREE_QUEUE_LIMIT - 2);
		await queueRuns(
			owner.user.id,
			queued.map(run => run.id)
		);
		const extra = await createRuns(owner.user.id, 3);

		const response = await bulkAdd(
			owner.authorization,
			extra.map(run => run.id)
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "QUEUE_LIMIT_REACHED");
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			FREE_QUEUE_LIMIT - 2
		);
		await delay(150);
		assert.equal(await queueActivities(owner.user.id), 0);
	});

	void it("fills the free queue exactly up to the limit", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, FREE_QUEUE_LIMIT);

		const response = await bulkAdd(
			owner.authorization,
			runs.map(run => run.id)
		);

		assert.equal(response.status, 200);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			FREE_QUEUE_LIMIT
		);
	});

	void it("accepts a batch of runs already queued on a full free queue", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, FREE_QUEUE_LIMIT);
		const ids = runs.map(run => run.id);
		await queueRuns(owner.user.id, ids);

		const response = await bulkAdd(owner.authorization, ids);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, ids);
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");
		const runs = await createRuns(owner.user.id, FREE_QUEUE_LIMIT + 2);

		const response = await bulkAdd(
			owner.authorization,
			runs.map(run => run.id)
		);

		assert.equal(response.status, 200);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			FREE_QUEUE_LIMIT + 2
		);
	});

	void it("does not duplicate entries when the same batch is sent twice at once", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 3);
		const ids = runs.map(run => run.id);

		const responses = await Promise.all([
			bulkAdd(owner.authorization, ids),
			bulkAdd(owner.authorization, ids)
		]);

		for (const response of responses) {
			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.succeeded, ids);
		}
		assert.deepEqual(await queueOrder(owner.user.id), [
			[ids[0], 1],
			[ids[1], 2],
			[ids[2], 3]
		]);
		await delay(150);
		assert.equal(await queueActivities(owner.user.id), 3);
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "add",
		idsKey: "backlogIds",
		otherActionBody: { ids: [randomUUID()] }
	});
});

void describe("POST /users/me/queue/bulk?action=remove", () => {
	void it("removes runs from the queue and renumbers the rest 1..n", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 5);
		await queueRuns(
			owner.user.id,
			runs.map(run => run.id)
		);
		const [first, second, third, fourth, fifth] = runs;

		const response = await bulkRemove(owner.authorization, [
			fourth!.id,
			second!.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			action: "remove",
			succeeded: [fourth!.id, second!.id],
			skipped: []
		});
		assert.deepEqual(await queueOrder(owner.user.id), [
			[first!.id, 1],
			[third!.id, 2],
			[fifth!.id, 3]
		]);
	});

	void it("skips runs that were not queued with QUEUE_BACKLOG_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const [queued, loose] = await createRuns(owner.user.id, 2);
		const foreign = await createRun(stranger.id);
		await queueRuns(owner.user.id, [queued!.id]);
		await queueRuns(stranger.id, [foreign.id]);
		const missing = randomUUID();

		const response = await bulkRemove(owner.authorization, [
			loose!.id,
			queued!.id,
			foreign.id,
			missing,
			queued!.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [queued!.id]);
		assert.deepEqual(
			skippedIds(response.body.data.skipped),
			[loose!.id, foreign.id, missing].sort()
		);
		for (const item of response.body.data.skipped)
			assert.equal(item.code, "QUEUE_BACKLOG_NOT_FOUND");
		assert.equal(await Queue.count({ where: { userId: stranger.id } }), 1);
	});

	void it("skips everything on a second identical batch", async () => {
		const owner = await createUserWithSession();
		const runs = await createRuns(owner.user.id, 2);
		const ids = runs.map(run => run.id);
		await queueRuns(owner.user.id, ids);

		await bulkRemove(owner.authorization, ids).expect(200);
		const response = await bulkRemove(owner.authorization, ids);

		assert.deepEqual(response.body.data.succeeded, []);
		assert.equal(response.body.data.skipped.length, 2);
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "remove",
		idsKey: "backlogIds",
		otherActionBody: { gameIds: [randomUUID()] }
	});
});
