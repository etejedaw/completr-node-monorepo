import "../rawg/rawg-env.setup";

import assert from "node:assert/strict";
import { after, afterEach, before, describe, it, mock } from "node:test";

import { GameExternal } from "../../src/game-external/game-external.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { Game } from "../../src/games/game.model";
import { registerIgdbRequestPacer } from "../../src/games/services/external-data-sources.service";
import { createRequestPacer } from "../../src/games/utils/create-request-pacer.util";
import { Genre } from "../../src/genres/genres.model";
import { type IgdbGame } from "../../src/igdb/igdb.interface";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createScoreSource } from "../helpers/factories.helper";
import {
	ELDEN_RING_DETAIL,
	ELDEN_RING_SEARCH_RESULT
} from "../rawg/fixtures/rawg.fixtures";
import {
	rawgCatalogHandler,
	rawgFailureHandler,
	stubRawgFetch
} from "../rawg/rawg-fetch.helper";
import { seedRawgCatalog } from "../rawg/rawg-seed.helper";
import {
	deferred,
	fakeIgdb,
	providerError,
	registerFakes
} from "./external-data-fakes.helper";

const MAIN_GAME = { id: 0, type: "Main Game" };

let authorization: string;

useTestDatabase(async () => {
	await seedRawgCatalog();
	await createScoreSource({ code: "igdb", scale: 100, priority: 5 });
	await Genre.create({ name: "Racing", code: "racing" });
	authorization = (await createUserWithSession()).authorization;
});

before(() => {
	registerIgdbRequestPacer(createRequestPacer(0));
});

after(() => {
	registerIgdbRequestPacer();
	registerFakes({});
});

afterEach(() => {
	mock.restoreAll();
	registerFakes({});
});

function igdbResult(
	overrides: Partial<IgdbGame> & { id: number; name: string }
): IgdbGame {
	return {
		slug: overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
		game_type: MAIN_GAME,
		...overrides
	};
}

function searchGames(query: Record<string, string>) {
	return api()
		.get("/games/search")
		.query(query)
		.set("Authorization", authorization);
}

function titlesOf(body: { data: { games: { title: string }[] } }) {
	return body.data.games.map(game => game.title);
}

void describe("GET /games/search falling back to IGDB", () => {
	void it("imports the IGDB results with their images, score and external id when RAWG is down", async () => {
		stubRawgFetch(rawgFailureHandler(503));
		const igdb = fakeIgdb({
			search: () => [
				igdbResult({
					id: 9001,
					name: "Lagoon Racer",
					summary: "Street racing at night.",
					first_release_date: 916099200,
					rating: 81.456,
					rating_count: 12,
					cover: { id: 1, image_id: "co-lagoon" },
					artworks: [
						{
							id: 2,
							image_id: "ar-lagoon",
							image_type: 2,
							width: 1920,
							height: 1080
						}
					],
					platforms: [{ id: 167, slug: "ps5" }],
					genres: [{ id: 10, slug: "racing" }]
				})
			]
		});
		registerFakes({ igdb });

		const response = await searchGames({ query: "lagoon racer" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.onlineSearchAvailable, true);
		assert.equal(response.body.data.onlineSearchSource, "igdb");
		assert.deepEqual(titlesOf(response.body), ["Lagoon Racer"]);
		const [entry] = response.body.data.games;
		assert.equal(entry.justImported, true);
		assert.equal(entry.releaseAt, "1999-01-12");
		assert.equal(
			entry.coverUrl,
			"https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co-lagoon.jpg"
		);
		assert.equal(
			entry.backgroundUrl,
			"https://images.igdb.com/igdb/image/upload/t_1080p/ar-lagoon.jpg"
		);
		assert.deepEqual(
			entry.platforms.map((platform: { code: string }) => platform.code),
			["playstation-5"]
		);
		assert.deepEqual(
			entry.genres.map((genre: { code: string }) => genre.code),
			["racing"]
		);
		assert.deepEqual(igdb.calls, ["search:lagoon racer"]);

		const external = await GameExternal.findOne({
			where: { gameId: entry.id, source: "igdb" }
		});
		assert.equal(external?.externalId, "9001");
		const score = await GameScore.findOne({
			where: { gameId: entry.id, source: "igdb" }
		});
		assert.equal(score?.score, 81);
	});

	void it("does not call IGDB while RAWG answers, even with nothing found", async () => {
		const igdb = fakeIgdb({ search: () => [] });
		registerFakes({ igdb });

		stubRawgFetch(
			rawgCatalogHandler({
				search: {
					count: 1,
					next: null,
					results: [ELDEN_RING_SEARCH_RESULT]
				},
				details: [ELDEN_RING_DETAIL]
			})
		);
		const found = await searchGames({ query: "elden ring" });
		mock.restoreAll();
		stubRawgFetch(rawgCatalogHandler({}));
		const empty = await searchGames({ query: "nothing anywhere" });

		assert.equal(found.body.data.onlineSearchSource, "rawg");
		assert.deepEqual(titlesOf(found.body), ["Elden Ring"]);
		assert.equal(empty.body.data.onlineSearchAvailable, true);
		assert.equal(empty.body.data.onlineSearchSource, "rawg");
		assert.deepEqual(empty.body.data.games, []);
		assert.equal(igdb.calls.includes("search:elden ring"), false);
		assert.equal(igdb.calls.includes("search:nothing anywhere"), false);
	});

	void it("falls back to IGDB when every RAWG result fails to resolve", async () => {
		stubRawgFetch(url => {
			if (url.pathname === "/api/games")
				return new Response(
					JSON.stringify({
						count: 1,
						next: null,
						results: [{ ...ELDEN_RING_SEARCH_RESULT, id: 990001 }]
					}),
					{
						status: 200,
						headers: { "content-type": "application/json" }
					}
				);
			return new Response("{}", { status: 500 });
		});
		registerFakes({
			igdb: fakeIgdb({
				search: () => [
					igdbResult({ id: 9002, name: "Broken Detail Rescue" })
				]
			})
		});

		const response = await searchGames({ query: "broken detail rescue" });

		assert.equal(response.body.data.onlineSearchSource, "igdb");
		assert.deepEqual(titlesOf(response.body), ["Broken Detail Rescue"]);
	});

	void it("reports online search unavailable when RAWG and IGDB both fail", async () => {
		stubRawgFetch(rawgFailureHandler(500));
		registerFakes({
			igdb: fakeIgdb({ search: () => providerError("IGDB_RATE_LIMITED") })
		});

		const response = await searchGames({ query: "nobody answers" });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.equal(response.body.data.onlineSearchAvailable, false);
		assert.equal(response.body.data.onlineSearchSource, undefined);
	});

	void it("also falls back to IGDB on a forced search that skips a local match", async () => {
		await createGame({ title: "Forced Fallback" });
		stubRawgFetch(rawgFailureHandler(503));
		registerFakes({
			igdb: fakeIgdb({
				search: () => [
					igdbResult({ id: 9003, name: "Forced Fallback Deluxe" })
				]
			})
		});

		const response = await searchGames({
			query: "forced fallback",
			force_online: "true"
		});

		assert.equal(response.body.data.onlineSearchSource, "igdb");
		assert.deepEqual(titlesOf(response.body), ["Forced Fallback Deluxe"]);
	});

	void it("skips DLC, bundles, mods and updates and imports at most three games", async () => {
		stubRawgFetch(rawgFailureHandler(503));
		registerFakes({
			igdb: fakeIgdb({
				search: () => [
					igdbResult({
						id: 9101,
						name: "Saga Bundle",
						game_type: { id: 3, type: "Bundle" }
					}),
					igdbResult({
						id: 9102,
						name: "Saga Skin Pack",
						game_type: { id: 1, type: "DLC" }
					}),
					igdbResult({
						id: 9103,
						name: "Saga Fan Mod",
						game_type: { id: 5, type: "Mod" }
					}),
					igdbResult({
						id: 9104,
						name: "Saga Patch",
						game_type: { id: 14, type: "Update" }
					}),
					igdbResult({ id: 9105, name: "Saga Origins" }),
					igdbResult({
						id: 9106,
						name: "Saga Remake",
						game_type: { id: 8, type: "Remake" }
					}),
					igdbResult({
						id: 9107,
						name: "Saga Untyped",
						game_type: undefined
					}),
					igdbResult({
						id: 9108,
						name: "Saga Port",
						game_type: { id: 11, type: "Port" }
					})
				]
			})
		});

		const response = await searchGames({ query: "saga" });

		assert.deepEqual(titlesOf(response.body), [
			"Saga Origins",
			"Saga Remake",
			"Saga Untyped"
		]);
	});

	void it("answers available with no games when IGDB only has additions", async () => {
		stubRawgFetch(rawgFailureHandler(503));
		registerFakes({
			igdb: fakeIgdb({
				search: () => [
					igdbResult({
						id: 9201,
						name: "Only DLC",
						game_type: { id: 1, type: "DLC" }
					})
				]
			})
		});

		const response = await searchGames({ query: "only dlc" });

		assert.equal(response.body.data.onlineSearchAvailable, true);
		assert.equal(response.body.data.onlineSearchSource, "igdb");
		assert.deepEqual(response.body.data.games, []);
	});

	void it("collapses IGDB results with the same title into one game with one IGDB id", async () => {
		stubRawgFetch(rawgFailureHandler(503));
		registerFakes({
			igdb: fakeIgdb({
				search: () => [
					igdbResult({
						id: 9301,
						name: "Twin Title",
						game_type: { id: 9, type: "Remaster" }
					}),
					igdbResult({
						id: 9302,
						name: "Twin Title",
						game_type: { id: 8, type: "Remake" }
					}),
					igdbResult({ id: 9303, name: "Twin Title" })
				]
			})
		});

		const response = await searchGames({ query: "twin title" });

		assert.deepEqual(titlesOf(response.body), ["Twin Title"]);
		const [game, ...duplicates] = await Game.findAll({
			where: { code: "twin-title" }
		});
		assert.ok(game);
		assert.equal(duplicates.length, 0);
		const externals = await GameExternal.findAll({
			where: { gameId: game.id, source: "igdb" }
		});
		assert.deepEqual(
			externals.map(external => external.externalId),
			["9301"]
		);
	});

	void it("links the IGDB id to a catalog game with the same title instead of importing it", async () => {
		const existing = await Game.create({
			title: "Linked Classic",
			code: "linked-classic"
		});
		stubRawgFetch(rawgFailureHandler(503));
		registerFakes({
			igdb: fakeIgdb({
				search: () => [igdbResult({ id: 9401, name: "Linked Classic" })]
			})
		});

		const response = await searchGames({
			query: "linked classic",
			force_online: "true"
		});

		assert.equal(response.body.data.games[0].id, existing.id);
		assert.equal(response.body.data.games[0].justImported, false);
		const external = await GameExternal.findOne({
			where: { gameId: existing.id, source: "igdb" }
		});
		assert.equal(external?.externalId, "9401");
	});

	void it("reuses the game already linked to the IGDB id", async () => {
		stubRawgFetch(rawgFailureHandler(503));
		const igdb = fakeIgdb({
			search: () => [igdbResult({ id: 9501, name: "Second Visit" })]
		});
		registerFakes({ igdb });

		const first = await searchGames({ query: "second visit" });
		const second = await searchGames({
			query: "second visit",
			force_online: "true"
		});

		assert.equal(first.body.data.games[0].justImported, true);
		assert.equal(second.body.data.games[0].id, first.body.data.games[0].id);
		assert.equal(second.body.data.games[0].justImported, false);
		assert.equal(await Game.count({ where: { code: "second-visit" } }), 1);
	});

	void it("keeps one game when the same IGDB search runs twice at the same time", async () => {
		stubRawgFetch(rawgFailureHandler(503));
		const gate = deferred<IgdbGame[]>();
		registerFakes({
			igdb: fakeIgdb({ search: () => gate.promise })
		});

		const pending = [
			searchGames({ query: "double click", force_online: "true" }),
			searchGames({ query: "double click", force_online: "true" })
		];
		gate.resolve([igdbResult({ id: 9601, name: "Double Click" })]);
		const responses = await Promise.all(pending);

		for (const response of responses) assert.equal(response.status, 200);
		assert.equal(await Game.count({ where: { code: "double-click" } }), 1);
		assert.equal(
			await GameExternal.count({
				where: { source: "igdb", externalId: "9601" }
			}),
			1
		);
	});

	void it("ignores the IGDB results that fail to import and keeps the rest", async () => {
		stubRawgFetch(rawgFailureHandler(503));
		registerFakes({
			igdb: fakeIgdb({
				search: () => [
					igdbResult({
						id: 9701,
						name: "Unknown Platform Only",
						platforms: [{ id: 6, slug: "win" }]
					}),
					igdbResult({ id: 9702, name: "Plain Survivor" })
				]
			})
		});

		const response = await searchGames({ query: "survivor" });

		assert.equal(response.body.data.onlineSearchSource, "igdb");
		assert.ok(titlesOf(response.body).includes("Plain Survivor"));
	});
});
