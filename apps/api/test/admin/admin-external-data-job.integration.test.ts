import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { AuditLog } from "../../src/audit/audit.model";
import { GameExternal } from "../../src/game-external/game-external.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Game } from "../../src/games/game.model";
import { registerExternalDataSources } from "../../src/games/services/external-data-sources.service";
import { Job } from "../../src/jobs/job.model";
import {
	createCatalogGame,
	deferred,
	fakeHltb,
	fakeMetacritic,
	fakeWikidata,
	hltbCandidate,
	hltbDetail,
	hltbPages,
	linkExternal,
	metacriticDetail,
	metacriticPages,
	providerError,
	registerFakes,
	wikidataCandidates
} from "../games/external-data-fakes.helper";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createGameScore,
	createGameTime,
	createScoreSource
} from "../helpers/factories.helper";

const JOB_TIMEOUT_MS = 15_000;
const JOB_POLL_INTERVAL_MS = 25;

let authorization: string;

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic", scale: 100 });
	authorization = (await createUserWithSession("admin")).authorization;
});

beforeEach(async () => {
	await Job.destroy({ where: {} });
	await GameExternal.destroy({ where: {} });
	await GameScore.destroy({ where: {} });
	await GameTime.destroy({ where: {} });
	await Game.destroy({ where: {} });
});

afterEach(() => {
	registerExternalDataSources({});
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

function startJob(query: Record<string, string> = {}) {
	return api()
		.post("/admin/jobs/populate-external-data")
		.query(query)
		.set("Authorization", authorization);
}

async function runJob(query: Record<string, string> = {}) {
	const response = await startJob(query);
	assert.equal(response.status, 202);
	assert.equal(response.body.data.job.type, "populate_external_data");
	assert.equal(response.body.data.job.status, "running");
	return finishedJob(response.body.data.job.id);
}

function report(fields: {
	candidates: number;
	processed: number;
	mcUpdated?: number;
	hltbUpdated?: number;
	skipped?: number;
	mc?: [number, number, number, number];
	hltb?: [number, number, number, number];
}) {
	const [mcNotFound, mcAmbiguous, mcNoData, mcFailed] = fields.mc ?? [
		0, 0, 0, 0
	];
	const [hNotFound, hAmbiguous, hNoData, hFailed] = fields.hltb ?? [
		0, 0, 0, 0
	];
	return [
		`Candidates: ${fields.candidates}, Processed: ${fields.processed}, Metacritic scores updated: ${fields.mcUpdated ?? 0}, HLTB durations updated: ${fields.hltbUpdated ?? 0}, Skipped complete: ${fields.skipped ?? 0}`,
		`Metacritic not found: ${mcNotFound}, ambiguous: ${mcAmbiguous}, no data: ${mcNoData}, failed: ${mcFailed}`,
		`HLTB not found: ${hNotFound}, ambiguous: ${hAmbiguous}, no data: ${hNoData}, failed: ${hFailed}`
	].join(". ");
}

function scorePage(slug: string, title: string, metaScore: number) {
	return metacriticDetail({ slug, title, metaScore });
}

void describe("POST /admin/jobs/populate-external-data — selection", () => {
	void it("picks active games missing either value and asks each one only for what it lacks", async () => {
		const missingBoth = await createCatalogGame("Alpha");
		await linkExternal(missingBoth.id, "hltb", "a");
		const missingScore = await createCatalogGame("Bravo");
		await linkExternal(missingScore.id, "hltb", "b");
		await createGameTime(missingScore.id, "hltb", 10);
		const missingTime = await createCatalogGame("Charlie");
		await linkExternal(missingTime.id, "hltb", "c");
		await createGameScore(missingTime.id, "metacritic", 70);
		const complete = await createCatalogGame("Delta");
		await linkExternal(complete.id, "hltb", "d");
		await createGameScore(complete.id, "metacritic", 70);
		await createGameTime(complete.id, "hltb", 10);
		const inactive = await createCatalogGame("Echo", { isActive: false });
		await linkExternal(inactive.id, "hltb", "e");
		const metacritic = metacriticPages([
			scorePage("alpha", "Alpha", 81),
			scorePage("bravo", "Bravo", 82),
			scorePage("charlie", "Charlie", 83),
			scorePage("delta", "Delta", 84),
			scorePage("echo", "Echo", 85)
		]);
		const hltb = hltbPages(
			["a", "b", "c", "d", "e"].map(id =>
				hltbDetail({ id, mainStoryHours: 5 })
			)
		);
		registerFakes({ metacritic, hltb });

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			report({
				candidates: 3,
				processed: 3,
				mcUpdated: 2,
				hltbUpdated: 2,
				skipped: 1
			})
		);
		assert.deepEqual(metacritic.calls, ["alpha", "bravo"]);
		assert.deepEqual(hltb.calls, ["a", "c"]);
		assert.equal(
			(await GameTime.findOne({ where: { gameId: missingScore.id } }))
				?.duration,
			10
		);
		assert.equal(
			(await GameScore.findOne({ where: { gameId: missingTime.id } }))
				?.score,
			70
		);
		assert.equal(
			await GameScore.count({ where: { gameId: inactive.id } }),
			0
		);
	});

	void it("keeps a game with an external id but no value among the candidates", async () => {
		const game = await createCatalogGame("Alpha");
		await linkExternal(game.id, "metacritic", "alpha-pc");
		await createGameTime(game.id, "hltb", 10);
		const metacritic = metacriticPages([
			scorePage("alpha-pc", "Alpha", 90)
		]);
		registerFakes({ metacritic, hltb: hltbPages([]) });

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.deepEqual(metacritic.calls, ["alpha-pc"]);
		assert.equal(
			(await GameScore.findOne({ where: { gameId: game.id } }))?.score,
			90
		);
	});

	void it("processes at most the limit while reporting every candidate", async () => {
		await createCatalogGame("Alpha");
		await createCatalogGame("Bravo");
		await createCatalogGame("Charlie");
		const metacritic = metacriticPages([
			scorePage("alpha", "Alpha", 81),
			scorePage("bravo", "Bravo", 82),
			scorePage("charlie", "Charlie", 83)
		]);
		registerFakes({ metacritic, hltb: hltbPages([]) });

		const job = await runJob({ limit: "2" });

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			report({
				candidates: 3,
				processed: 2,
				mcUpdated: 2,
				hltb: [2, 0, 0, 0]
			})
		);
		assert.deepEqual(metacritic.calls, ["alpha", "bravo"]);
		assert.equal(await GameScore.count(), 2);
	});

	for (const limit of ["0", "-1", "abc", "1.5", ""]) {
		void it(`answers 422 for limit "${limit}" and starts no job`, async () => {
			registerFakes({
				metacritic: metacriticPages([]),
				hltb: hltbPages([])
			});

			const response = await startJob({ limit });

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			assert.equal(await Job.count(), 0);
		});
	}

	void it("answers 422 for an unknown query key", async () => {
		registerFakes({ metacritic: metacriticPages([]), hltb: hltbPages([]) });

		const response = await startJob({ force: "true" });

		assert.equal(response.status, 422);
		assert.equal(await Job.count(), 0);
	});

	void it("completes with zeros on an empty catalog", async () => {
		registerFakes({ metacritic: metacriticPages([]), hltb: hltbPages([]) });

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(job.result, report({ candidates: 0, processed: 0 }));
	});
});

void describe("POST /admin/jobs/populate-external-data — start", () => {
	for (const registered of [
		{ label: "Metacritic", fakes: { hltb: hltbPages([]) } },
		{ label: "HLTB", fakes: { metacritic: metacriticPages([]) } },
		{ label: "any source", fakes: {} }
	]) {
		void it(`answers 503 and starts no job when ${registered.label} is not registered`, async () => {
			await createCatalogGame("Alpha");
			registerFakes(registered.fakes);

			const response = await startJob();

			assert.equal(response.status, 503);
			assert.equal(
				response.body.type,
				"GAME_EXTERNAL_DATA_SOURCE_UNAVAILABLE"
			);
			assert.equal(await Job.count(), 0);
		});
	}

	void it("records the start in the audit log", async () => {
		registerFakes({ metacritic: metacriticPages([]), hltb: hltbPages([]) });

		const response = await startJob();
		const jobId = response.body.data.job.id as string;
		await finishedJob(jobId);

		await eventually(async () => {
			const entry = await AuditLog.findOne({
				where: { action: "job_started", targetId: jobId }
			});
			assert.ok(entry);
			assert.equal(entry.targetType, "job");
		});
	});

	void it("does not start a second job while one is running, even on a double click", async () => {
		await createCatalogGame("Alpha");
		const gate = deferred<ReturnType<typeof metacriticDetail>>();
		registerFakes({
			metacritic: fakeMetacritic(() => gate.promise),
			hltb: hltbPages([])
		});

		const first = await startJob();
		const [second, third] = await Promise.all([startJob(), startJob()]);

		assert.equal(first.status, 202);
		assert.equal(second.body.data.job.id, first.body.data.job.id);
		assert.equal(third.body.data.job.id, first.body.data.job.id);
		assert.equal(
			await Job.count({ where: { type: "populate_external_data" } }),
			1
		);

		gate.resolve(scorePage("alpha", "Alpha", 80));
		const job = await finishedJob(first.body.data.job.id);
		assert.equal(job.status, "completed");
	});
});

void describe("POST /admin/jobs/populate-external-data — outcomes", () => {
	void it("keeps going after not found, ambiguous and no data and counts each one", async () => {
		await createCatalogGame("Unknown Game");
		await createCatalogGame("Doom", { releaseAt: "1993-12-10" });
		const noData = await createCatalogGame("Celeste");
		await linkExternal(noData.id, "hltb", "celeste");
		const good = await createCatalogGame("Hades");
		await linkExternal(good.id, "hltb", "hades");
		const metacritic = metacriticPages([
			metacriticDetail({
				slug: "doom",
				title: "DOOM",
				releaseYear: 2016,
				metaScore: 85
			}),
			metacriticDetail({ slug: "celeste", title: "Celeste" }),
			scorePage("hades", "Hades", 93)
		]);
		const hltb = hltbPages([
			hltbDetail({ id: "celeste", mainStoryHours: null }),
			hltbDetail({ id: "hades", mainStoryHours: 21.5 })
		]);
		registerFakes({ metacritic, hltb });

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			report({
				candidates: 4,
				processed: 4,
				mcUpdated: 1,
				hltbUpdated: 1,
				mc: [1, 1, 1, 0],
				hltb: [2, 0, 1, 0]
			})
		);
		assert.equal(
			(await GameScore.findOne({ where: { gameId: good.id } }))?.score,
			93
		);
		assert.equal(
			(await GameTime.findOne({ where: { gameId: good.id } }))?.duration,
			21.5
		);
		assert.deepEqual(hltb.calls, ["celeste", "hades"]);
	});

	for (const suffix of ["RATE_LIMITED", "BLOCKED", "PARSE_ERROR"]) {
		void it(`stops at once on METACRITIC_${suffix} and keeps what was already saved`, async () => {
			await createCatalogGame("Alpha");
			const failing = await createCatalogGame("Bravo");
			await createCatalogGame("Charlie");
			const metacritic = fakeMetacritic(slug => {
				if (slug === "alpha") return scorePage("alpha", "Alpha", 80);
				if (slug === "bravo")
					return providerError(`METACRITIC_${suffix}`);
				return scorePage("charlie", "Charlie", 70);
			});
			registerFakes({ metacritic, hltb: hltbPages([]) });

			const job = await runJob();

			assert.equal(job.status, "failed");
			assert.ok(job.completedAt);
			assert.equal(
				job.result,
				`${report({
					candidates: 3,
					processed: 2,
					mcUpdated: 1,
					mc: [0, 0, 0, 1],
					hltb: [2, 0, 0, 0]
				})}. Stopped: METACRITIC_${suffix}`
			);
			assert.deepEqual(metacritic.calls, ["alpha", "bravo"]);
			assert.equal(await GameScore.count(), 1);
			assert.equal(
				await GameScore.count({ where: { gameId: failing.id } }),
				0
			);
		});
	}

	void it("stops on HLTB_BLOCKED after saving the Metacritic score of the same game", async () => {
		const game = await createCatalogGame("Alpha");
		await linkExternal(game.id, "hltb", "a");
		await createCatalogGame("Bravo");
		const metacritic = metacriticPages([
			scorePage("alpha", "Alpha", 80),
			scorePage("bravo", "Bravo", 70)
		]);
		registerFakes({
			metacritic,
			hltb: fakeHltb(() => providerError("HLTB_BLOCKED"))
		});

		const job = await runJob();

		assert.equal(job.status, "failed");
		assert.match(job.result ?? "", /Stopped: HLTB_BLOCKED$/);
		assert.deepEqual(metacritic.calls, ["alpha"]);
		assert.equal(
			(await GameScore.findOne({ where: { gameId: game.id } }))?.score,
			80
		);
	});

	void it("keeps going after an isolated timeout or request error", async () => {
		await createCatalogGame("Alpha");
		await createCatalogGame("Bravo");
		await createCatalogGame("Charlie");
		const metacritic = fakeMetacritic(slug => {
			if (slug === "alpha") return providerError("METACRITIC_TIMEOUT");
			if (slug === "bravo")
				return providerError("METACRITIC_REQUEST_ERROR");
			return scorePage("charlie", "Charlie", 70);
		});
		registerFakes({ metacritic, hltb: hltbPages([]) });

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			report({
				candidates: 3,
				processed: 3,
				mcUpdated: 1,
				mc: [0, 0, 0, 2],
				hltb: [3, 0, 0, 0]
			})
		);
	});

	void it("stops after three transient failures in a row from the same source", async () => {
		for (const title of ["Alpha", "Bravo", "Charlie", "Delta"])
			await createCatalogGame(title);
		const metacritic = fakeMetacritic(() =>
			providerError("METACRITIC_TIMEOUT")
		);
		registerFakes({ metacritic, hltb: hltbPages([]) });

		const job = await runJob();

		assert.equal(job.status, "failed");
		assert.equal(
			job.result,
			`${report({
				candidates: 4,
				processed: 3,
				mc: [0, 0, 0, 3],
				hltb: [3, 0, 0, 0]
			})}. Stopped: METACRITIC_TIMEOUT (3 failures in a row)`
		);
		assert.equal(metacritic.calls.length, 3);
	});

	void it("resets the transient failure streak after a good answer", async () => {
		for (const title of ["Alpha", "Bravo", "Charlie", "Delta", "Echo"])
			await createCatalogGame(title);
		const metacritic = fakeMetacritic(slug =>
			slug === "charlie"
				? scorePage("charlie", "Charlie", 70)
				: providerError("METACRITIC_TIMEOUT")
		);
		registerFakes({ metacritic, hltb: hltbPages([]) });

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(metacritic.calls.length, 5);
	});

	void it("fails the job with the reason when saving breaks", async () => {
		const game = await createCatalogGame("Alpha");
		registerFakes({
			metacritic: metacriticPages([scorePage("alpha", "Alpha", 80)]),
			hltb: hltbPages([])
		});
		await GameScore.sequelize!.query(
			`UPDATE "ScoreSources" SET code = 'metacritic-renamed' WHERE code = 'metacritic'`
		);

		try {
			const job = await runJob();

			assert.equal(job.status, "failed");
			assert.match(
				job.result ?? "",
				/^Candidates: 1, Processed: 0, .*\. Stopped: /
			);
			assert.equal(
				await GameScore.count({ where: { gameId: game.id } }),
				0
			);
		} finally {
			await GameScore.sequelize!.query(
				`UPDATE "ScoreSources" SET code = 'metacritic' WHERE code = 'metacritic-renamed'`
			);
		}
	});
});

void describe("POST /admin/jobs/populate-external-data — cancellation", () => {
	void it("stops before the next game once cancelled and keeps it cancelled", async () => {
		await createCatalogGame("Alpha");
		await createCatalogGame("Bravo");
		const gate = deferred<ReturnType<typeof metacriticDetail>>();
		const metacritic = fakeMetacritic(slug =>
			slug === "alpha" ? gate.promise : scorePage("bravo", "Bravo", 70)
		);
		registerFakes({ metacritic, hltb: hltbPages([]) });

		const started = await startJob();
		const jobId = started.body.data.job.id as string;
		await eventually(async () =>
			assert.deepEqual(metacritic.calls, ["alpha"])
		);

		const cancel = await api()
			.delete(`/admin/jobs/${jobId}`)
			.set("Authorization", authorization);
		assert.equal(cancel.status, 204);
		gate.resolve(scorePage("alpha", "Alpha", 80));

		const job = await eventually(async () => {
			const current = await Job.findByPk(jobId);
			assert.ok(current?.result);
			return current;
		});
		assert.equal(job.status, "cancelled");
		assert.equal(
			job.result,
			`Cancelled. ${report({
				candidates: 2,
				processed: 1,
				mcUpdated: 1,
				hltb: [1, 0, 0, 0]
			})}`
		);
		assert.deepEqual(metacritic.calls, ["alpha"]);
	});
});

void describe("POST /admin/jobs/populate-external-data — HLTB id through Wikidata", () => {
	void it("resolves and stores the HLTB id of games that have none", async () => {
		const game = await createCatalogGame("Alpha", { code: "alpha-slug" });
		const wikidata = wikidataCandidates([
			hltbCandidate({ hltbId: "11", rawgSlug: "alpha-slug" })
		]);
		registerFakes({
			metacritic: metacriticPages([scorePage("alpha", "Alpha", 80)]),
			hltb: hltbPages([hltbDetail({ id: "11", mainStoryHours: 12 })]),
			wikidata
		});

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			report({
				candidates: 1,
				processed: 1,
				mcUpdated: 1,
				hltbUpdated: 1
			})
		);
		assert.deepEqual(wikidata.calls, [
			{ rawgSlug: "alpha-slug", title: "Alpha" }
		]);
		assert.equal(
			(
				await GameExternal.findOne({
					where: { gameId: game.id, source: "hltb" }
				})
			)?.externalId,
			"11"
		);
	});

	for (const suffix of ["BLOCKED", "RATE_LIMITED", "PARSE_ERROR"]) {
		void it(`stops at once on WIKIDATA_${suffix} after saving the Metacritic score of the same game`, async () => {
			const game = await createCatalogGame("Alpha");
			await createCatalogGame("Bravo");
			const metacritic = metacriticPages([
				scorePage("alpha", "Alpha", 80),
				scorePage("bravo", "Bravo", 70)
			]);
			const wikidata = fakeWikidata(() =>
				providerError(`WIKIDATA_${suffix}`)
			);
			const hltb = hltbPages([]);
			registerFakes({ metacritic, hltb, wikidata });

			const job = await runJob();

			assert.equal(job.status, "failed");
			assert.equal(
				job.result,
				`${report({
					candidates: 2,
					processed: 1,
					mcUpdated: 1,
					hltb: [0, 0, 0, 1]
				})}. Stopped: WIKIDATA_${suffix}`
			);
			assert.deepEqual(metacritic.calls, ["alpha"]);
			assert.equal(wikidata.calls.length, 1);
			assert.equal(hltb.calls.length, 0);
			assert.equal(
				(await GameScore.findOne({ where: { gameId: game.id } }))
					?.score,
				80
			);
		});
	}

	void it("counts Wikidata timeouts and request errors in the HLTB transient streak", async () => {
		for (const title of ["Alpha", "Bravo", "Charlie", "Delta"])
			await createCatalogGame(title);
		const wikidata = fakeWikidata(({ title }) =>
			providerError(
				title === "Bravo"
					? "WIKIDATA_REQUEST_ERROR"
					: "WIKIDATA_TIMEOUT"
			)
		);
		registerFakes({
			metacritic: metacriticPages([]),
			hltb: hltbPages([]),
			wikidata
		});

		const job = await runJob();

		assert.equal(job.status, "failed");
		assert.equal(
			job.result,
			`${report({
				candidates: 4,
				processed: 3,
				mc: [3, 0, 0, 0],
				hltb: [0, 0, 0, 3]
			})}. Stopped: WIKIDATA_TIMEOUT (3 failures in a row)`
		);
		assert.equal(wikidata.calls.length, 3);
	});

	void it("keeps going after an isolated Wikidata timeout", async () => {
		await createCatalogGame("Alpha");
		await createCatalogGame("Bravo", { code: "bravo-slug" });
		const wikidata = fakeWikidata(({ title }) =>
			title === "Alpha"
				? providerError("WIKIDATA_TIMEOUT")
				: [hltbCandidate({ hltbId: "22", rawgSlug: "bravo-slug" })]
		);
		registerFakes({
			metacritic: metacriticPages([]),
			hltb: hltbPages([hltbDetail({ id: "22", mainStoryHours: 5 })]),
			wikidata
		});

		const job = await runJob();

		assert.equal(job.status, "completed");
		assert.equal(
			job.result,
			report({
				candidates: 2,
				processed: 2,
				hltbUpdated: 1,
				mc: [2, 0, 0, 0],
				hltb: [0, 0, 0, 1]
			})
		);
	});
});
