import "./rawg-env.setup";

import assert from "node:assert/strict";
import { afterEach, before, describe, it, mock } from "node:test";

import { GameExternal } from "../../src/game-external/game-external.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Game } from "../../src/games/game.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";
import {
	ELDEN_RING_DETAIL,
	ELDEN_RING_SEARCH_RESULT,
	HOLLOW_KNIGHT_DETAIL,
	HOLLOW_KNIGHT_SEARCH_RESULT,
	UNRATED_DETAIL,
	UNRATED_SEARCH_RESULT
} from "./fixtures/rawg.fixtures";
import {
	rawgCatalogHandler,
	rawgFailureHandler,
	stubRawgFetch
} from "./rawg-fetch.helper";
import { seedRawgCatalog } from "./rawg-seed.helper";

let authorization: string;

useTestDatabase(async () => {
	await seedRawgCatalog();
	authorization = (await createUserWithSession()).authorization;
});

afterEach(() => {
	mock.restoreAll();
});

function searchGames(query: Record<string, string>) {
	return api()
		.get("/games/search")
		.query(query)
		.set("Authorization", authorization);
}

function searchCall(calls: URL[]) {
	return calls.find(call => call.pathname === "/api/games");
}

void describe("GET /games/search with force_rawg=true", () => {
	void it("queries RAWG and imports the game with its platforms, genres, score and time", async () => {
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				search: {
					count: 1,
					next: null,
					results: [ELDEN_RING_SEARCH_RESULT]
				},
				details: [ELDEN_RING_DETAIL]
			})
		);

		const response = await searchGames({
			query: "elden ring",
			force_rawg: "true"
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 1);
		const [entry] = response.body.data.games;
		assert.equal(entry.title, "Elden Ring");
		assert.equal(entry.code, "elden-ring");
		assert.equal(entry.justImported, true);
		assert.deepEqual(
			entry.platforms
				.map((platform: { code: string }) => platform.code)
				.sort(),
			["playstation-5", "xbox-series-xors"]
		);
		assert.deepEqual(
			entry.genres.map((genre: { code: string }) => genre.code).sort(),
			["action", "rpg", "soulslike"]
		);

		const call = searchCall(rawgCalls);
		assert.ok(call);
		assert.equal(call.searchParams.get("key"), "fake-key");
		assert.equal(call.searchParams.get("search"), "elden ring");
		assert.equal(call.searchParams.get("page_size"), "3");
		assert.equal(call.searchParams.get("exclude_additions"), "true");

		const stored = await Game.findOne({ where: { code: "elden-ring" } });
		assert.ok(stored);
		assert.equal(
			stored.description,
			"Rise, Tarnished, and become an Elden Lord."
		);
		const external = await GameExternal.findOne({
			where: { gameId: stored.id, source: "rawg" }
		});
		assert.equal(external?.externalId, "326243");
		const scores = await GameScore.findAll({
			where: { gameId: stored.id }
		});
		assert.deepEqual(
			scores.map(({ source, score }) => ({ source, score })),
			[{ source: "metacritic", score: 96 }]
		);
		const times = await GameTime.findAll({ where: { gameId: stored.id } });
		assert.deepEqual(
			times.map(({ source, duration }) => ({ source, duration })),
			[{ source: "rawg", duration: 55 }]
		);
	});

	void it("calls RAWG again but does not duplicate or re-import a game that is already imported", async () => {
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				search: {
					count: 1,
					next: null,
					results: [ELDEN_RING_SEARCH_RESULT]
				},
				details: [ELDEN_RING_DETAIL]
			})
		);

		const response = await searchGames({
			query: "elden ring",
			force_rawg: "true"
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 1);
		assert.equal(response.body.data.games[0].justImported, false);
		assert.ok(searchCall(rawgCalls));
		assert.equal(await Game.count({ where: { code: "elden-ring" } }), 1);
		assert.equal(
			await GameExternal.count({
				where: { source: "rawg", externalId: "326243" }
			}),
			1
		);
	});

	void it("ignores a local match, queries RAWG and links the RAWG id to the game with the same slug", async () => {
		const local = await Game.create({
			title: "Hollow Knight",
			code: "hollow-knight"
		});
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				search: {
					count: 1,
					next: null,
					results: [HOLLOW_KNIGHT_SEARCH_RESULT]
				},
				details: [HOLLOW_KNIGHT_DETAIL]
			})
		);

		const response = await searchGames({
			query: "hollow knight",
			force_rawg: "true"
		});

		assert.equal(response.status, 200);
		assert.ok(searchCall(rawgCalls));
		assert.deepEqual(
			response.body.data.games.map((game: { id: string }) => game.id),
			[local.id]
		);
		assert.equal(response.body.data.games[0].justImported, false);
		assert.equal(await Game.count({ where: { code: "hollow-knight" } }), 1);
		const external = await GameExternal.findOne({
			where: { gameId: local.id, source: "rawg" }
		});
		assert.equal(external?.externalId, "9767");
	});

	void it("does not force RAWG when force_rawg is false", async () => {
		await createGame({ title: "Shovel Knight" });
		const { rawgCalls } = stubRawgFetch(rawgCatalogHandler({}));

		const response = await searchGames({
			query: "shovel knight",
			force_rawg: "false"
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 1);
		assert.equal(rawgCalls.length, 0);
	});

	void it("answers 200 with no games when RAWG fails", async () => {
		const { rawgCalls } = stubRawgFetch(rawgFailureHandler(500));

		const response = await searchGames({
			query: "elden ring",
			force_rawg: "true"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.ok(searchCall(rawgCalls));
	});
});

void describe("GET /games/search falling back to RAWG", () => {
	void it("imports from RAWG when no local game matches", async () => {
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				search: {
					count: 1,
					next: null,
					results: [UNRATED_SEARCH_RESULT]
				},
				details: [UNRATED_DETAIL]
			})
		);

		const response = await searchGames({ query: "obscure prototype" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 1);
		const [entry] = response.body.data.games;
		assert.equal(entry.title, "Obscure Prototype");
		assert.equal(entry.justImported, true);
		assert.deepEqual(entry.platforms, []);
		assert.deepEqual(entry.genres, []);
		assert.deepEqual(entry.scores, []);
		assert.deepEqual(entry.times, []);
		const call = searchCall(rawgCalls);
		assert.ok(call);
		assert.equal(call.searchParams.get("search"), "obscure prototype");
		const external = await GameExternal.findOne({
			where: { gameId: entry.id, source: "rawg" }
		});
		assert.equal(external?.externalId, "770001");
	});

	void it("also resolves the exact slug of the query when RAWG does not list it", async () => {
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				search: { count: 0, next: null, results: [] },
				details: [
					{
						...HOLLOW_KNIGHT_DETAIL,
						id: 880001,
						slug: "slug-only-game",
						name: "Slug Only Game"
					}
				]
			})
		);

		const response = await searchGames({ query: "Slug Only Game" });

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.games.map(
				(game: { title: string }) => game.title
			),
			["Slug Only Game"]
		);
		assert.equal(response.body.data.games[0].justImported, true);
		assert.ok(
			rawgCalls.some(
				call => call.pathname === "/api/games/slug-only-game"
			)
		);
	});

	void it("skips a result whose detail fails and keeps the rest", async () => {
		stubRawgFetch(
			rawgCatalogHandler({
				search: {
					count: 2,
					next: null,
					results: [
						{
							...HOLLOW_KNIGHT_SEARCH_RESULT,
							id: 890001,
							slug: "blasphemous-broken",
							name: "Blasphemous Broken"
						},
						{
							...HOLLOW_KNIGHT_SEARCH_RESULT,
							id: 890002,
							slug: "blasphemous-fine",
							name: "Blasphemous Fine"
						}
					]
				},
				details: [
					{
						...HOLLOW_KNIGHT_DETAIL,
						id: 890002,
						slug: "blasphemous-fine",
						name: "Blasphemous Fine"
					}
				]
			})
		);

		const response = await searchGames({ query: "blasphemous" });

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.games.map(
				(game: { title: string }) => game.title
			),
			["Blasphemous Fine"]
		);
	});

	void it("returns no games when RAWG has nothing", async () => {
		const { rawgCalls } = stubRawgFetch(rawgCatalogHandler({}));

		const response = await searchGames({ query: "nothing at all" });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.ok(searchCall(rawgCalls));
	});

	void it("answers 200 with no games when RAWG is down", async () => {
		const { rawgCalls } = stubRawgFetch(rawgFailureHandler(503));

		const response = await searchGames({ query: "unreachable game" });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.ok(searchCall(rawgCalls));
	});

	void it("answers 200 with no games when RAWG rate limits the search", async () => {
		stubRawgFetch(rawgFailureHandler(429));

		const response = await searchGames({ query: "throttled game" });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
	});

	void it("answers 200 with no games when the network to RAWG fails", async () => {
		stubRawgFetch(() => {
			throw new TypeError("fetch failed");
		});

		const response = await searchGames({ query: "offline game" });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
	});
});

void describe("GET /games/search with a local match", () => {
	before(async () => {
		await createGame({ title: "Celeste" });
	});

	void it("does not call RAWG", async () => {
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				search: { count: 0, next: null, results: [] }
			})
		);

		const response = await searchGames({ query: "celeste" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 1);
		assert.equal(response.body.data.games[0].title, "Celeste");
		assert.equal(response.body.data.games[0].justImported, false);
		assert.equal(rawgCalls.length, 0);
	});

	void it("keeps answering from the catalog while RAWG is down", async () => {
		const { rawgCalls } = stubRawgFetch(rawgFailureHandler(500));

		const response = await searchGames({ query: "celeste" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 1);
		assert.equal(rawgCalls.length, 0);
	});
});

void describe("GET /games/search with local_only=true", () => {
	void it("does not call RAWG when nothing matches locally", async () => {
		const { rawgCalls } = stubRawgFetch(
			rawgCatalogHandler({
				search: {
					count: 1,
					next: null,
					results: [UNRATED_SEARCH_RESULT]
				},
				details: [UNRATED_DETAIL]
			})
		);

		const response = await searchGames({
			query: "local only unknown",
			local_only: "true"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.equal(rawgCalls.length, 0);
	});

	void it("does not call RAWG even with force_rawg=true", async () => {
		const { rawgCalls } = stubRawgFetch(rawgCatalogHandler({}));

		const response = await searchGames({
			query: "local only unknown",
			local_only: "true",
			force_rawg: "true"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.equal(rawgCalls.length, 0);
	});
});

void describe("GET /games/search validation and access", () => {
	void it("rejects a missing query with 422 COMMON_SCHEMA_INVALID and does not call RAWG", async () => {
		const { rawgCalls } = stubRawgFetch(rawgCatalogHandler({}));

		const response = await searchGames({});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(rawgCalls.length, 0);
	});

	void it("rejects a request without token and does not call RAWG", async () => {
		const { rawgCalls } = stubRawgFetch(rawgCatalogHandler({}));

		const response = await api()
			.get("/games/search")
			.query({ query: "zelda", force_rawg: "true" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
		assert.equal(rawgCalls.length, 0);
	});
});
