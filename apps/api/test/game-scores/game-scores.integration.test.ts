import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createScoreSource
} from "../helpers/factories.helper";

let metacritic: string;
let opencritic: string;

useTestDatabase(async () => {
	metacritic = (await createScoreSource({ code: "metacritic-t" })).code;
	opencritic = (await createScoreSource({ code: "opencritic-t" })).code;
});

function getGameScores(authorization: string, gameId: string) {
	return api()
		.get(`/game-scores/${gameId}`)
		.set("Authorization", authorization);
}

function sourcesAndScores(
	scores: { source: string; score: number }[]
): [string, number][] {
	return scores
		.map((entry): [string, number] => [entry.source, entry.score])
		.sort(([left], [right]) => left.localeCompare(right));
}

void describe("GET /game-scores/:gameId", () => {
	void it("lists the scores of the game with their fields", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();
		const stored = await createGameScore(game.id, metacritic, 88);
		await createGameScore(game.id, opencritic, 76);

		const response = await getGameScores(reader.authorization, game.id);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.gameScores.length, 2);
		const entry = response.body.data.gameScores.find(
			(score: { source: string }) => score.source === metacritic
		);
		assert.equal(entry.id, stored.id);
		assert.equal(entry.gameId, game.id);
		assert.equal(entry.score, 88);
		assert.ok(entry.updatedAt);
		assert.deepEqual(sourcesAndScores(response.body.data.gameScores), [
			[metacritic, 88],
			[opencritic, 76]
		]);
	});

	void it("returns only the scores that belong to the requested game", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();
		const otherGame = await createGame();
		await createGameScore(game.id, metacritic, 91);
		await createGameScore(otherGame.id, metacritic, 40);
		await createGameScore(otherGame.id, opencritic, 41);

		const response = await getGameScores(reader.authorization, game.id);

		assert.deepEqual(sourcesAndScores(response.body.data.gameScores), [
			[metacritic, 91]
		]);
	});

	void it("returns an empty list for a game without scores", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();

		const response = await getGameScores(reader.authorization, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { gameScores: [] });
	});

	void it("returns an empty list for a game that does not exist", async () => {
		const reader = await createUserWithSession();

		const response = await getGameScores(
			reader.authorization,
			randomUUID()
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { gameScores: [] });
	});

	void it("reflects a score added after a previous read", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();
		await createGameScore(game.id, metacritic, 70);

		const before = await getGameScores(reader.authorization, game.id);
		await createGameScore(game.id, opencritic, 65);
		const after = await getGameScores(reader.authorization, game.id);

		assert.equal(before.body.data.gameScores.length, 1);
		assert.equal(after.body.data.gameScores.length, 2);
	});

	void it("serves users, premium, moderators and admins", async () => {
		const game = await createGame();
		await createGameScore(game.id, metacritic, 80);
		const accounts = await Promise.all([
			createUserWithSession("user"),
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await getGameScores(
				account.authorization,
				game.id
			);
			assert.equal(response.status, 200);
			assert.equal(response.body.data.gameScores.length, 1);
		}
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const reader = await createUserWithSession();

		const response = await getGameScores(
			reader.authorization,
			"not-a-uuid"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get(`/game-scores/${randomUUID()}`);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get(`/game-scores/${randomUUID()}`)
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
