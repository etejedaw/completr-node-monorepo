import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { GameExternal } from "../../src/game-external/game-external.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { registerExternalDataSources } from "../../src/games/services/external-data-sources.service";
import { type UserRole } from "../../src/users/user-role.type";
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
	fakeHltb,
	fakeMetacritic,
	hltbDetail,
	hltbPages,
	linkExternal,
	metacriticDetail,
	metacriticPages,
	providerError,
	registerFakes
} from "./external-data-fakes.helper";

let moderator: string;

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic", scale: 100 });
	moderator = (await createUserWithSession("moderator")).authorization;
});

afterEach(() => {
	registerExternalDataSources({});
});

function refresh(gameId: string, body: unknown, authorization = moderator) {
	return api()
		.post(`/games/${gameId}/external-data/refresh`)
		.set("Authorization", authorization)
		.send(body as object);
}

function metacriticScoreOf(gameId: string) {
	return GameScore.findOne({ where: { gameId, source: "metacritic" } });
}

function hltbTimeOf(gameId: string) {
	return GameTime.findOne({ where: { gameId, source: "hltb" } });
}

function externalOf(gameId: string, source: "metacritic" | "hltb") {
	return GameExternal.findOne({ where: { gameId, source } });
}

async function storedState(gameId: string) {
	const [score, time, externals] = await Promise.all([
		metacriticScoreOf(gameId),
		hltbTimeOf(gameId),
		GameExternal.findAll({ where: { gameId }, order: [["source", "ASC"]] })
	]);
	return {
		score: score?.score ?? null,
		time: time?.duration ?? null,
		externals: externals.map(e => `${e.source}:${e.externalId}`)
	};
}

void describe("POST /games/:id/external-data/refresh — access", () => {
	beforeEach(() => {
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "hades",
					title: "Hades",
					metaScore: 93
				})
			]),
			hltb: hltbPages([])
		});
	});

	void it("rejects a caller without Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const game = await createCatalogGame("Hades");

		const response = await api()
			.post(`/games/${game.id}/external-data/refresh`)
			.send({ sources: ["metacritic"] });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
		assert.equal(await metacriticScoreOf(game.id), null);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const game = await createCatalogGame("Hades");

		const response = await refresh(
			game.id,
			{ sources: ["metacritic"] },
			"Bearer expired.token.value"
		);

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
		assert.equal(await metacriticScoreOf(game.id), null);
	});

	for (const role of ["user", "premium"] as UserRole[]) {
		void it(`rejects a ${role} with 403`, async () => {
			const game = await createCatalogGame("Hades");
			const account = await createUserWithSession(role);

			const response = await refresh(
				game.id,
				{ sources: ["metacritic"] },
				account.authorization
			);

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "AUTH_FORBIDDEN");
			assert.equal(await metacriticScoreOf(game.id), null);
		});
	}

	for (const role of ["moderator", "admin"] as UserRole[]) {
		void it(`lets a ${role} refresh and records the audit entry`, async () => {
			const game = await createCatalogGame("Hades");
			const account = await createUserWithSession(role);

			const response = await refresh(
				game.id,
				{ sources: ["metacritic"] },
				account.authorization
			);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.game.id, game.id);
			const entry = await eventually(async () => {
				const found = await AuditLog.findOne({
					where: {
						action: "game_external_data_refreshed",
						targetId: game.id
					}
				});
				assert.ok(found);
				return found;
			});
			assert.equal(entry.userId, account.user.id);
			assert.equal(entry.targetType, "game");
		});
	}
});

void describe("POST /games/:id/external-data/refresh — validation", () => {
	const invalidBodies: [string, unknown][] = [
		["an empty source list", { sources: [] }],
		["a repeated source", { sources: ["hltb", "hltb"] }],
		["an unknown source", { sources: ["steam"] }],
		["a source with different case", { sources: ["Metacritic"] }],
		["sources as a string", { sources: "metacritic" }],
		["a missing sources key", {}],
		["an extra key", { sources: ["hltb"], force: true }],
		["null sources", { sources: null }],
		["a numeric source", { sources: [1] }],
		["a plain array body", ["metacritic"]]
	];

	for (const [label, body] of invalidBodies) {
		void it(`answers 422 for ${label} and calls no source`, async () => {
			const game = await createCatalogGame("Hades");
			const metacritic = metacriticPages([]);
			const hltb = hltbPages([]);
			registerFakes({ metacritic, hltb });

			const response = await refresh(game.id, body);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			assert.equal(metacritic.calls.length, 0);
			assert.equal(hltb.calls.length, 0);
		});
	}

	void it("answers 400 COMMON_INVALID_JSON for a malformed JSON body", async () => {
		const game = await createCatalogGame("Hades");
		const metacritic = metacriticPages([]);
		const hltb = hltbPages([]);
		registerFakes({ metacritic, hltb });

		const response = await api()
			.post(`/games/${game.id}/external-data/refresh`)
			.set("Authorization", moderator)
			.set("Content-Type", "application/json")
			.send('{"sources": [');

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "COMMON_INVALID_JSON");
		assert.equal(metacritic.calls.length, 0);
		assert.equal(hltb.calls.length, 0);
	});

	void it("answers 422 for an id that is not a UUID", async () => {
		const response = await refresh("not-a-uuid", { sources: ["hltb"] });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("answers 404 for an unknown game", async () => {
		const metacritic = metacriticPages([]);
		registerFakes({ metacritic });

		const response = await refresh(randomUUID(), {
			sources: ["metacritic"]
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
		assert.equal(metacritic.calls.length, 0);
	});

	void it("answers 404 for an inactive game, calls no source and records no audit", async () => {
		const game = await createCatalogGame("Hades", { isActive: false });
		const metacritic = metacriticPages([
			metacriticDetail({ slug: "hades", title: "Hades", metaScore: 93 })
		]);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
		assert.equal(metacritic.calls.length, 0);
		assert.equal(await metacriticScoreOf(game.id), null);
		assert.equal(await AuditLog.count({ where: { targetId: game.id } }), 0);
	});
});

void describe("POST /games/:id/external-data/refresh — sources", () => {
	void it("runs only the requested source", async () => {
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "hltb", "1234");
		const metacritic = metacriticPages([
			metacriticDetail({ slug: "hades", title: "Hades", metaScore: 93 })
		]);
		const hltb = hltbPages([
			hltbDetail({ id: "1234", mainStoryHours: 21.5 })
		]);
		registerFakes({ metacritic, hltb });

		const response = await refresh(game.id, { sources: ["hltb"] });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{
				source: "hltb",
				status: "updated",
				duration: 21.5,
				errorCode: null
			}
		]);
		assert.equal(metacritic.calls.length, 0);
		assert.deepEqual(hltb.calls, ["1234"]);
		assert.equal(await metacriticScoreOf(game.id), null);
		assert.equal((await hltbTimeOf(game.id))?.duration, 21.5);
	});

	void it("answers the results in the order they were requested and returns the reloaded game", async () => {
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "hltb", "1234");
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "hades",
					title: "Hades",
					metaScore: 93,
					userScore: 9.1
				})
			]),
			hltb: hltbPages([hltbDetail({ id: "1234", mainStoryHours: 21.5 })])
		});

		const response = await refresh(game.id, {
			sources: ["hltb", "metacritic"]
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{
				source: "hltb",
				status: "updated",
				duration: 21.5,
				errorCode: null
			},
			{
				source: "metacritic",
				status: "updated",
				score: 93,
				metaScore: 93,
				userScore: 9.1,
				errorCode: null
			}
		]);
		const { game: served } = response.body.data;
		assert.deepEqual(
			served.scores.map((s: { source: string; score: number }) => [
				s.source,
				s.score
			]),
			[["metacritic", 93]]
		);
		assert.deepEqual(
			served.times.map((t: { source: string; duration: number }) => [
				t.source,
				t.duration
			]),
			[["hltb", 21.5]]
		);
		assert.equal(served.title, "Hades");
	});

	void it("refreshes values that already exist", async () => {
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "metacritic", "hades");
		await linkExternal(game.id, "hltb", "1234");
		await createGameScore(game.id, "metacritic", 50);
		await createGameTime(game.id, "hltb", 99);
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "hades",
					title: "Hades",
					metaScore: 93
				})
			]),
			hltb: hltbPages([hltbDetail({ id: "1234", mainStoryHours: 21.5 })])
		});

		const response = await refresh(game.id, {
			sources: ["metacritic", "hltb"]
		});

		assert.equal(response.status, 200);
		assert.deepEqual(await storedState(game.id), {
			score: 93,
			time: 21.5,
			externals: ["hltb:1234", "metacritic:hades"]
		});
		assert.equal(await GameScore.count({ where: { gameId: game.id } }), 1);
	});

	void it("updates one source even when the other fails", async () => {
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "hltb", "1234");
		await createGameScore(game.id, "metacritic", 50);
		registerFakes({
			metacritic: fakeMetacritic(() =>
				providerError("METACRITIC_BLOCKED")
			),
			hltb: hltbPages([hltbDetail({ id: "1234", mainStoryHours: 21.5 })])
		});

		const response = await refresh(game.id, {
			sources: ["metacritic", "hltb"]
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{
				source: "metacritic",
				status: "failed",
				errorCode: "METACRITIC_BLOCKED"
			},
			{
				source: "hltb",
				status: "updated",
				duration: 21.5,
				errorCode: null
			}
		]);
		assert.deepEqual(await storedState(game.id), {
			score: 50,
			time: 21.5,
			externals: ["hltb:1234"]
		});
	});

	void it("answers failed SOURCE_UNAVAILABLE for a source that has no registered scraper", async () => {
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "hltb", "1234");
		const hltb = hltbPages([hltbDetail({ id: "1234", mainStoryHours: 8 })]);
		registerFakes({ hltb });

		const response = await refresh(game.id, {
			sources: ["metacritic", "hltb"]
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{
				source: "metacritic",
				status: "failed",
				errorCode: "SOURCE_UNAVAILABLE"
			},
			{ source: "hltb", status: "updated", duration: 8, errorCode: null }
		]);
	});
});

void describe("POST /games/:id/external-data/refresh — Metacritic score", () => {
	const cases: {
		label: string;
		metaScore: number | null;
		userScore: number | null;
		stored: number;
	}[] = [
		{
			label: "the metascore when it is higher",
			metaScore: 92,
			userScore: 8.1,
			stored: 92
		},
		{
			label: "the user score ×10 when it is higher",
			metaScore: 70,
			userScore: 8.8,
			stored: 88
		},
		{
			label: "the shared value on a tie",
			metaScore: 85,
			userScore: 8.5,
			stored: 85
		},
		{
			label: "the metascore when it is the only one",
			metaScore: 77,
			userScore: null,
			stored: 77
		},
		{
			label: "the user score ×10 when it is the only one",
			metaScore: null,
			userScore: 6.4,
			stored: 64
		}
	];

	for (const { label, metaScore, userScore, stored } of cases) {
		void it(`stores ${label}`, async () => {
			const game = await createCatalogGame("Celeste");
			await linkExternal(game.id, "metacritic", "celeste");
			registerFakes({
				metacritic: metacriticPages([
					metacriticDetail({
						slug: "celeste",
						title: "Celeste",
						metaScore,
						userScore
					})
				])
			});

			const response = await refresh(game.id, {
				sources: ["metacritic"]
			});

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.results, [
				{
					source: "metacritic",
					status: "updated",
					score: stored,
					metaScore,
					userScore,
					errorCode: null
				}
			]);
			assert.equal((await metacriticScoreOf(game.id))?.score, stored);
		});
	}

	void it("answers no_data and keeps the previous score when neither score exists", async () => {
		const game = await createCatalogGame("Celeste");
		await linkExternal(game.id, "metacritic", "celeste");
		await createGameScore(game.id, "metacritic", 40);
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({ slug: "celeste", title: "Celeste" })
			])
		});

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{
				source: "metacritic",
				status: "no_data",
				metaScore: null,
				userScore: null,
				errorCode: null
			}
		]);
		assert.equal((await metacriticScoreOf(game.id))?.score, 40);
	});
});

void describe("POST /games/:id/external-data/refresh — HowLongToBeat", () => {
	void it("answers not_found without calling the source when the game has no HLTB id", async () => {
		const game = await createCatalogGame("Celeste");
		const hltb = hltbPages([hltbDetail({ id: "1", mainStoryHours: 8 })]);
		registerFakes({ hltb });

		const response = await refresh(game.id, { sources: ["hltb"] });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{ source: "hltb", status: "not_found", errorCode: null }
		]);
		assert.equal(hltb.calls.length, 0);
		assert.equal(await hltbTimeOf(game.id), null);
	});

	for (const mainStoryHours of [null, 0, -3]) {
		void it(`answers no_data for Main Story ${mainStoryHours} without falling back to other durations`, async () => {
			const game = await createCatalogGame("Celeste");
			await linkExternal(game.id, "hltb", "555");
			await createGameTime(game.id, "hltb", 12);
			registerFakes({
				hltb: hltbPages([
					hltbDetail({
						id: "555",
						mainStoryHours,
						mainExtrasHours: 20,
						completionistHours: 40
					})
				])
			});

			const response = await refresh(game.id, { sources: ["hltb"] });

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.results, [
				{ source: "hltb", status: "no_data", errorCode: null }
			]);
			assert.equal((await hltbTimeOf(game.id))?.duration, 12);
		});
	}

	void it("answers not_found and keeps the stored id and duration when HLTB no longer knows the id", async () => {
		const game = await createCatalogGame("Celeste");
		await linkExternal(game.id, "hltb", "gone");
		await createGameTime(game.id, "hltb", 12);
		registerFakes({ hltb: hltbPages([]) });

		const response = await refresh(game.id, { sources: ["hltb"] });

		assert.deepEqual(response.body.data.results, [
			{ source: "hltb", status: "not_found", errorCode: null }
		]);
		assert.deepEqual(await storedState(game.id), {
			score: null,
			time: 12,
			externals: ["hltb:gone"]
		});
	});
});

void describe("POST /games/:id/external-data/refresh — Metacritic matching", () => {
	void it("derives the slug from the title and stores the id only after the match", async () => {
		const game = await createCatalogGame("Marvel’s Spider-Man", {
			releaseAt: "2018-09-07"
		});
		const metacritic = metacriticPages([
			metacriticDetail({
				slug: "marvels-spider-man",
				title: "Marvel's Spider-Man",
				releaseYear: 2018,
				metaScore: 87
			})
		]);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.results[0].status, "updated");
		assert.deepEqual(metacritic.calls, ["marvels-spider-man"]);
		assert.equal(
			(await externalOf(game.id, "metacritic"))?.externalId,
			"marvels-spider-man"
		);
	});

	void it("answers not_found and stores nothing when the page title is another game", async () => {
		const game = await createCatalogGame("Doom");
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "doom",
					title: "Doom Eternal",
					metaScore: 88
				})
			])
		});

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.deepEqual(response.body.data.results, [
			{ source: "metacritic", status: "not_found", errorCode: null }
		]);
		assert.deepEqual(await storedState(game.id), {
			score: null,
			time: null,
			externals: []
		});
	});

	void it("answers ambiguous and stores nothing when the release years differ by more than one", async () => {
		const game = await createCatalogGame("Doom", {
			releaseAt: "1993-12-10"
		});
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "doom",
					title: "DOOM",
					releaseYear: 2016,
					metaScore: 85
				})
			])
		});

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.deepEqual(response.body.data.results, [
			{ source: "metacritic", status: "ambiguous", errorCode: null }
		]);
		assert.deepEqual(await storedState(game.id), {
			score: null,
			time: null,
			externals: []
		});
	});

	void it("accepts a release year one apart", async () => {
		const game = await createCatalogGame("Doom", {
			releaseAt: "2016-05-13"
		});
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "doom",
					title: "DOOM",
					releaseYear: 2017,
					metaScore: 85
				})
			])
		});

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.body.data.results[0].status, "updated");
		assert.equal(
			(await externalOf(game.id, "metacritic"))?.externalId,
			"doom"
		);
	});

	void it("tries the title with the variant first and falls back to the bare title", async () => {
		const game = await createCatalogGame("Persona 5", { variant: "Royal" });
		const metacritic = metacriticPages([
			metacriticDetail({
				slug: "persona-5",
				title: "Persona 5",
				metaScore: 93
			})
		]);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.body.data.results[0].status, "updated");
		assert.deepEqual(metacritic.calls, ["persona-5-royal", "persona-5"]);
		assert.equal(
			(await externalOf(game.id, "metacritic"))?.externalId,
			"persona-5"
		);
	});

	void it("stops at the variant page when it exists", async () => {
		const game = await createCatalogGame("Persona 5", { variant: "Royal" });
		const metacritic = metacriticPages([
			metacriticDetail({
				slug: "persona-5-royal",
				title: "Persona 5 Royal",
				metaScore: 95
			}),
			metacriticDetail({
				slug: "persona-5",
				title: "Persona 5",
				metaScore: 93
			})
		]);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.body.data.results[0].score, 95);
		assert.deepEqual(metacritic.calls, ["persona-5-royal"]);
		assert.equal(
			(await externalOf(game.id, "metacritic"))?.externalId,
			"persona-5-royal"
		);
	});

	void it("answers not_found after at most two requests when neither slug exists", async () => {
		const game = await createCatalogGame("Persona 5", { variant: "Royal" });
		const metacritic = metacriticPages([]);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.deepEqual(response.body.data.results, [
			{ source: "metacritic", status: "not_found", errorCode: null }
		]);
		assert.equal(metacritic.calls.length, 2);
		assert.equal(await externalOf(game.id, "metacritic"), null);
	});

	void it("answers not_found without calling Metacritic for a title that yields no slug", async () => {
		const game = await createCatalogGame("ゼルダの伝説");
		const metacritic = metacriticPages([]);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.body.data.results[0].status, "not_found");
		assert.equal(metacritic.calls.length, 0);
	});

	void it("reuses the stored id without deriving a slug nor checking the title", async () => {
		const game = await createCatalogGame("Some Local Name", {
			releaseAt: "1990-01-01"
		});
		await linkExternal(game.id, "metacritic", "the-real-slug");
		const metacritic = metacriticPages([
			metacriticDetail({
				slug: "the-real-slug",
				title: "Completely Different",
				releaseYear: 2020,
				metaScore: 71
			})
		]);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.body.data.results[0].status, "updated");
		assert.deepEqual(metacritic.calls, ["the-real-slug"]);
		assert.deepEqual(await storedState(game.id), {
			score: 71,
			time: null,
			externals: ["metacritic:the-real-slug"]
		});
	});

	void it("stores the id after a match even when the page has no score", async () => {
		const game = await createCatalogGame("Celeste");
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({ slug: "celeste", title: "Celeste" })
			])
		});

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.body.data.results[0].status, "no_data");
		assert.deepEqual(await storedState(game.id), {
			score: null,
			time: null,
			externals: ["metacritic:celeste"]
		});
	});
});

void describe("POST /games/:id/external-data/refresh — failures", () => {
	const failures = [
		"RATE_LIMITED",
		"BLOCKED",
		"PARSE_ERROR",
		"TIMEOUT",
		"REQUEST_ERROR",
		"UNHEARD_OF"
	];

	for (const suffix of failures) {
		void it(`answers failed ${suffix} for both sources and writes nothing`, async () => {
			const game = await createCatalogGame("Celeste");
			await linkExternal(game.id, "hltb", "777");
			await createGameScore(game.id, "metacritic", 40);
			await createGameTime(game.id, "hltb", 12);
			registerFakes({
				metacritic: fakeMetacritic(() =>
					providerError(`METACRITIC_${suffix}`)
				),
				hltb: fakeHltb(() => providerError(`HLTB_${suffix}`))
			});

			const response = await refresh(game.id, {
				sources: ["metacritic", "hltb"]
			});

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.results, [
				{
					source: "metacritic",
					status: "failed",
					errorCode: `METACRITIC_${suffix}`
				},
				{
					source: "hltb",
					status: "failed",
					errorCode: `HLTB_${suffix}`
				}
			]);
			assert.deepEqual(await storedState(game.id), {
				score: 40,
				time: 12,
				externals: ["hltb:777"]
			});
		});
	}

	void it("answers failed with a null code when a source throws something that is not a provider error", async () => {
		const game = await createCatalogGame("Celeste");
		registerFakes({
			metacritic: fakeMetacritic(() => new TypeError("boom"))
		});

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{ source: "metacritic", status: "failed", errorCode: null }
		]);
		assert.equal(await externalOf(game.id, "metacritic"), null);
	});

	void it("stops at the first non-404 failure while deriving slugs", async () => {
		const game = await createCatalogGame("Persona 5", { variant: "Royal" });
		const metacritic = fakeMetacritic(() =>
			providerError("METACRITIC_PARSE_ERROR")
		);
		registerFakes({ metacritic });

		const response = await refresh(game.id, { sources: ["metacritic"] });

		assert.equal(
			response.body.data.results[0].errorCode,
			"METACRITIC_PARSE_ERROR"
		);
		assert.deepEqual(metacritic.calls, ["persona-5-royal"]);
	});
});

void describe("POST /games/:id/external-data/refresh — concurrency", () => {
	void it("survives two simultaneous refreshes of the same game", async () => {
		const game = await createCatalogGame("Hollow Knight");
		await linkExternal(game.id, "hltb", "26286");
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "hollow-knight",
					title: "Hollow Knight",
					metaScore: 87,
					userScore: 9.1
				})
			]),
			hltb: hltbPages([hltbDetail({ id: "26286", mainStoryHours: 26.5 })])
		});
		const body = { sources: ["metacritic", "hltb"] };

		const responses = await Promise.all([
			refresh(game.id, body),
			refresh(game.id, body)
		]);

		for (const response of responses) {
			assert.equal(response.status, 200);
			assert.deepEqual(
				response.body.data.results.map(
					(result: { status: string }) => result.status
				),
				["updated", "updated"]
			);
		}
		assert.deepEqual(await storedState(game.id), {
			score: 91,
			time: 26.5,
			externals: ["hltb:26286", "metacritic:hollow-knight"]
		});
		assert.equal(await GameScore.count({ where: { gameId: game.id } }), 1);
		assert.equal(await GameTime.count({ where: { gameId: game.id } }), 1);
	});

	void it("lets a double click on different sources settle each one", async () => {
		const game = await createCatalogGame("Hollow Knight");
		await linkExternal(game.id, "hltb", "26286");
		registerFakes({
			metacritic: metacriticPages([
				metacriticDetail({
					slug: "hollow-knight",
					title: "Hollow Knight",
					metaScore: 87
				})
			]),
			hltb: hltbPages([hltbDetail({ id: "26286", mainStoryHours: 26.5 })])
		});

		const [first, second] = await Promise.all([
			refresh(game.id, { sources: ["metacritic"] }),
			refresh(game.id, { sources: ["hltb"] })
		]);

		assert.equal(first.status, 200);
		assert.equal(second.status, 200);
		assert.deepEqual(await storedState(game.id), {
			score: 87,
			time: 26.5,
			externals: ["hltb:26286", "metacritic:hollow-knight"]
		});
	});
});
