import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { GameGenre } from "../../src/game-genre/game-genre.model";
import { GamePopularity } from "../../src/game-popularity/game-popularity.model";
import { Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGameScore,
	createGameTime,
	createScoreSource
} from "../helpers/factories.helper";

const SHOWCASE_SIZE = 21;
const REGULAR_GAME_COUNT = 25;
const BACKGROUND_URL = "https://img.completr.test/background.jpg";

useTestDatabase();

interface ShowcaseSeed {
	title: string;
	popularity?: number;
	backgroundUrl?: string | null;
	isDlc?: boolean;
	isActive?: boolean;
	releaseAt?: string;
}

async function createShowcaseGame(seed: ShowcaseSeed) {
	const game = await Game.create({
		title: seed.title,
		code: seed.title.toLowerCase().replaceAll(" ", "-"),
		backgroundUrl:
			seed.backgroundUrl === undefined
				? BACKGROUND_URL
				: seed.backgroundUrl,
		isDlc: seed.isDlc ?? false,
		isActive: seed.isActive ?? true,
		releaseAt: seed.releaseAt ? new Date(seed.releaseAt) : undefined
	});
	if (seed.popularity !== undefined) {
		await GamePopularity.create({
			gameId: game.id,
			score: seed.popularity
		});
	}
	return game;
}

function getShowcase() {
	return api().get("/games/showcase");
}

async function getShowcaseWithRandom(value: number) {
	const random = mock.method(Math, "random", () => value);
	try {
		return await getShowcase();
	} finally {
		random.mock.restore();
	}
}

async function tagGenres(gameId: string, names: string[]) {
	for (const name of names) {
		const genre = await Genre.create({
			name,
			code: name.toLowerCase()
		});
		await GameGenre.create({ gameId, genreId: genre.id });
	}
}

function regularTitle(index: number) {
	return `Show ${String(index).padStart(2, "0")}`;
}

void describe("GET /games/showcase", () => {
	void it("answers an empty showcase when the catalog is empty", async () => {
		const response = await getShowcase();

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { games: [] });
	});

	void it("samples 21 eligible games from the most popular ones with their catalog data and ratio", async () => {
		await createScoreSource({ code: "completr", scale: 5, priority: 5 });
		await createScoreSource({
			code: "metacritic-t",
			scale: 100,
			priority: 100
		});
		const regularGames = new Map<number, Game>();
		for (let index = 1; index <= REGULAR_GAME_COUNT; index++) {
			regularGames.set(
				index,
				await createShowcaseGame({
					title: regularTitle(index),
					popularity: 1000 - index,
					releaseAt: index === 3 ? "2013-08-07" : undefined
				})
			);
		}
		await createShowcaseGame({ title: "Tie Zulu", popularity: 2000 });
		await createShowcaseGame({ title: "Tie Alpha", popularity: 2000 });
		await createShowcaseGame({
			title: "Popular Dlc",
			popularity: 5000,
			isDlc: true
		});
		await createShowcaseGame({
			title: "Popular Retired",
			popularity: 4000,
			isActive: false
		});
		await createShowcaseGame({
			title: "Popular Without Background",
			popularity: 3000,
			backgroundUrl: null
		});

		const featuredGame = regularGames.get(3)!;
		await createGameScore(featuredGame.id, "metacritic-t", 80);
		await createGameScore(featuredGame.id, "completr", 4.5);
		await createGameTime(featuredGame.id, "hltb", 10);
		await createGameTime(featuredGame.id, "rawg", 5);
		await tagGenres(featuredGame.id, ["Puzzle", "Adventure"]);
		const scoreOnlyGame = regularGames.get(2)!;
		await createGameScore(scoreOnlyGame.id, "metacritic-t", 100);
		const slowGame = regularGames.get(1)!;
		await createGameScore(slowGame.id, "metacritic-t", 100);
		await createGameTime(slowGame.id, "hltb", 50);
		const outsideTheShowcase = regularGames.get(REGULAR_GAME_COUNT)!;
		await createGameScore(outsideTheShowcase.id, "metacritic-t", 100);
		await createGameTime(outsideTheShowcase.id, "hltb", 1);

		const response = await getShowcaseWithRandom(0);

		assert.equal(response.status, 200);
		const { games } = response.body.data;
		assert.equal(games.length, SHOWCASE_SIZE);
		assert.deepEqual(
			games.map((game: { title: string }) => game.title),
			[
				"Tie Alpha",
				"Tie Zulu",
				...Array.from({ length: SHOWCASE_SIZE - 2 }, (_, index) =>
					regularTitle(index + 1)
				)
			]
		);
		const byTitle = new Map(
			games.map((game: { title: string }) => [game.title, game])
		);
		assert.deepEqual(byTitle.get("Show 03"), {
			id: featuredGame.id,
			code: featuredGame.code,
			title: "Show 03",
			backgroundUrl: BACKGROUND_URL,
			releaseYear: 2013,
			genres: ["Adventure", "Puzzle"],
			score: 4.5,
			hours: 10,
			ratio: 9
		});
		assert.deepEqual(byTitle.get("Show 04"), {
			id: regularGames.get(4)!.id,
			code: regularGames.get(4)!.code,
			title: "Show 04",
			backgroundUrl: BACKGROUND_URL,
			releaseYear: null,
			genres: [],
			score: null,
			hours: null,
			ratio: null
		});
		assert.equal(
			(byTitle.get("Show 02") as { ratio: number | null }).ratio,
			null
		);
	});

	void it("excludes DLCs, inactive games and games without a background", async () => {
		const response = await getShowcase();

		const titles = response.body.data.games.map(
			(game: { title: string }) => game.title
		);
		assert.equal(titles.includes("Popular Dlc"), false);
		assert.equal(titles.includes("Popular Retired"), false);
		assert.equal(titles.includes("Popular Without Background"), false);
	});

	void it("is public and ignores an invalid token", async () => {
		const response = await getShowcase().set(
			"Authorization",
			"Bearer expired.token.value"
		);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, SHOWCASE_SIZE);
	});

	void it("serves the cached result even after the catalog changes", async () => {
		const before = await getShowcase();
		await createShowcaseGame({ title: "Late Arrival", popularity: 9999 });

		const after = await getShowcase();

		assert.deepEqual(after.body.data, before.body.data);
		assert.equal(
			after.body.data.games.some(
				(game: { title: string }) => game.title === "Late Arrival"
			),
			false
		);
	});
});
