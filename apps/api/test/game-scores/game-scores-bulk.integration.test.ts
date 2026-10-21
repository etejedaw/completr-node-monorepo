import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, mock } from "node:test";

import { GameScore } from "../../src/game-scores/game-score.model";
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
	await createScoreSource({ code: "completr" });
});

async function storedScores(gameId: string) {
	const rows = await GameScore.findAll({
		where: { gameId },
		order: [["source", "ASC"]]
	});
	return rows.map(row => ({ source: row.source, score: row.score }));
}

void describe("PUT /games/:gameId/scores", () => {
	void it("upserts the sent scores and deletes the missing ones", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();
		await createGameScore(game.id, metacritic, 70);
		await createGameScore(game.id, opencritic, 60);
		await createGameScore(game.id, "completr", 9);

		const response = await api()
			.put(`/games/${game.id}/scores`)
			.set("Authorization", moderator.authorization)
			.send({ scores: [{ source: metacritic, score: 88 }] });

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.gameScores.map(
				(entry: { source: string; score: number }) => ({
					source: entry.source,
					score: entry.score
				})
			),
			[{ source: metacritic, score: 88 }]
		);
		assert.deepEqual(await storedScores(game.id), [
			{ source: "completr", score: 9 },
			{ source: metacritic, score: 88 }
		]);
	});

	void it("accepts an empty set and clears every manual score", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();
		await createGameScore(game.id, metacritic, 70);

		const response = await api()
			.put(`/games/${game.id}/scores`)
			.set("Authorization", moderator.authorization)
			.send({ scores: [] });

		assert.equal(response.status, 200);
		assert.deepEqual(await storedScores(game.id), []);
	});

	void it("applies nothing when a source does not exist", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();
		await createGameScore(game.id, metacritic, 70);

		const response = await api()
			.put(`/games/${game.id}/scores`)
			.set("Authorization", moderator.authorization)
			.send({
				scores: [
					{ source: metacritic, score: 99 },
					{ source: "missing-source", score: 10 }
				]
			});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_SCORE_SOURCE_NOT_FOUND");
		assert.deepEqual(await storedScores(game.id), [
			{ source: metacritic, score: 70 }
		]);
	});

	void it("rolls back deletes and upserts when a write fails midway", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();
		await createGameScore(game.id, metacritic, 70);
		await createGameScore(game.id, opencritic, 60);

		const originalUpsert = GameScore.upsert.bind(GameScore);
		let calls = 0;
		const upsertMock = mock.method(
			GameScore,
			"upsert",
			(...args: Parameters<typeof GameScore.upsert>) => {
				calls += 1;
				if (calls === 2) throw new Error("boom");
				return originalUpsert(...args);
			}
		);

		try {
			const failing = await api()
				.put(`/games/${game.id}/scores`)
				.set("Authorization", moderator.authorization)
				.send({
					scores: [
						{ source: metacritic, score: 10 },
						{ source: opencritic, score: 20 }
					]
				});
			assert.equal(failing.status, 500);
		} finally {
			upsertMock.mock.restore();
		}

		assert.deepEqual(await storedScores(game.id), [
			{ source: metacritic, score: 70 },
			{ source: opencritic, score: 60 }
		]);
	});

	void it("returns 404 when the game does not exist", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await api()
			.put(`/games/${randomUUID()}/scores`)
			.set("Authorization", moderator.authorization)
			.send({ scores: [{ source: metacritic, score: 50 }] });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_SCORE_GAME_NOT_FOUND");
	});

	void it("rejects repeated sources and the completr source", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();

		const repeated = await api()
			.put(`/games/${game.id}/scores`)
			.set("Authorization", moderator.authorization)
			.send({
				scores: [
					{ source: metacritic, score: 1 },
					{ source: metacritic, score: 2 }
				]
			});
		const computed = await api()
			.put(`/games/${game.id}/scores`)
			.set("Authorization", moderator.authorization)
			.send({ scores: [{ source: "completr", score: 1 }] });

		assert.equal(repeated.status, 422);
		assert.equal(computed.status, 422);
	});

	void it("is restricted to moderators", async () => {
		const user = await createUserWithSession("user");
		const game = await createGame();

		const anonymous = await api()
			.put(`/games/${game.id}/scores`)
			.send({ scores: [] });
		const forbidden = await api()
			.put(`/games/${game.id}/scores`)
			.set("Authorization", user.authorization)
			.send({ scores: [] });

		assert.equal(anonymous.status, 422);
		assert.equal(forbidden.status, 403);
	});
});
