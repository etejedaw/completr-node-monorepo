import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GameGenre } from "../../src/game-genre/game-genre.model";
import { type Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";

useTestDatabase();

interface GenreGameEntry {
	id: string;
	genres: { code: string }[];
}

function createNamedGenre(name: string, code: string) {
	return Genre.create({ name, code });
}

async function linkGames(genre: Genre, games: Game[]) {
	await GameGenre.bulkCreate(
		games.map(game => ({ gameId: game.id, genreId: genre.id }))
	);
}

async function createGamesInGenre(genre: Genre, count: number) {
	const games = await Promise.all(
		Array.from({ length: count }, () => createGame())
	);
	await linkGames(genre, games);
	return games;
}

function getGenreGames(authorization: string, code: string, query = "") {
	return api()
		.get(`/genres/${code}/games${query}`)
		.set("Authorization", authorization);
}

void describe("GET /genres", () => {
	void it("returns an empty list when no genre exists", async () => {
		const reader = await createUserWithSession();

		const response = await api()
			.get("/genres")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { genres: [] });
	});

	void it("lists every genre with its id, name and code", async () => {
		const reader = await createUserWithSession();
		const rpg = await createNamedGenre("Role Playing", "role-playing");
		await createNamedGenre("Platformer", "platformer");

		const response = await api()
			.get("/genres")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.genres.length, 2);
		const listed = response.body.data.genres.find(
			(entry: { id: string }) => entry.id === rpg.id
		);
		assert.equal(listed.name, "Role Playing");
		assert.equal(listed.code, "role-playing");
	});

	void it("reflects a genre created after a previous read", async () => {
		const reader = await createUserWithSession();
		await createNamedGenre("Puzzle", "puzzle");

		const response = await api()
			.get("/genres")
			.set("Authorization", reader.authorization);

		assert.equal(response.body.data.genres.length, 3);
	});

	void it("serves every role", async () => {
		const accounts = await Promise.all([
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await api()
				.get("/genres")
				.set("Authorization", account.authorization);
			assert.equal(response.status, 200);
		}
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/genres");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/genres")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /genres/:code", () => {
	void it("returns the genre that matches the code", async () => {
		const reader = await createUserWithSession();
		const genre = await createNamedGenre("Roguelike", "roguelike");

		const response = await api()
			.get("/genres/roguelike")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.genre.id, genre.id);
		assert.equal(response.body.data.genre.name, "Roguelike");
		assert.equal(response.body.data.genre.code, "roguelike");
	});

	void it("answers 404 GENRE_NOT_FOUND for an unknown code", async () => {
		const reader = await createUserWithSession();

		const response = await api()
			.get("/genres/does-not-exist")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GENRE_NOT_FOUND");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/genres/roguelike");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/genres/roguelike")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /genres/:code/games", () => {
	void it("returns the genre and its active games", async () => {
		const reader = await createUserWithSession();
		const genre = await createNamedGenre("Shooter", "shooter");
		const otherGenre = await createNamedGenre("Racing", "racing");
		const [firstGame, secondGame] = await createGamesInGenre(genre, 2);
		const inactiveGame = await createGame({ isActive: false });
		const racingGame = await createGame();
		await linkGames(genre, [inactiveGame]);
		await linkGames(otherGenre, [racingGame]);

		const response = await getGenreGames(reader.authorization, "shooter");

		assert.equal(response.status, 200);
		assert.equal(response.body.data.genre.id, genre.id);
		assert.equal(response.body.data.genre.code, "shooter");
		assert.equal(response.body.data.hasMore, false);
		const ids = response.body.data.games.map(
			(game: { id: string }) => game.id
		);
		assert.deepEqual(
			ids.toSorted(),
			[firstGame!.id, secondGame!.id].sort()
		);
	});

	void it("serializes each game with the public game fields", async () => {
		const reader = await createUserWithSession();
		const genre = await createNamedGenre("Strategy", "strategy");
		const [game] = await createGamesInGenre(genre, 1);

		const response = await getGenreGames(reader.authorization, "strategy");

		const [entry] = response.body.data.games;
		assert.equal(entry.id, game!.id);
		assert.equal(entry.title, game!.title);
		assert.equal(entry.code, game!.code);
		assert.equal(entry.isActive, true);
		assert.equal(entry.ratio, null);
		assert.deepEqual(entry.platforms, []);
		assert.deepEqual(entry.scores, []);
		assert.deepEqual(entry.times, []);
	});

	void it("returns an empty page for a genre without games", async () => {
		const reader = await createUserWithSession();
		await createNamedGenre("Sports", "sports");

		const response = await getGenreGames(reader.authorization, "sports");

		assert.equal(response.status, 200);
		assert.equal(response.body.data.genre.code, "sports");
		assert.deepEqual(response.body.data.games, []);
		assert.equal(response.body.data.hasMore, false);
	});

	void it("paginates with limit and offset and flags hasMore", async () => {
		const reader = await createUserWithSession();
		const genre = await createNamedGenre("Adventure", "adventure");
		const games = await createGamesInGenre(genre, 5);

		const firstPage = await getGenreGames(
			reader.authorization,
			"adventure",
			"?limit=2&offset=0"
		);
		const secondPage = await getGenreGames(
			reader.authorization,
			"adventure",
			"?limit=2&offset=2"
		);
		const lastPage = await getGenreGames(
			reader.authorization,
			"adventure",
			"?limit=2&offset=4"
		);

		assert.equal(firstPage.body.data.games.length, 2);
		assert.equal(firstPage.body.data.hasMore, true);
		assert.equal(secondPage.body.data.games.length, 2);
		assert.equal(secondPage.body.data.hasMore, true);
		assert.equal(lastPage.body.data.games.length, 1);
		assert.equal(lastPage.body.data.hasMore, false);
		const pagedIds = [firstPage, secondPage, lastPage].flatMap(page =>
			page.body.data.games.map((game: { id: string }) => game.id)
		);
		assert.deepEqual(
			pagedIds.toSorted(),
			games.map(game => game.id).sort()
		);
	});

	void it("reports hasMore false when the page ends exactly at the last game", async () => {
		const reader = await createUserWithSession();
		const genre = await createNamedGenre("Fighting", "fighting");
		await createGamesInGenre(genre, 3);

		const response = await getGenreGames(
			reader.authorization,
			"fighting",
			"?limit=3"
		);

		assert.equal(response.body.data.games.length, 3);
		assert.equal(response.body.data.hasMore, false);
	});

	void it("returns an empty page when the offset is past the last game", async () => {
		const reader = await createUserWithSession();

		const response = await getGenreGames(
			reader.authorization,
			"fighting",
			"?offset=50"
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
		assert.equal(response.body.data.hasMore, false);
	});

	void it("keeps every genre of a game in its serialized genres", async () => {
		const reader = await createUserWithSession();
		const action = await createNamedGenre("Action", "action");
		const stealth = await createNamedGenre("Stealth", "stealth");
		const [game] = await createGamesInGenre(action, 1);
		await linkGames(stealth, [game!]);

		const response = await getGenreGames(reader.authorization, "action");

		const [entry] = response.body.data.games as GenreGameEntry[];
		assert.deepEqual(entry!.genres.map(genre => genre.code).sort(), [
			"action",
			"stealth"
		]);
	});

	void it("hides a game once it is deactivated", async () => {
		const reader = await createUserWithSession();
		const genre = await createNamedGenre("Horror", "horror");
		const [keptGame, hiddenGame] = await createGamesInGenre(genre, 2);
		await hiddenGame!.update({ isActive: false });

		const response = await getGenreGames(reader.authorization, "horror");

		assert.deepEqual(
			response.body.data.games.map((game: { id: string }) => game.id),
			[keptGame!.id]
		);
	});

	void it("answers 404 GENRE_NOT_FOUND for an unknown code", async () => {
		const reader = await createUserWithSession();

		const response = await getGenreGames(
			reader.authorization,
			"does-not-exist"
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GENRE_NOT_FOUND");
	});

	void it("rejects out-of-range or malformed pagination with 422 COMMON_SCHEMA_INVALID", async () => {
		const reader = await createUserWithSession();
		const invalidQueries = [
			"?limit=0",
			"?limit=101",
			"?limit=abc",
			"?limit=1.5",
			"?offset=-1"
		];

		for (const query of invalidQueries) {
			const response = await getGenreGames(
				reader.authorization,
				"horror",
				query
			);
			assert.equal(response.status, 422, query);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID", query);
		}
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/genres/horror/games");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/genres/horror/games")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
