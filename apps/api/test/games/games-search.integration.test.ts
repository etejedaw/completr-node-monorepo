import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GameGenre } from "../../src/game-genre/game-genre.model";
import { GamePlatform } from "../../src/game-platform/game-platform.model";
import { type Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createGameTime,
	createPlatform,
	createScoreSource
} from "../helpers/factories.helper";

const LOCAL_SEARCH_LIMIT = 10;

let authorization: string;
let mario: Game;

useTestDatabase(async () => {
	await createScoreSource({ code: "completr", scale: 5, priority: 5 });
	const [platform, genre] = await Promise.all([
		createPlatform(),
		Genre.create({ name: "Search Genre", code: "search-g" })
	]);
	mario = await createGame({ title: "Super Mario Bros." });
	await createGame({ title: "Super Metroid" });
	await createGame({ title: "Pokémon Édition Rouge" });
	await createGame({ title: "Pokemon Snap" });
	await createGame({ title: "Retired Mario Kart", isActive: false });
	await Promise.all(
		Array.from({ length: LOCAL_SEARCH_LIMIT + 2 }, (_, index) =>
			createGame({ title: `Crowded Title ${index}` })
		)
	);
	await GameGenre.create({ gameId: mario.id, genreId: genre.id });
	await GamePlatform.create({ gameId: mario.id, platformId: platform.id });
	await createGameScore(mario.id, "completr", 4);
	await createGameTime(mario.id, "completr", 10);
	authorization = (await createUserWithSession()).authorization;
});

function searchGames(query: Record<string, string>) {
	return api()
		.get("/games/search")
		.query(query)
		.set("Authorization", authorization);
}

function titlesOf(body: { data: { games: { title: string }[] } }) {
	return body.data.games.map(game => game.title).sort();
}

void describe("GET /games/search local results", () => {
	void it("returns the matching game with its full serialization", async () => {
		const response = await searchGames({
			query: "super mario",
			local_only: "true"
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 1);
		const [entry] = response.body.data.games;
		assert.equal(entry.id, mario.id);
		assert.equal(entry.title, "Super Mario Bros.");
		assert.equal(entry.code, mario.code);
		assert.equal(entry.isActive, true);
		assert.equal(entry.justImported, false);
		assert.equal(entry.ratio, 8);
		assert.equal(entry.platforms.length, 1);
		assert.deepEqual(
			entry.genres.map((genre: { code: string }) => genre.code),
			["search-g"]
		);
		assert.equal(entry.scores.length, 1);
		assert.equal(entry.times.length, 1);
	});

	void it("matches without caring about accents in the title or in the query", async () => {
		const plainQuery = await searchGames({
			query: "pokemon",
			local_only: "true"
		});
		const accentedQuery = await searchGames({
			query: "Pokémon",
			local_only: "true"
		});
		const accentedWords = await searchGames({
			query: "edition rouge",
			local_only: "true"
		});

		assert.deepEqual(titlesOf(plainQuery.body), [
			"Pokemon Snap",
			"Pokémon Édition Rouge"
		]);
		assert.deepEqual(titlesOf(accentedQuery.body), [
			"Pokemon Snap",
			"Pokémon Édition Rouge"
		]);
		assert.deepEqual(titlesOf(accentedWords.body), [
			"Pokémon Édition Rouge"
		]);
	});

	void it("ignores case and punctuation and requires every token", async () => {
		const punctuated = await searchGames({
			query: "SUPER, mario: bros!",
			local_only: "true"
		});
		const partial = await searchGames({
			query: "super zelda",
			local_only: "true"
		});

		assert.deepEqual(titlesOf(punctuated.body), ["Super Mario Bros."]);
		assert.deepEqual(partial.body.data.games, []);
	});

	void it("finds several games that share a token", async () => {
		const response = await searchGames({
			query: "super",
			local_only: "true"
		});

		assert.deepEqual(titlesOf(response.body), [
			"Super Mario Bros.",
			"Super Metroid"
		]);
	});

	void it("does not return inactive games", async () => {
		const response = await searchGames({
			query: "retired",
			local_only: "true"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
	});

	void it("returns nothing for a query made only of punctuation", async () => {
		const response = await searchGames({
			query: "!!! ???",
			local_only: "true"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.games, []);
	});

	void it("caps local results at ten games", async () => {
		const response = await searchGames({
			query: "crowded",
			local_only: "true"
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, LOCAL_SEARCH_LIMIT);
	});

	void it("reflects a game deactivated after a previous search", async () => {
		const game = await createGame({ title: "Vanishing Quest" });

		const before = await searchGames({
			query: "vanishing",
			local_only: "true"
		});
		await game.update({ isActive: false });
		const after = await searchGames({
			query: "vanishing",
			local_only: "true"
		});

		assert.equal(before.body.data.games.length, 1);
		assert.deepEqual(after.body.data.games, []);
	});
});

void describe("GET /games/search without local_only", () => {
	void it("answers with the local catalog when it has a match", async () => {
		const response = await searchGames({ query: "metroid" });

		assert.equal(response.status, 200);
		assert.deepEqual(titlesOf(response.body), ["Super Metroid"]);
		assert.equal(response.body.data.games[0].justImported, false);
	});

	void it(
		"treats force_rawg=false as false and searches the local catalog",
		{
			todo: "bug: force_rawg and local_only use z.coerce.boolean, so the string false becomes true"
		},
		async () => {
			const response = await searchGames({
				query: "metroid",
				force_rawg: "false"
			});

			assert.equal(response.status, 200);
			assert.deepEqual(titlesOf(response.body), ["Super Metroid"]);
		}
	);
});

void describe("GET /games/search validation and authentication", () => {
	void it("rejects invalid query parameters with 422 COMMON_SCHEMA_INVALID", async () => {
		const invalidQueries: Record<string, string>[] = [
			{},
			{ query: "" },
			{ query: "x".repeat(201) },
			{ query: "mario", unknown_filter: "1" }
		];

		for (const query of invalidQueries) {
			const response = await searchGames(query);
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
				.get("/games/search")
				.query({ query: "metroid", local_only: "true" })
				.set("Authorization", account.authorization);
			assert.equal(response.status, 200);
		}
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api()
			.get("/games/search")
			.query({ query: "mario" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/games/search")
			.query({ query: "mario" })
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
