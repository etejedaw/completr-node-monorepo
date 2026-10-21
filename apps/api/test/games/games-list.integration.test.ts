import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GameGenre } from "../../src/game-genre/game-genre.model";
import { GamePlatform } from "../../src/game-platform/game-platform.model";
import { GamePopularity } from "../../src/game-popularity/game-popularity.model";
import { type TimeSource } from "../../src/game-times/game-time.model";
import { Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGameScore,
	createGameTime,
	createPlatform,
	createScoreSource
} from "../helpers/factories.helper";

const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;

interface CatalogGameOverrides {
	title: string;
	createdAt: string;
	releaseAt?: string;
	isDlc?: boolean;
	isCompilation?: boolean;
	isActive?: boolean;
}

interface ListedGame {
	id: string;
	title: string;
	genres: { code: string }[];
}

const games: Record<string, Game> = {};
let ps5Code: string;
let switchCode: string;
let authorization: string;

function createCatalogGame(overrides: CatalogGameOverrides) {
	return Game.create({
		...overrides,
		code: overrides.title
			.toLowerCase()
			.replaceAll(NON_SLUG_CHARACTERS, "-"),
		backgroundUrl: "https://img.completr.test/background.jpg"
	});
}

async function linkGenres(game: Game, genreIds: string[]) {
	await GameGenre.bulkCreate(
		genreIds.map(genreId => ({ gameId: game.id, genreId }))
	);
}

async function linkPlatforms(game: Game, platformIds: string[]) {
	await GamePlatform.bulkCreate(
		platformIds.map(platformId => ({ gameId: game.id, platformId }))
	);
}

async function addTimes(game: Game, times: [TimeSource, number][]) {
	for (const [source, duration] of times) {
		await createGameTime(game.id, source, duration);
	}
}

async function addScores(game: Game, scores: [string, number][]) {
	for (const [source, score] of scores) {
		await createGameScore(game.id, source, score);
	}
}

async function seedCatalog() {
	await createScoreSource({ code: "completr", scale: 5, priority: 5 });
	await createScoreSource({
		code: "metacritic-t",
		scale: 100,
		priority: 100
	});
	await createScoreSource({ code: "opencritic-t", scale: 10, priority: 50 });

	const [ps5, switchConsole] = await Promise.all([
		createPlatform(),
		createPlatform()
	]);
	ps5Code = ps5.code;
	switchCode = switchConsole.code;
	const [rpg, action] = await Promise.all([
		Genre.create({ name: "RPG Test", code: "rpg-t" }),
		Genre.create({ name: "Action Test", code: "action-t" })
	]);

	games.alpha = await createCatalogGame({
		title: "Alpha Quest",
		createdAt: "2024-01-01T00:00:00Z",
		releaseAt: "2010-06-01"
	});
	games.bravo = await createCatalogGame({
		title: "Bravo Strike",
		createdAt: "2024-01-02T00:00:00Z",
		releaseAt: "2015-03-10"
	});
	games.cafe = await createCatalogGame({
		title: "Café Déjà Vu",
		createdAt: "2024-01-03T00:00:00Z",
		releaseAt: "2020-12-31"
	});
	games.delta = await createCatalogGame({
		title: "Delta Pack",
		createdAt: "2024-01-04T00:00:00Z",
		releaseAt: "2018-01-01",
		isDlc: true
	});
	games.echo = await createCatalogGame({
		title: "Echo Collection",
		createdAt: "2024-01-05T00:00:00Z",
		releaseAt: "2005-01-01",
		isCompilation: true
	});
	games.foxtrot = await createCatalogGame({
		title: "Foxtrot Retired",
		createdAt: "2024-01-06T00:00:00Z",
		releaseAt: "2012-01-01",
		isActive: false
	});
	games.hotel = await createCatalogGame({
		title: "Hotel Mix",
		createdAt: "2024-01-07T00:00:00Z",
		releaseAt: "2016-05-05"
	});

	await linkGenres(games.alpha, [rpg.id]);
	await linkGenres(games.bravo, [action.id]);
	await linkGenres(games.cafe, [rpg.id, action.id]);
	await linkPlatforms(games.alpha, [ps5.id]);
	await linkPlatforms(games.bravo, [switchConsole.id]);
	await linkPlatforms(games.cafe, [ps5.id, switchConsole.id]);

	await addScores(games.alpha, [
		["completr", 4],
		["metacritic-t", 80]
	]);
	await addScores(games.bravo, [["metacritic-t", 60]]);
	await addScores(games.cafe, [["metacritic-t", 90]]);
	await addScores(games.hotel, [
		["metacritic-t", 100],
		["opencritic-t", 2]
	]);
	await addTimes(games.alpha, [
		["completr", 10],
		["hltb", 10]
	]);
	await addTimes(games.bravo, [["hltb", 12]]);
	await addTimes(games.cafe, [["hltb", 45]]);
	await addTimes(games.hotel, [
		["hltb", 30],
		["rawg", 20]
	]);

	await GamePopularity.bulkCreate([
		{ gameId: games.alpha.id, score: 3 },
		{ gameId: games.bravo.id, score: 10 },
		{ gameId: games.cafe.id, score: 1 }
	]);
}

useTestDatabase(async () => {
	await seedCatalog();
	authorization = (await createUserWithSession()).authorization;
});

function getGames(query: Record<string, string | number> = {}) {
	return api().get("/games").query(query).set("Authorization", authorization);
}

function titlesOf(body: { data: { games: ListedGame[] } }) {
	return body.data.games.map(game => game.title);
}

async function titlesFor(query: Record<string, string | number>) {
	const response = await getGames(query);
	assert.equal(response.status, 200);
	return titlesOf(response.body);
}

const ALL_ACTIVE_TITLES = [
	"Alpha Quest",
	"Bravo Strike",
	"Café Déjà Vu",
	"Delta Pack",
	"Echo Collection",
	"Hotel Mix"
];

void describe("GET /games pagination and defaults", () => {
	void it("lists active games newest first with the default pagination", async () => {
		const response = await getGames();

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 6);
		assert.equal(response.body.data.limit, 50);
		assert.equal(response.body.data.offset, 0);
		assert.deepEqual(titlesOf(response.body), [
			"Hotel Mix",
			"Echo Collection",
			"Delta Pack",
			"Café Déjà Vu",
			"Bravo Strike",
			"Alpha Quest"
		]);
	});

	void it("serializes each game with the list fields", async () => {
		const response = await getGames({ search: "alpha" });

		const [entry] = response.body.data.games;
		assert.equal(entry.id, games.alpha!.id);
		assert.equal(entry.title, "Alpha Quest");
		assert.equal(entry.code, "alpha-quest");
		assert.equal(
			entry.backgroundUrl,
			"https://img.completr.test/background.jpg"
		);
		assert.equal(entry.isDlc, false);
		assert.equal(entry.ratio, 8);
		assert.equal(entry.justImported, false);
		assert.deepEqual(
			entry.genres.map((genre: { code: string }) => genre.code),
			["rpg-t"]
		);
		assert.equal(entry.isActive, undefined);
		assert.equal(entry.platforms, undefined);
	});

	void it("returns a null ratio when there is no Completr score and duration", async () => {
		const response = await getGames({ search: "bravo" });

		assert.equal(response.body.data.games[0].ratio, null);
	});

	void it("pages with limit and offset and keeps the total", async () => {
		const response = await getGames({
			sort_by: "title",
			sort_order: "asc",
			limit: 2,
			offset: 2
		});

		assert.equal(response.status, 200);
		assert.deepEqual(titlesOf(response.body), [
			"Café Déjà Vu",
			"Delta Pack"
		]);
		assert.equal(response.body.data.total, 6);
		assert.equal(response.body.data.limit, 2);
		assert.equal(response.body.data.offset, 2);
	});

	void it("returns an empty page past the last game but still reports the total", async () => {
		const response = await getGames({ offset: 60 });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.equal(response.body.data.total, 6);
	});

	void it("accepts the maximum page size of 100", async () => {
		const response = await getGames({ limit: 100 });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.limit, 100);
		assert.equal(response.body.data.games.length, 6);
	});
});

void describe("GET /games sorting", () => {
	void it("sorts by title in both directions", async () => {
		assert.deepEqual(
			await titlesFor({ sort_by: "title", sort_order: "asc" }),
			ALL_ACTIVE_TITLES
		);
		assert.deepEqual(
			await titlesFor({ sort_by: "title", sort_order: "desc" }),
			ALL_ACTIVE_TITLES.toReversed()
		);
	});

	void it("sorts by creation date ascending", async () => {
		assert.deepEqual(
			await titlesFor({ sort_by: "createdAt", sort_order: "asc" }),
			[
				"Alpha Quest",
				"Bravo Strike",
				"Café Déjà Vu",
				"Delta Pack",
				"Echo Collection",
				"Hotel Mix"
			]
		);
	});

	void it("sorts by release date", async () => {
		assert.deepEqual(
			await titlesFor({ sort_by: "releaseAt", sort_order: "asc" }),
			[
				"Echo Collection",
				"Alpha Quest",
				"Bravo Strike",
				"Hotel Mix",
				"Delta Pack",
				"Café Déjà Vu"
			]
		);
	});

	void it("sorts by the canonical score of the source with the lowest priority, nulls last", async () => {
		const descending = await titlesFor({
			sort_by: "score",
			sort_order: "desc"
		});
		const ascending = await titlesFor({
			sort_by: "score",
			sort_order: "asc"
		});

		assert.deepEqual(descending.slice(0, 4), [
			"Café Déjà Vu",
			"Alpha Quest",
			"Bravo Strike",
			"Hotel Mix"
		]);
		assert.deepEqual(ascending.slice(0, 4), [
			"Hotel Mix",
			"Bravo Strike",
			"Alpha Quest",
			"Café Déjà Vu"
		]);
		assert.deepEqual(descending.slice(4).sort(), [
			"Delta Pack",
			"Echo Collection"
		]);
		assert.deepEqual(ascending.slice(4).sort(), [
			"Delta Pack",
			"Echo Collection"
		]);
	});

	void it("sorts by the canonical duration preferring completr, then hltb, then rawg", async () => {
		const ascending = await titlesFor({
			sort_by: "duration",
			sort_order: "asc"
		});
		const descending = await titlesFor({
			sort_by: "duration",
			sort_order: "desc"
		});

		assert.deepEqual(ascending.slice(0, 4), [
			"Alpha Quest",
			"Bravo Strike",
			"Hotel Mix",
			"Café Déjà Vu"
		]);
		assert.deepEqual(descending.slice(0, 4), [
			"Café Déjà Vu",
			"Hotel Mix",
			"Bravo Strike",
			"Alpha Quest"
		]);
		assert.deepEqual(ascending.slice(4).sort(), [
			"Delta Pack",
			"Echo Collection"
		]);
	});

	void it("sorts by ratio of the canonical score over the canonical duration", async () => {
		const descending = await titlesFor({
			sort_by: "ratio",
			sort_order: "desc"
		});

		assert.deepEqual(descending.slice(0, 4), [
			"Alpha Quest",
			"Bravo Strike",
			"Café Déjà Vu",
			"Hotel Mix"
		]);
		assert.deepEqual(descending.slice(4).sort(), [
			"Delta Pack",
			"Echo Collection"
		]);
	});

	void it("sorts by popularity with unranked games last", async () => {
		const descending = await titlesFor({
			sort_by: "popularity",
			sort_order: "desc"
		});

		assert.deepEqual(descending.slice(0, 3), [
			"Bravo Strike",
			"Alpha Quest",
			"Café Déjà Vu"
		]);
		assert.equal(descending.length, 6);
	});

	void it("returns every game when sorting randomly", async () => {
		const response = await getGames({ sort_by: "random" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 6);
		assert.deepEqual(titlesOf(response.body).sort(), ALL_ACTIVE_TITLES);
	});
});

void describe("GET /games filters", () => {
	void it("finds titles without caring about accents, case or punctuation", async () => {
		assert.deepEqual(await titlesFor({ search: "cafe" }), ["Café Déjà Vu"]);
		assert.deepEqual(await titlesFor({ search: "CAFÉ DEJA" }), [
			"Café Déjà Vu"
		]);
		assert.deepEqual(await titlesFor({ search: "déjà" }), ["Café Déjà Vu"]);
		assert.deepEqual(await titlesFor({ search: "alpha-quest!" }), [
			"Alpha Quest"
		]);
	});

	void it("requires every search token to match the title", async () => {
		assert.deepEqual(await titlesFor({ search: "alpha bravo" }), []);
		assert.deepEqual(await titlesFor({ search: "quest alpha" }), [
			"Alpha Quest"
		]);
	});

	void it("filters by one genre and keeps every genre of each game", async () => {
		const response = await getGames({
			genre: "rpg-t",
			sort_by: "title",
			sort_order: "asc"
		});

		assert.deepEqual(titlesOf(response.body), [
			"Alpha Quest",
			"Café Déjà Vu"
		]);
		const cafe = (response.body.data.games as ListedGame[]).find(
			game => game.title === "Café Déjà Vu"
		);
		assert.deepEqual(cafe!.genres.map(genre => genre.code).sort(), [
			"action-t",
			"rpg-t"
		]);
	});

	void it("filters by a list of genres and prefers it over the single genre", async () => {
		assert.deepEqual(
			(await titlesFor({ genres: "rpg-t,action-t" })).sort(),
			["Alpha Quest", "Bravo Strike", "Café Déjà Vu"]
		);
		assert.deepEqual(
			await titlesFor({ genres: "action-t", genre: "rpg-t" }).then(
				titles => titles.sort()
			),
			["Bravo Strike", "Café Déjà Vu"]
		);
	});

	void it("returns nothing for an unknown genre", async () => {
		const response = await getGames({ genre: "does-not-exist" });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.equal(response.body.data.total, 0);
	});

	void it("filters by platform codes", async () => {
		const bySwitch = await titlesFor({ platforms: switchCode });
		const byBoth = await titlesFor({
			platforms: `${ps5Code},${switchCode}`
		});

		assert.deepEqual(bySwitch.sort(), ["Bravo Strike", "Café Déjà Vu"]);
		assert.deepEqual(byBoth.sort(), [
			"Alpha Quest",
			"Bravo Strike",
			"Café Déjà Vu"
		]);
	});

	void it("filters by release year range, inclusive on both ends", async () => {
		assert.deepEqual(
			(await titlesFor({ release_year_from: 2016 })).sort(),
			["Café Déjà Vu", "Delta Pack", "Hotel Mix"]
		);
		assert.deepEqual((await titlesFor({ release_year_to: 2010 })).sort(), [
			"Alpha Quest",
			"Echo Collection"
		]);
		assert.deepEqual(
			(
				await titlesFor({
					release_year_from: 2010,
					release_year_to: 2015
				})
			).sort(),
			["Alpha Quest", "Bravo Strike"]
		);
	});

	void it("filters by the DLC and compilation flags", async () => {
		assert.deepEqual(await titlesFor({ is_dlc: "true" }), ["Delta Pack"]);
		assert.equal((await titlesFor({ is_dlc: "false" })).length, 5);
		assert.deepEqual(await titlesFor({ is_compilation: "true" }), [
			"Echo Collection"
		]);
		assert.equal(
			(await titlesFor({ exclude_compilations: "true" })).includes(
				"Echo Collection"
			),
			false
		);
		assert.deepEqual(
			await titlesFor({
				is_compilation: "true",
				exclude_compilations: "true"
			}),
			["Echo Collection"]
		);
	});

	void it("hides inactive games unless asked, and can show only them", async () => {
		const withInactive = await getGames({ include_inactive: "true" });
		const onlyInactive = await getGames({ only_inactive: "true" });
		const contradictory = await getGames({
			include_inactive: "true",
			only_inactive: "true"
		});

		assert.equal(withInactive.body.data.total, 7);
		assert.ok(titlesOf(withInactive.body).includes("Foxtrot Retired"));
		assert.deepEqual(titlesOf(onlyInactive.body), ["Foxtrot Retired"]);
		assert.deepEqual(titlesOf(contradictory.body), ["Foxtrot Retired"]);
	});

	void it("filters games that miss scores, times or platforms", async () => {
		assert.deepEqual((await titlesFor({ no_scores: "true" })).sort(), [
			"Delta Pack",
			"Echo Collection"
		]);
		assert.deepEqual((await titlesFor({ no_times: "true" })).sort(), [
			"Delta Pack",
			"Echo Collection"
		]);
		assert.deepEqual((await titlesFor({ no_platforms: "true" })).sort(), [
			"Delta Pack",
			"Echo Collection",
			"Hotel Mix"
		]);
	});

	void it("excludes games that already have a score or time from the listed sources", async () => {
		assert.deepEqual(
			(await titlesFor({ no_score_source: "metacritic-t" })).sort(),
			["Delta Pack", "Echo Collection"]
		);
		assert.deepEqual(
			(await titlesFor({ no_score_source: "completr" })).sort(),
			[
				"Bravo Strike",
				"Café Déjà Vu",
				"Delta Pack",
				"Echo Collection",
				"Hotel Mix"
			]
		);
		assert.deepEqual(
			(await titlesFor({ no_time_source: "hltb,rawg" })).sort(),
			["Delta Pack", "Echo Collection"]
		);
	});

	void it("filters by minimum and maximum duration", async () => {
		assert.deepEqual((await titlesFor({ min_duration: 20 })).sort(), [
			"Café Déjà Vu",
			"Hotel Mix"
		]);
		assert.deepEqual((await titlesFor({ max_duration: 12.5 })).sort(), [
			"Alpha Quest",
			"Bravo Strike"
		]);
	});

	void it(
		"filters by minimum score on the 0 to 5 scale",
		{
			todo: "bug: min_score and max_score compare the raw source scores instead of normalizing them to 0-5"
		},
		async () => {
			assert.deepEqual(await titlesFor({ min_score: 4.2 }), [
				"Café Déjà Vu"
			]);
		}
	);

	void it(
		"filters by maximum score on the 0 to 5 scale",
		{
			todo: "bug: min_score and max_score compare the raw source scores instead of normalizing them to 0-5"
		},
		async () => {
			assert.deepEqual((await titlesFor({ max_score: 3.5 })).sort(), [
				"Bravo Strike",
				"Hotel Mix"
			]);
		}
	);

	void it("combines filters, sorting and pagination", async () => {
		const response = await getGames({
			genres: "rpg-t",
			sort_by: "title",
			sort_order: "desc",
			limit: 1,
			offset: 1
		});

		assert.deepEqual(titlesOf(response.body), ["Alpha Quest"]);
		assert.equal(response.body.data.total, 2);
	});
});

void describe("GET /games detailed view", () => {
	void it("adds platforms, scores, times, variant and active flag", async () => {
		const response = await getGames({ detailed: "true", search: "alpha" });

		assert.equal(response.status, 200);
		const [entry] = response.body.data.games;
		assert.equal(entry.id, games.alpha!.id);
		assert.equal(entry.isActive, true);
		assert.equal(entry.variant, null);
		assert.equal(entry.ratio, 8);
		assert.equal(entry.platforms.length, 1);
		assert.deepEqual(
			entry.scores
				.map((score: { source: string }) => score.source)
				.sort(),
			["completr", "metacritic-t"]
		);
		assert.deepEqual(
			entry.times.map((time: { source: string }) => time.source).sort(),
			["completr", "hltb"]
		);
		assert.equal(entry.genres, undefined);
	});

	void it("reports the inactive flag when inactive games are included", async () => {
		const response = await getGames({
			detailed: "true",
			only_inactive: "true"
		});

		assert.equal(response.body.data.games[0].title, "Foxtrot Retired");
		assert.equal(response.body.data.games[0].isActive, false);
	});
});

void describe("GET /games validation and authentication", () => {
	void it("rejects invalid query parameters with 422 COMMON_SCHEMA_INVALID", async () => {
		const invalidQueries: Record<string, string>[] = [
			{ limit: "0" },
			{ limit: "101" },
			{ limit: "abc" },
			{ offset: "-1" },
			{ sort_by: "popularityy" },
			{ sort_order: "up" },
			{ search: "" },
			{ search: "x".repeat(101) },
			{ release_year_from: "1899" },
			{ release_year_to: "2101" },
			{ min_score: "6" },
			{ max_score: "-1" },
			{ min_duration: "-3" },
			{ is_dlc: "maybe" },
			{ genres: "" },
			{ no_score_source: "" },
			{ unknown_filter: "1" }
		];

		for (const query of invalidQueries) {
			const response = await getGames(query);
			assert.equal(response.status, 422, JSON.stringify(query));
			assert.equal(
				response.body.type,
				"COMMON_SCHEMA_INVALID",
				JSON.stringify(query)
			);
		}
	});

	void it("serves every role", async () => {
		const accounts = await Promise.all([
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await api()
				.get("/games")
				.set("Authorization", account.authorization);
			assert.equal(response.status, 200);
		}
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/games");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/games")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
