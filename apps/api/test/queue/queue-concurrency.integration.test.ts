import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { Queue } from "../../src/queue/queue.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

const QUEUE_PATH = "/users/me/queue";
const FREE_QUEUE_LIMIT = 10;
const SIMULTANEOUS_REQUESTS = 5;

useTestDatabase();

async function seedQueue(userId: string, count: number) {
	const platform = await createPlatform();
	for (let index = 0; index < count; index++) {
		const game = await createGame();
		const backlog = await createBacklog(userId, game.id, platform.id);
		await Queue.create({
			userId,
			backlogId: backlog.id,
			position: index + 1
		});
	}
}

async function positionsOf(userId: string) {
	const entries = await Queue.findAll({
		where: { userId },
		order: [["position", "ASC"]]
	});
	return entries.map(entry => entry.position);
}

void describe("queue under concurrent requests", () => {
	void it("never exceeds the free limit when adds from a game race for the last slot", async () => {
		const owner = await createUserWithSession();
		await seedQueue(owner.user.id, FREE_QUEUE_LIMIT - 1);
		const platform = await createPlatform();
		const games = await Promise.all(
			Array.from({ length: SIMULTANEOUS_REQUESTS }, () => createGame())
		);

		const responses = await Promise.all(
			games.map(game =>
				api()
					.post(`${QUEUE_PATH}?source=game`)
					.set("Authorization", owner.authorization)
					.send({ id: game.id, platformId: platform.id })
			)
		);

		assert.equal(responses.filter(r => r.status === 201).length, 1);
		assert.equal(
			responses.filter(r => r.body.type === "QUEUE_LIMIT_REACHED").length,
			SIMULTANEOUS_REQUESTS - 1
		);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			FREE_QUEUE_LIMIT
		);
		assert.equal(
			await Backlog.count({ where: { userId: owner.user.id } }),
			FREE_QUEUE_LIMIT
		);
	});

	void it("leaves no orphan backlog behind when the limit rejects an add from a game", async () => {
		const owner = await createUserWithSession();
		await seedQueue(owner.user.id, FREE_QUEUE_LIMIT);
		const [game, platform] = await Promise.all([
			createGame(),
			createPlatform()
		]);

		const response = await api()
			.post(`${QUEUE_PATH}?source=game`)
			.set("Authorization", owner.authorization)
			.send({ id: game.id, platformId: platform.id });

		assert.equal(response.status, 402);
		assert.equal(
			await Backlog.count({ where: { userId: owner.user.id, gameId: game.id } }),
			0
		);
	});

	void it("gives every concurrent add its own consecutive position", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();
		const backlogs = await Promise.all(
			Array.from({ length: SIMULTANEOUS_REQUESTS }, async () => {
				const game = await createGame();
				return createBacklog(owner.user.id, game.id, platform.id);
			})
		);

		const responses = await Promise.all(
			backlogs.map(backlog =>
				api()
					.post(`${QUEUE_PATH}?source=backlog`)
					.set("Authorization", owner.authorization)
					.send({ id: backlog.id })
			)
		);

		assert.ok(responses.every(r => r.status === 201));
		assert.deepEqual(
			await positionsOf(owner.user.id),
			backlogs.map((_, index) => index + 1)
		);
	});

	void it("answers 404 QUEUE_BACKLOG_NOT_FOUND for a backlog of someone else without queueing it", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const [game, platform] = await Promise.all([
			createGame(),
			createPlatform()
		]);
		const backlog = await createBacklog(owner.user.id, game.id, platform.id);

		const response = await api()
			.post(`${QUEUE_PATH}?source=backlog`)
			.set("Authorization", intruder.authorization)
			.send({ id: backlog.id });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_FOUND");
		assert.equal(await Queue.count({ where: { backlogId: backlog.id } }), 0);
	});
});
