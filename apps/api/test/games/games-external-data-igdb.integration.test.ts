import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { ServiceError } from "../../src/common/errors/service-error";
import { ExternalDataAttempt } from "../../src/external-data-attempts/external-data-attempt.model";
import { GameExternal } from "../../src/game-external/game-external.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { Game } from "../../src/games/game.model";
import { EXTERNAL_DATA_DEADLINE_EXCEEDED } from "../../src/games/games.constants";
import { createRequestPacer } from "../../src/games/utils/create-request-pacer.util";
import {
	registerExternalDataRefreshTimer,
	registerExternalDataSources,
	registerIgdbRequestPacer
} from "../../src/games/services/external-data-sources.service";
import {
	enqueueImportedGames,
	isImportEnrichmentPaused,
	whenImportEnrichmentIdle
} from "../../src/games/services/games-import-enrichment.service";
import { type IgdbGame } from "../../src/igdb/igdb.interface";
import { Job } from "../../src/jobs/job.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createGameScore,
	createGameTime,
	createScoreSource
} from "../helpers/factories.helper";
import {
	createCatalogGame,
	deferred,
	fakeIgdb,
	hltbPages,
	igdbGame,
	igdbGames,
	igdbReleaseDate,
	linkExternal,
	metacriticDetail,
	metacriticPages,
	providerError,
	registerFakes
} from "./external-data-fakes.helper";

const JOB_TIMEOUT_MS = 15_000;
const JOB_POLL_INTERVAL_MS = 25;

let admin: string;

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic", scale: 100 });
	await createScoreSource({ code: "igdb", scale: 100 });
	admin = (await createUserWithSession("admin")).authorization;
});

before(() => {
	registerIgdbRequestPacer(createRequestPacer(0));
});

after(() => {
	registerIgdbRequestPacer();
});

beforeEach(async () => {
	await resetCatalog();
});

afterEach(async () => {
	await whenImportEnrichmentIdle();
	registerExternalDataSources({});
	registerExternalDataRefreshTimer();
	registerIgdbRequestPacer(createRequestPacer(0));
});

function refresh(gameId: string, sources: unknown) {
	return api()
		.post(`/games/${gameId}/external-data/refresh`)
		.set("Authorization", admin)
		.send({ sources });
}

function registerIgdbOnly(igdb: ReturnType<typeof fakeIgdb>) {
	registerFakes({ igdb });
}

async function igdbState(gameId: string) {
	const [score, external, attempt] = await Promise.all([
		GameScore.findOne({ where: { gameId, source: "igdb" } }),
		GameExternal.findOne({ where: { gameId, source: "igdb" } }),
		ExternalDataAttempt.findOne({ where: { gameId, source: "igdb" } })
	]);
	return {
		score: score?.score ?? null,
		externalId: external?.externalId ?? null,
		attempt: attempt?.status ?? null
	};
}

function hades(overrides: Partial<IgdbGame> = {}) {
	return igdbGame({
		id: 1113,
		name: "Hades",
		slug: "hades--1",
		rating: 92.34567,
		first_release_date: igdbReleaseDate(2020),
		...overrides
	});
}

function failedWith(errorCode: string) {
	return { source: "igdb", status: "failed", errorCode };
}

function rateLimitedWithDetail(retryAfterMs: number) {
	return new ServiceError("IGDB_RATE_LIMITED", {
		service: "IGDB Provider",
		raw: { status: 429, retryAfterMs }
	});
}

void describe("POST /games/:id/external-data/refresh — IGDB lookup", () => {
	void it("accepts igdb in the source list next to the other sources", async () => {
		const game = await createCatalogGame("Hades", { code: "nothing" });
		registerFakes({
			metacritic: metacriticPages([]),
			igdb: igdbGames([])
		});

		const response = await refresh(game.id, ["igdb", "metacritic"]);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.results.map(
				(result: { source: string }) => result.source
			),
			["igdb", "metacritic"]
		);
	});

	void it("asks only for the stored id and stores the rating rounded to two decimals", async () => {
		const game = await createCatalogGame("Hades", { code: "hades" });
		await linkExternal(game.id, "igdb", "1113");
		const igdb = igdbGames([hades()]);
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{ source: "igdb", status: "updated", score: 92.35, errorCode: null }
		]);
		assert.deepEqual(igdb.calls, ["id:1113"]);
		assert.deepEqual(
			response.body.data.game.scores.map(
				(score: { source: string; score: number }) => [
					score.source,
					score.score
				]
			),
			[["igdb", 92.35]]
		);
		assert.deepEqual(await igdbState(game.id), {
			score: 92.35,
			externalId: "1113",
			attempt: null
		});
	});

	for (const storedId of ["abc", "12abc", "-3", "1.5", " 42"]) {
		void it(`answers not_found without calling IGDB for the stored id "${storedId}"`, async () => {
			const game = await createCatalogGame("Hades");
			await linkExternal(game.id, "igdb", storedId);
			const igdb = igdbGames([hades({ id: 42 })]);
			registerIgdbOnly(igdb);

			const response = await refresh(game.id, ["igdb"]);

			assert.deepEqual(response.body.data.results, [
				{ source: "igdb", status: "not_found", errorCode: null }
			]);
			assert.deepEqual(igdb.calls, []);
			assert.equal((await igdbState(game.id)).attempt, "not_found");
		});
	}

	void it("keeps the stored id and score when IGDB no longer knows the id", async () => {
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "igdb", "1113");
		await createGameScore(game.id, "igdb", 80);
		registerIgdbOnly(igdbGames([]));

		const response = await refresh(game.id, ["igdb"]);

		assert.deepEqual(response.body.data.results, [
			{ source: "igdb", status: "not_found", errorCode: null }
		]);
		assert.deepEqual(await igdbState(game.id), {
			score: 80,
			externalId: "1113",
			attempt: "not_found"
		});
	});

	void it("finds the game by its slug and stores the numeric id as a string", async () => {
		const game = await createCatalogGame("Hades", {
			code: "hades",
			releaseAt: "2020-09-17"
		});
		const igdb = fakeIgdb({
			bySlug: slug => (slug === "hades" ? hades() : undefined),
			search: () => {
				throw new Error("the search should not run");
			}
		});
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.body.data.results[0].status, "updated");
		assert.deepEqual(igdb.calls, ["slug:hades"]);
		assert.deepEqual(await igdbState(game.id), {
			score: 92.35,
			externalId: "1113",
			attempt: null
		});
	});

	void it("searches by title when the slug belongs to another game", async () => {
		const game = await createCatalogGame("Hades", { code: "hades" });
		const igdb = fakeIgdb({
			bySlug: () => igdbGame({ id: 7, name: "Hades II", rating: 95 }),
			search: () => [hades()]
		});
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.body.data.results[0].score, 92.35);
		assert.deepEqual(igdb.calls, ["slug:hades", "search:Hades"]);
		assert.equal((await igdbState(game.id)).externalId, "1113");
	});

	void it("searches by title when the slug answers IGDB_NOT_FOUND", async () => {
		const game = await createCatalogGame("Hades", { code: "hades" });
		const igdb = fakeIgdb({ search: () => [hades()] });
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.body.data.results[0].status, "updated");
		assert.deepEqual(igdb.calls, ["slug:hades", "search:Hades"]);
	});

	void it("picks the result whose title and year match out of an unordered search with junk", async () => {
		const game = await createCatalogGame("Resident Evil: Remake", {
			code: "resident-evil-remake",
			releaseAt: "2002-03-22"
		});
		const igdb = fakeIgdb({
			search: () => [
				igdbGame({ id: 1, name: "Resident Evil 2", rating: 88 }),
				igdbGame({
					id: 2,
					name: "Resident Evil Remake",
					rating: 70,
					first_release_date: igdbReleaseDate(2015)
				}),
				{ id: 3, slug: "junk" } as IgdbGame,
				igdbGame({ id: 0, name: "Resident Evil Remake", rating: 99 }),
				igdbGame({
					id: 4,
					name: "resident evil — remake",
					rating: 89.999,
					first_release_date: igdbReleaseDate(2003)
				}),
				{ id: "5", name: "Resident Evil Remake" } as unknown as IgdbGame
			]
		});
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.deepEqual(response.body.data.results, [
			{ source: "igdb", status: "updated", score: 90, errorCode: null }
		]);
		assert.deepEqual(await igdbState(game.id), {
			score: 90,
			externalId: "4",
			attempt: null
		});
	});

	void it("treats the same game repeated in the search as one match", async () => {
		const game = await createCatalogGame("Hades", { code: "x" });
		registerIgdbOnly(fakeIgdb({ search: () => [hades(), hades(), hades()] }));

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.body.data.results[0].status, "updated");
	});

	void it("answers ambiguous and stores nothing when two games share the title and the year is unknown", async () => {
		const game = await createCatalogGame("Hades", { code: "x" });
		registerIgdbOnly(
			fakeIgdb({
				search: () => [
					hades(),
					hades({ id: 9, first_release_date: igdbReleaseDate(1999) })
				]
			})
		);

		const response = await refresh(game.id, ["igdb"]);

		assert.deepEqual(response.body.data.results, [
			{ source: "igdb", status: "ambiguous", errorCode: null }
		]);
		assert.deepEqual(await igdbState(game.id), {
			score: null,
			externalId: null,
			attempt: "ambiguous"
		});
	});

	void it("answers ambiguous when two games of the same title fall within the year margin", async () => {
		const game = await createCatalogGame("Hades", {
			code: "x",
			releaseAt: "2020-01-01"
		});
		registerIgdbOnly(
			fakeIgdb({
				search: () => [
					hades({ first_release_date: igdbReleaseDate(2019) }),
					hades({ id: 9, first_release_date: igdbReleaseDate(2021) })
				]
			})
		);

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.body.data.results[0].status, "ambiguous");
	});

	void it("answers not_found when the only title match is more than a year apart", async () => {
		const game = await createCatalogGame("Hades", {
			code: "hades",
			releaseAt: "2020-09-17"
		});
		const igdb = igdbGames([
			hades({ slug: "hades", first_release_date: igdbReleaseDate(2023) })
		]);
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.deepEqual(response.body.data.results, [
			{ source: "igdb", status: "not_found", errorCode: null }
		]);
		assert.deepEqual(igdb.calls, ["slug:hades", "search:Hades"]);
		assert.equal((await igdbState(game.id)).externalId, null);
	});

	void it("answers not_found for an empty search or one with only other titles", async () => {
		const empty = await createCatalogGame("Hades", { code: "a" });
		const others = await createCatalogGame("Celeste", { code: "b" });
		registerIgdbOnly(fakeIgdb({ search: () => [hades()] }));
		const otherTitles = await refresh(others.id, ["igdb"]);
		registerIgdbOnly(fakeIgdb({ search: () => [] }));
		const emptySearch = await refresh(empty.id, ["igdb"]);
		const responses = [otherTitles, emptySearch];

		for (const response of responses)
			assert.deepEqual(response.body.data.results, [
				{ source: "igdb", status: "not_found", errorCode: null }
			]);
		assert.equal((await igdbState(others.id)).attempt, "not_found");
		assert.equal((await igdbState(empty.id)).attempt, "not_found");
	});

	void it("answers not_found without calling IGDB for a title without letters or digits", async () => {
		const game = await createCatalogGame("¿¡!?", { code: "  " });
		const igdb = igdbGames([igdbGame({ id: 5, name: "!!!", rating: 50 })]);
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.body.data.results[0].status, "not_found");
		assert.deepEqual(igdb.calls, []);
	});
});

void describe("POST /games/:id/external-data/refresh — IGDB rating", () => {
	for (const [label, rating] of [
		["a missing rating", undefined],
		["a zero rating", 0],
		["a negative rating", -12],
		["a rating above 100", 140],
		["a NaN rating", Number.NaN],
		["a rating as text", "88"],
		["a rating that rounds to zero", 0.001]
	] as const) {
		void it(`answers no_data for ${label} and keeps the previous score`, async () => {
			const game = await createCatalogGame("Hades", { code: "x" });
			await createGameScore(game.id, "igdb", 75);
			registerIgdbOnly(
				fakeIgdb({
					search: () => [
						hades({ rating: rating as unknown as number })
					]
				})
			);

			const response = await refresh(game.id, ["igdb"]);

			assert.deepEqual(response.body.data.results, [
				{ source: "igdb", status: "no_data", errorCode: null }
			]);
			assert.deepEqual(await igdbState(game.id), {
				score: 75,
				externalId: "1113",
				attempt: "no_data"
			});
		});
	}

	void it("stores a rating of exactly 100", async () => {
		const game = await createCatalogGame("Hades", { code: "x" });
		registerIgdbOnly(fakeIgdb({ search: () => [hades({ rating: 100 })] }));

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.body.data.results[0].score, 100);
	});
});

void describe("POST /games/:id/external-data/refresh — IGDB failures", () => {
	void it("answers failed IGDB_RATE_LIMITED with its detail and records no attempt", async () => {
		const game = await createCatalogGame("Hades", { code: "hades" });
		registerIgdbOnly(
			fakeIgdb({ bySlug: () => rateLimitedWithDetail(1500) })
		);

		const response = await refresh(game.id, ["igdb"]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{
				...failedWith("IGDB_RATE_LIMITED"),
				httpStatus: 429,
				retryAfterSeconds: 2
			}
		]);
		assert.equal(await ExternalDataAttempt.count(), 0);
	});

	for (const code of [
		"IGDB_AUTH_ERROR",
		"IGDB_DISABLED",
		"IGDB_PARSE_ERROR"
	]) {
		void it(`answers failed ${code} without holding the game back`, async () => {
			const game = await createCatalogGame("Hades", { code: "x" });
			registerIgdbOnly(fakeIgdb({ search: () => providerError(code) }));

			const response = await refresh(game.id, ["igdb"]);

			assert.deepEqual(response.body.data.results, [failedWith(code)]);
			assert.equal((await igdbState(game.id)).attempt, null);
		});
	}

	void it("records a request error as a failed attempt and clears it once a retry works", async () => {
		const game = await createCatalogGame("Hades", { code: "x" });
		let calls = 0;
		registerIgdbOnly(
			fakeIgdb({
				search: () => {
					calls += 1;
					return calls === 1
						? providerError("IGDB_REQUEST_ERROR")
						: [hades()];
				}
			})
		);

		const first = await refresh(game.id, ["igdb"]);
		assert.deepEqual(first.body.data.results, [
			failedWith("IGDB_REQUEST_ERROR")
		]);
		assert.equal((await igdbState(game.id)).attempt, "failed");

		const second = await refresh(game.id, ["igdb"]);
		assert.equal(second.body.data.results[0].status, "updated");
		assert.deepEqual(await igdbState(game.id), {
			score: 92.35,
			externalId: "1113",
			attempt: null
		});
	});

	void it("answers failed SOURCE_UNAVAILABLE when no IGDB source is registered", async () => {
		const game = await createCatalogGame("Hades");
		registerFakes({ metacritic: metacriticPages([]) });

		const response = await refresh(game.id, ["metacritic", "igdb"]);

		assert.deepEqual(response.body.data.results, [
			{
				source: "metacritic",
				status: "not_found",
				errorCode: null
			},
			failedWith("SOURCE_UNAVAILABLE")
		]);
		assert.equal((await igdbState(game.id)).attempt, null);
	});

	void it("answers the deadline and saves nothing when IGDB is slower than the refresh", async () => {
		registerExternalDataRefreshTimer({ deadlineMs: 100 });
		const game = await createCatalogGame("Hades", { code: "x" });
		registerIgdbOnly(
			fakeIgdb({ search: () => delay(500).then(() => [hades()]) })
		);

		const response = await refresh(game.id, ["igdb"]);

		assert.deepEqual(response.body.data.results, [
			failedWith(EXTERNAL_DATA_DEADLINE_EXCEEDED)
		]);
		await delay(600);
		assert.deepEqual(await igdbState(game.id), {
			score: null,
			externalId: null,
			attempt: null
		});
	});

	void it("answers the deadline when it expires while waiting for the IGDB turn", async () => {
		registerExternalDataRefreshTimer({ deadlineMs: 100 });
		registerIgdbRequestPacer(createRequestPacer(5_000));
		const game = await createCatalogGame("Hades", { code: "hades" });
		const igdb = igdbGames([]);
		registerIgdbOnly(igdb);

		const response = await refresh(game.id, ["igdb"]);

		assert.deepEqual(response.body.data.results, [
			failedWith(EXTERNAL_DATA_DEADLINE_EXCEEDED)
		]);
		assert.deepEqual(igdb.calls, ["slug:hades"]);
	});
});

void describe("POST /games/:id/external-data/refresh — concurrent IGDB refreshes", () => {
	void it("leaves one id and one score when two refreshes of the same game race", async () => {
		const game = await createCatalogGame("Hades", { code: "x" });
		const gate = deferred<IgdbGame[]>();
		registerIgdbOnly(fakeIgdb({ search: () => gate.promise }));

		const pending = Promise.all([
			refresh(game.id, ["igdb"]),
			refresh(game.id, ["igdb"])
		]);
		await delay(50);
		gate.resolve([hades()]);
		const responses = await pending;

		for (const response of responses) {
			assert.equal(response.status, 200);
			assert.equal(response.body.data.results[0].status, "updated");
		}
		assert.equal(
			await GameExternal.count({
				where: { gameId: game.id, source: "igdb" }
			}),
			1
		);
		assert.equal(
			await GameScore.count({ where: { gameId: game.id, source: "igdb" } }),
			1
		);
	});
});

async function finishedJob(jobId: string) {
	const deadline = Date.now() + JOB_TIMEOUT_MS;
	for (;;) {
		const job = await Job.findByPk(jobId);
		assert.ok(job);
		if (job.status !== "running") return job;
		assert.ok(Date.now() < deadline, "the job never finished");
		await delay(JOB_POLL_INTERVAL_MS);
	}
}

function startJob() {
	return api()
		.post("/admin/jobs/populate-external-data")
		.set("Authorization", admin);
}

async function runJob() {
	const response = await startJob();
	assert.equal(response.status, 202);
	return finishedJob(response.body.data.job.id);
}

async function resetCatalog() {
	await Job.destroy({ where: {} });
	await ExternalDataAttempt.destroy({ where: {} });
	await GameExternal.destroy({ where: {} });
	await GameScore.destroy({ where: {} });
	await Game.destroy({ where: {} });
}

async function completeGame(title: string) {
	const game = await createCatalogGame(title);
	await createGameScore(game.id, "metacritic", 70);
	await createGameTime(game.id, "hltb", 10);
	return game;
}

void describe("POST /admin/jobs/populate-external-data — IGDB", () => {
	void it("asks IGDB only for the games without an IGDB score and reports its tally", async () => {
		const missingIgdb = await completeGame("Hades");
		const notOnIgdb = await completeGame("Celeste");
		const complete = await completeGame("Inside");
		await createGameScore(complete.id, "igdb", 81);
		const igdb = fakeIgdb({
			search: query => (query === "Hades" ? [hades()] : [])
		});
		registerFakes({
			metacritic: metacriticPages([]),
			hltb: hltbPages([]),
			igdb
		});

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Candidates: 2, Processed: 2, Metacritic scores updated: 0, HLTB durations updated: 0, IGDB scores updated: 1, Skipped complete: 1, Skipped recently attempted: 0. Metacritic not found: 0, ambiguous: 0, no data: 0, failed: 0. HLTB not found: 0, ambiguous: 0, no data: 0, failed: 0. IGDB not found: 1, ambiguous: 0, no data: 0, failed: 0"
		);
		assert.deepEqual(igdb.calls.sort(), [
			"search:Celeste",
			"search:Hades",
			`slug:${missingIgdb.code}`,
			`slug:${notOnIgdb.code}`
		].sort());
		assert.equal((await igdbState(missingIgdb.id)).score, 92.35);
		assert.equal((await igdbState(notOnIgdb.id)).attempt, "not_found");
	});

	void it("runs with Metacritic and HLTB when IGDB is not registered and leaves it out of the report", async () => {
		const complete = await completeGame("Inside");
		const missingScore = await createCatalogGame("Hades");
		await createGameTime(missingScore.id, "hltb", 10);
		const metacritic = metacriticPages([
			metacriticDetail({ slug: "hades", title: "Hades", metaScore: 93 })
		]);
		registerFakes({ metacritic, hltb: hltbPages([]) });

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			"Candidates: 1, Processed: 1, Metacritic scores updated: 1, HLTB durations updated: 0, Skipped complete: 1, Skipped recently attempted: 0. Metacritic not found: 0, ambiguous: 0, no data: 0, failed: 0. HLTB not found: 0, ambiguous: 0, no data: 0, failed: 0"
		);
		assert.deepEqual(metacritic.calls, ["hades"]);
		assert.equal((await igdbState(complete.id)).attempt, null);
		assert.equal(
			await ExternalDataAttempt.count({ where: { source: "igdb" } }),
			0
		);
	});

	for (const missing of [
		{ label: "Metacritic", fakes: () => ({ hltb: hltbPages([]) }) },
		{ label: "HLTB", fakes: () => ({ metacritic: metacriticPages([]) }) }
	])
		void it(`answers 503 and starts no job when ${missing.label} is missing even with IGDB registered`, async () => {
			await createCatalogGame("Hades");
			registerFakes({ ...missing.fakes(), igdb: igdbGames([hades()]) });

			const response = await startJob();

			assert.equal(response.status, 503);
			assert.equal(
				response.body.type,
				"GAME_EXTERNAL_DATA_SOURCE_UNAVAILABLE"
			);
			assert.equal(await Job.count(), 0);
		});

	for (const code of ["IGDB_RATE_LIMITED", "IGDB_AUTH_ERROR", "IGDB_DISABLED"]) {
		void it(`stops at once on ${code} and keeps what was already saved`, async () => {
				await completeGame("Hades");
			await completeGame("Celeste");
			let calls = 0;
			registerFakes({
				metacritic: metacriticPages([]),
				hltb: hltbPages([]),
				igdb: fakeIgdb({
					search: query => {
						calls += 1;
						if (calls === 1)
							return query === "Hades"
								? [hades()]
								: [igdbGame({ id: 2, name: "Celeste", rating: 90 })];
						return providerError(code);
					}
				})
			});

			const job = await runJob();

			assert.equal(job.status, "failed");
			assert.match(job.result ?? "", new RegExp(`Stopped: ${code}$`));
			assert.match(job.result ?? "", /Processed: 2/);
			assert.match(job.result ?? "", /IGDB scores updated: 1/);
			const saved = await GameScore.count({ where: { source: "igdb" } });
			assert.equal(saved, 1);
			assert.equal(
				await ExternalDataAttempt.count({ where: { source: "igdb" } }),
				0
			);
		});
	}

	void it("stops after three IGDB request errors in a row", async () => {
		for (const title of ["Alpha", "Beta", "Gamma", "Delta"])
			await completeGame(title);
		registerFakes({
			metacritic: metacriticPages([]),
			hltb: hltbPages([]),
			igdb: fakeIgdb({ search: () => providerError("IGDB_REQUEST_ERROR") })
		});

		const job = await runJob();

		assert.equal(job.status, "failed");
		assert.match(
			job.result ?? "",
			/Processed: 3, .*IGDB not found: 0, ambiguous: 0, no data: 0, failed: 3\. Stopped: IGDB_REQUEST_ERROR \(3 failures in a row\)$/
		);
	});

	void it("keeps at least the IGDB interval between two IGDB requests", async () => {
		for (const title of ["Alpha", "Beta", "Gamma"]) await completeGame(title);
		registerIgdbRequestPacer();
		const startedAt: number[] = [];
		const igdb = fakeIgdb({
			bySlug: () => {
				startedAt.push(Date.now());
				return undefined;
			},
			search: () => {
				startedAt.push(Date.now());
				return [];
			}
		});
		registerFakes({
			metacritic: metacriticPages([]),
			hltb: hltbPages([]),
			igdb
		});

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(startedAt.length, 6);
		for (let index = 1; index < startedAt.length; index++)
			assert.ok(
				startedAt[index]! - startedAt[index - 1]! >= 250,
				`requests ${index - 1} and ${index} were ${startedAt[index]! - startedAt[index - 1]!} ms apart`
			);
	});
});

void describe("import enrichment queue — IGDB", () => {
	void it("fills the IGDB score of an imported game", async () => {
		const game = await completeGame("Hades");
		registerFakes({
			metacritic: metacriticPages([]),
			hltb: hltbPages([]),
			igdb: fakeIgdb({ search: () => [hades()] })
		});

		enqueueImportedGames([game.id, game.id]);

		await eventually(async () =>
			assert.equal((await igdbState(game.id)).score, 92.35)
		);
		await whenImportEnrichmentIdle();
	});

	void it("enriches with IGDB even when it is the only registered source", async () => {
		const game = await createCatalogGame("Hades", { code: "x" });
		const igdb = fakeIgdb({ search: () => [hades()] });
		registerIgdbOnly(igdb);

		enqueueImportedGames([game.id]);
		await whenImportEnrichmentIdle();

		assert.equal((await igdbState(game.id)).score, 92.35);
		assert.deepEqual(igdb.calls, ["slug:x", "search:Hades"]);
	});

	void it("does not ask anyone for a game that only lacks IGDB when IGDB is not registered", async () => {
		const game = await completeGame("Hades");
		const metacritic = metacriticPages([]);
		const hltb = hltbPages([]);
		registerFakes({ metacritic, hltb });

		enqueueImportedGames([game.id]);
		await whenImportEnrichmentIdle();

		assert.deepEqual(metacritic.calls, []);
		assert.deepEqual(hltb.calls, []);
		assert.equal(await ExternalDataAttempt.count(), 0);
	});

	void it("pauses the queue and drops the rest when IGDB answers IGDB_RATE_LIMITED", async () => {
		const games = await Promise.all(
			["Alpha", "Beta", "Gamma"].map(title => completeGame(title))
		);
		const igdb = fakeIgdb({
			search: () => providerError("IGDB_RATE_LIMITED")
		});
		registerFakes({
			metacritic: metacriticPages([]),
			hltb: hltbPages([]),
			igdb
		});

		enqueueImportedGames(games.map(game => game.id));
		await whenImportEnrichmentIdle();

		assert.equal(isImportEnrichmentPaused(), true);
		assert.equal(igdb.calls.filter(call => call.startsWith("search")).length, 1);
		assert.equal(await ExternalDataAttempt.count(), 0);
	});
});
