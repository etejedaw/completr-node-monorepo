import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { createUserWithSession } from "../helpers/auth.helper";
import {
	itRejectsInvalidBulkRequests,
	postBulk,
	skippedIds
} from "../helpers/bulk.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

const BULK_PATH = "/users/me/platinums/bulk";

useTestDatabase();

async function createPlatinums(userId: string, count: number) {
	const gameIds = [];
	for (let index = 0; index < count; index++) {
		const [game, platform] = await Promise.all([
			createGame(),
			createPlatform()
		]);
		const run = await createBacklog(userId, game.id, platform.id, {
			status: "completed"
		});
		await GamePlatinum.create({
			userId,
			gameId: game.id,
			backlogId: run.id,
			platformId: platform.id
		});
		gameIds.push(game.id);
	}
	return gameIds;
}

function bulkDelete(authorization: string, gameIds: string[]) {
	return postBulk(BULK_PATH, authorization, "delete", { gameIds });
}

void describe("POST /users/me/platinums/bulk?action=delete", () => {
	void it("deletes every owned platinum and keeps the runs", async () => {
		const owner = await createUserWithSession();
		const gameIds = await createPlatinums(owner.user.id, 3);

		const response = await bulkDelete(owner.authorization, gameIds);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			action: "delete",
			succeeded: gameIds,
			skipped: []
		});
		assert.equal(
			await GamePlatinum.count({ where: { userId: owner.user.id } }),
			0
		);
		assert.equal(
			await Backlog.count({ where: { userId: owner.user.id } }),
			3
		);
	});

	void it("skips games without an own platinum with GAME_PLATINUM_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const [own] = await createPlatinums(owner.user.id, 1);
		const [foreign] = await createPlatinums(stranger.id, 1);
		const withoutPlatinum = (await createGame()).id;
		const missing = randomUUID();

		const response = await bulkDelete(owner.authorization, [
			foreign!,
			own!,
			withoutPlatinum,
			missing,
			own!
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [own]);
		assert.deepEqual(response.body.data.skipped, [
			{ id: foreign, code: "GAME_PLATINUM_NOT_FOUND" },
			{ id: withoutPlatinum, code: "GAME_PLATINUM_NOT_FOUND" },
			{ id: missing, code: "GAME_PLATINUM_NOT_FOUND" }
		]);
		assert.equal(
			await GamePlatinum.count({ where: { userId: stranger.id } }),
			1
		);
	});

	void it("skips everything on a second identical batch", async () => {
		const owner = await createUserWithSession();
		const gameIds = await createPlatinums(owner.user.id, 2);

		await bulkDelete(owner.authorization, gameIds).expect(200);
		const response = await bulkDelete(owner.authorization, gameIds);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, []);
		assert.deepEqual(
			skippedIds(response.body.data.skipped),
			[...gameIds].sort()
		);
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "delete",
		idsKey: "gameIds",
		otherActionBody: { ids: [randomUUID()] }
	});
});
