import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Job } from "../../src/jobs/job.model";
import { Review } from "../../src/reviews/review.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

useTestDatabase();

const GAMES_COUNT = 6;

function finishedJob(jobId: string) {
	return eventually(async () => {
		const job = await Job.findByPk(jobId);
		assert.ok(job);
		assert.notEqual(job.status, "running");
		return job;
	});
}

async function runJob(authorization: string, path: string) {
	const response = await api()
		.post(`/admin/jobs/${path}`)
		.set("Authorization", authorization)
		.expect(202);
	return finishedJob(response.body.data.job.id);
}

async function createGames(count: number) {
	const games = [];
	for (let index = 0; index < count; index++) games.push(await createGame());
	return games;
}

void describe("community aggregation jobs write in batches", () => {
	void it("calculate-ratings stores one score per game and overwrites it on the next run", async () => {
		const admin = await createUserWithSession("admin");
		const games = await createGames(GAMES_COUNT);
		const reviewers = [await createUser(), await createUser()];
		await Review.bulkCreate(
			games.flatMap((game, gameIndex) =>
				reviewers.map(reviewer => ({
					userId: reviewer.id,
					gameId: game.id,
					rating: (gameIndex % 5) + 1
				}))
			)
		);

		const first = await runJob(admin.authorization, "calculate-ratings");
		assert.equal(first.status, "completed");
		assert.equal(
			await GameScore.count({ where: { source: "completr" } }),
			GAMES_COUNT
		);

		await Review.update({ rating: 5 }, { where: { gameId: games[0]?.id } });
		const second = await runJob(admin.authorization, "calculate-ratings");

		assert.equal(second.status, "completed");
		assert.equal(
			await GameScore.count({ where: { source: "completr" } }),
			GAMES_COUNT
		);
		const refreshed = await GameScore.findOne({
			where: { gameId: games[0]?.id, source: "completr" }
		});
		assert.equal(refreshed?.score, 5);
	});

	void it("calculate-durations stores one time per game and overwrites it on the next run", async () => {
		const admin = await createUserWithSession("admin");
		const games = await createGames(GAMES_COUNT);
		const platform = await createPlatform();
		const players = [await createUser(), await createUser()];
		for (const game of games)
			for (const player of players) {
				const backlog = await createBacklog(
					player.id,
					game.id,
					platform.id,
					{ status: "completed" }
				);
				await backlog.update({ realDuration: 10 });
			}

		const first = await runJob(admin.authorization, "calculate-durations");
		assert.equal(first.status, "completed");
		assert.equal(
			await GameTime.count({ where: { source: "completr" } }),
			GAMES_COUNT
		);

		await runJob(admin.authorization, "calculate-durations");

		assert.equal(
			await GameTime.count({ where: { source: "completr" } }),
			GAMES_COUNT
		);
	});

	void it("starts twice at once without duplicating or failing the stored scores", async () => {
		const admin = await createUserWithSession("admin");
		const games = await createGames(GAMES_COUNT);
		const reviewers = [await createUser(), await createUser()];
		await Review.bulkCreate(
			games.flatMap(game =>
				reviewers.map(reviewer => ({
					userId: reviewer.id,
					gameId: game.id,
					rating: 4
				}))
			)
		);

		const responses = await Promise.all([
			api()
				.post("/admin/jobs/calculate-ratings")
				.set("Authorization", admin.authorization),
			api()
				.post("/admin/jobs/calculate-ratings")
				.set("Authorization", admin.authorization)
		]);
		for (const response of responses) assert.equal(response.status, 202);
		await finishedJob(responses[0]?.body.data.job.id);

		assert.equal(
			await GameScore.count({ where: { source: "completr" } }),
			GAMES_COUNT
		);
	});
});
