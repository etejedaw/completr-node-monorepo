import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createGameTime } from "../helpers/factories.helper";

useTestDatabase();

function getGameTimes(authorization: string, gameId: string) {
	return api()
		.get(`/game-times/${gameId}`)
		.set("Authorization", authorization);
}

function sourcesAndDurations(
	times: { source: string; duration: number }[]
): [string, number][] {
	return times
		.map((entry): [string, number] => [entry.source, entry.duration])
		.sort(([left], [right]) => left.localeCompare(right));
}

void describe("GET /game-times/:gameId", () => {
	void it("lists the durations of the game with their fields", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();
		const stored = await createGameTime(game.id, "hltb", 12.5);
		await createGameTime(game.id, "completr", 14);

		const response = await getGameTimes(reader.authorization, game.id);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.gameTimes.length, 2);
		const entry = response.body.data.gameTimes.find(
			(time: { source: string }) => time.source === "hltb"
		);
		assert.equal(entry.id, stored.id);
		assert.equal(entry.gameId, game.id);
		assert.equal(entry.duration, 12.5);
		assert.ok(entry.updatedAt);
		assert.deepEqual(sourcesAndDurations(response.body.data.gameTimes), [
			["completr", 14],
			["hltb", 12.5]
		]);
	});

	void it("returns only the durations that belong to the requested game", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();
		const otherGame = await createGame();
		await createGameTime(game.id, "hltb", 20);
		await createGameTime(otherGame.id, "hltb", 99);
		await createGameTime(otherGame.id, "rawg", 98);

		const response = await getGameTimes(reader.authorization, game.id);

		assert.deepEqual(sourcesAndDurations(response.body.data.gameTimes), [
			["hltb", 20]
		]);
	});

	void it("returns an empty list for a game without durations", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();

		const response = await getGameTimes(reader.authorization, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { gameTimes: [] });
	});

	void it("returns an empty list for a game that does not exist", async () => {
		const reader = await createUserWithSession();

		const response = await getGameTimes(reader.authorization, randomUUID());

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { gameTimes: [] });
	});

	void it("reflects a duration added after a previous read", async () => {
		const reader = await createUserWithSession();
		const game = await createGame();
		await createGameTime(game.id, "hltb", 8);

		const before = await getGameTimes(reader.authorization, game.id);
		await createGameTime(game.id, "rawg", 9);
		const after = await getGameTimes(reader.authorization, game.id);

		assert.equal(before.body.data.gameTimes.length, 1);
		assert.equal(after.body.data.gameTimes.length, 2);
	});

	void it("serves users, premium, moderators and admins", async () => {
		const game = await createGame();
		await createGameTime(game.id, "hltb", 30);
		const accounts = await Promise.all([
			createUserWithSession("user"),
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await getGameTimes(account.authorization, game.id);
			assert.equal(response.status, 200);
			assert.equal(response.body.data.gameTimes.length, 1);
		}
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const reader = await createUserWithSession();

		const response = await getGameTimes(reader.authorization, "not-a-uuid");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get(`/game-times/${randomUUID()}`);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get(`/game-times/${randomUUID()}`)
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
