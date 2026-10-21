import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, mock } from "node:test";

import { GameTime } from "../../src/game-times/game-time.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createGameTime } from "../helpers/factories.helper";

useTestDatabase();

async function storedTimes(gameId: string) {
	const rows = await GameTime.findAll({
		where: { gameId },
		order: [["source", "ASC"]]
	});
	return rows.map(row => ({ source: row.source, duration: row.duration }));
}

void describe("PUT /games/:gameId/times", () => {
	void it("upserts the sent durations and deletes the missing ones", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();
		await createGameTime(game.id, "hltb", 12);
		await createGameTime(game.id, "rawg", 8);
		await createGameTime(game.id, "completr", 10);

		const response = await api()
			.put(`/games/${game.id}/times`)
			.set("Authorization", moderator.authorization)
			.send({ times: [{ source: "hltb", duration: 20 }] });

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.gameTimes.map(
				(entry: { source: string; duration: number }) => ({
					source: entry.source,
					duration: entry.duration
				})
			),
			[{ source: "hltb", duration: 20 }]
		);
		assert.deepEqual(await storedTimes(game.id), [
			{ source: "hltb", duration: 20 },
			{ source: "completr", duration: 10 }
		]);
	});

	void it("accepts an empty set and clears every manual duration", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();
		await createGameTime(game.id, "hltb", 12);

		const response = await api()
			.put(`/games/${game.id}/times`)
			.set("Authorization", moderator.authorization)
			.send({ times: [] });

		assert.equal(response.status, 200);
		assert.deepEqual(await storedTimes(game.id), []);
	});

	void it("rolls back deletes and upserts when a write fails midway", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();
		await createGameTime(game.id, "hltb", 12);
		await createGameTime(game.id, "rawg", 8);

		const originalUpsert = GameTime.upsert.bind(GameTime);
		let calls = 0;
		const upsertMock = mock.method(
			GameTime,
			"upsert",
			(...args: Parameters<typeof GameTime.upsert>) => {
				calls += 1;
				if (calls === 2) throw new Error("boom");
				return originalUpsert(...args);
			}
		);

		try {
			const response = await api()
				.put(`/games/${game.id}/times`)
				.set("Authorization", moderator.authorization)
				.send({
					times: [
						{ source: "hltb", duration: 99 },
						{ source: "rawg", duration: 98 }
					]
				});
			assert.equal(response.status, 500);
		} finally {
			upsertMock.mock.restore();
		}

		assert.deepEqual(await storedTimes(game.id), [
			{ source: "hltb", duration: 12 },
			{ source: "rawg", duration: 8 }
		]);
	});

	void it("returns 404 when the game does not exist", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await api()
			.put(`/games/${randomUUID()}/times`)
			.set("Authorization", moderator.authorization)
			.send({ times: [{ source: "hltb", duration: 5 }] });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_TIME_GAME_NOT_FOUND");
	});

	void it("rejects repeated and computed sources", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();

		const repeated = await api()
			.put(`/games/${game.id}/times`)
			.set("Authorization", moderator.authorization)
			.send({
				times: [
					{ source: "hltb", duration: 1 },
					{ source: "hltb", duration: 2 }
				]
			});
		const computed = await api()
			.put(`/games/${game.id}/times`)
			.set("Authorization", moderator.authorization)
			.send({ times: [{ source: "completr", duration: 1 }] });

		assert.equal(repeated.status, 422);
		assert.equal(computed.status, 422);
	});

	void it("is restricted to moderators", async () => {
		const user = await createUserWithSession("user");
		const game = await createGame();

		const anonymous = await api()
			.put(`/games/${game.id}/times`)
			.send({ times: [] });
		const forbidden = await api()
			.put(`/games/${game.id}/times`)
			.set("Authorization", user.authorization)
			.send({ times: [] });

		assert.equal(anonymous.status, 422);
		assert.equal(forbidden.status, 403);
	});
});
