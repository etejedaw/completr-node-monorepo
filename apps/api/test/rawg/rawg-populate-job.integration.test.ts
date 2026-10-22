import "./rawg-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { GameExternal } from "../../src/game-external/game-external.model";
import { Game } from "../../src/games/game.model";
import { Job } from "../../src/jobs/job.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	ELDEN_RING_DETAIL,
	HOLLOW_KNIGHT_DETAIL
} from "./fixtures/rawg.fixtures";
import {
	jsonResponse,
	rawgCatalogHandler,
	rawgFailureHandler,
	stubRawgFetch
} from "./rawg-fetch.helper";

const JOB_TIMEOUT_MS = 15_000;
const JOB_POLL_INTERVAL_MS = 50;

let authorization: string;

useTestDatabase(async () => {
	authorization = (await createUserWithSession("admin")).authorization;
});

beforeEach(async () => {
	await GameExternal.destroy({ where: {} });
	await Game.destroy({ where: {} });
});

afterEach(() => {
	mock.restoreAll();
});

async function finishedJob(jobId: string) {
	const deadline = Date.now() + JOB_TIMEOUT_MS;
	for (;;) {
		const job = await Job.findByPk(jobId);
		assert.ok(job);
		if (job.status !== "running") return job;
		assert.ok(Date.now() < deadline, "the populate job never finished");
		await delay(JOB_POLL_INTERVAL_MS);
	}
}

async function runPopulateJob(query: Record<string, string> = {}) {
	const response = await api()
		.post("/admin/jobs/populate-rawg")
		.query(query)
		.set("Authorization", authorization);
	assert.equal(response.status, 202);
	assert.equal(response.body.data.job.type, "populate_rawg");
	assert.equal(response.body.data.job.status, "running");
	return finishedJob(response.body.data.job.id);
}

function createCatalogGame(title: string, code: string) {
	return Game.create({ title, code });
}

function externalOf(gameId: string) {
	return GameExternal.findOne({ where: { gameId, source: "rawg" } });
}

void describe("POST /admin/jobs/populate-rawg", () => {
	void it("stores the RAWG id of each game and completes the job", async () => {
		const game = await createCatalogGame("Elden Ring", "elden-ring");
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({ details: [ELDEN_RING_DETAIL] })
		);

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 1, Errors: 0, Skipped: 0, Total: 1"
		);
		assert.ok(job.completedAt);
		assert.equal((await externalOf(game.id))?.externalId, "326243");
		assert.equal(rawgCalls.length, 1);
		const [call] = rawgCalls;
		assert.equal(call?.pathname, "/api/games/elden-ring");
		assert.equal(call?.searchParams.get("key"), "fake-key");
	});

	void it("skips the games that already have a RAWG id", async () => {
		const known = await createCatalogGame("Hollow Knight", "hollow-knight");
		await GameExternal.create({
			gameId: known.id,
			source: "rawg",
			externalId: "9767"
		});
		const pending = await createCatalogGame("Elden Ring", "elden-ring");
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				details: [ELDEN_RING_DETAIL, HOLLOW_KNIGHT_DETAIL]
			})
		);

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 1, Errors: 0, Skipped: 1, Total: 2"
		);
		assert.deepEqual(
			rawgCalls.map(call => call.pathname),
			["/api/games/elden-ring"]
		);
		assert.equal((await externalOf(pending.id))?.externalId, "326243");
	});

	void it("ignores inactive games", async () => {
		await Game.create({
			title: "Hollow Knight",
			code: "hollow-knight",
			isActive: false
		});
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({ details: [HOLLOW_KNIGHT_DETAIL] })
		);

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 0, Errors: 0, Skipped: 0, Total: 0"
		);
		assert.equal(rawgCalls.length, 0);
	});

	void it("processes at most the limit passed in the query string", async () => {
		const first = await createCatalogGame("Elden Ring", "elden-ring");
		const second = await createCatalogGame(
			"Hollow Knight",
			"hollow-knight"
		);
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				details: [ELDEN_RING_DETAIL, HOLLOW_KNIGHT_DETAIL]
			})
		);

		const job = await runPopulateJob({ limit: "1" });

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 1, Errors: 0, Skipped: 0, Total: 2"
		);
		assert.equal(rawgCalls.length, 1);
		const stored = await GameExternal.count({
			where: { gameId: [first.id, second.id], source: "rawg" }
		});
		assert.equal(stored, 1);
	});

	void it("counts a game RAWG does not know as an error and stores nothing for it", async () => {
		const game = await createCatalogGame(
			"Home Brew Game",
			"home-brew-game"
		);
		stubRawgFetch(rawgCatalogHandler({ details: [ELDEN_RING_DETAIL] }));

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 0, Errors: 1, Skipped: 0, Total: 1"
		);
		assert.equal(await externalOf(game.id), null);
	});

	void it("keeps the job completed and counts the error when RAWG fails with a 5xx", async () => {
		const game = await createCatalogGame("Elden Ring", "elden-ring");
		const { rawgCalls } = stubRawgFetch(rawgFailureHandler(500));

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 0, Errors: 1, Skipped: 0, Total: 1"
		);
		assert.equal(rawgCalls.length, 1);
		assert.equal(await externalOf(game.id), null);
	});

	void it("keeps the job completed and counts the error when RAWG rate limits", async () => {
		const game = await createCatalogGame("Elden Ring", "elden-ring");
		stubRawgFetch(rawgFailureHandler(429));

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 0, Errors: 1, Skipped: 0, Total: 1"
		);
		assert.equal(await externalOf(game.id), null);
	});

	void it("keeps the job completed and counts the error when the network to RAWG fails", async () => {
		const game = await createCatalogGame("Elden Ring", "elden-ring");
		stubRawgFetch(() => {
			throw new TypeError("fetch failed");
		});

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 0, Errors: 1, Skipped: 0, Total: 1"
		);
		assert.equal(await externalOf(game.id), null);
	});

	void it("neither processes nor counts an error for a RAWG response without id", async () => {
		const game = await createCatalogGame("Elden Ring", "elden-ring");
		stubRawgFetch(() => jsonResponse({ detail: "unexpected body" }));

		const job = await runPopulateJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Processed: 0, Errors: 0, Skipped: 0, Total: 1"
		);
		assert.equal(await externalOf(game.id), null);
	});
});
