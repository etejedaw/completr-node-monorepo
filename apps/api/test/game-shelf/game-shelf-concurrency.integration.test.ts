import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createShelfEntries
} from "../helpers/factories.helper";

const FREE_SHELF_LIMIT = 250;
const SIMULTANEOUS_REQUESTS = 5;

useTestDatabase();

void describe("POST /users/me/game-shelf under concurrent requests", () => {
	void it("never exceeds the free limit when several adds race for the last slot", async () => {
		const owner = await createUserWithSession();
		const [seedGame, seedPlatform] = await Promise.all([
			createGame(),
			createPlatform()
		]);
		await createShelfEntries(
			owner.user.id,
			seedGame.id,
			seedPlatform.id,
			FREE_SHELF_LIMIT - 1
		);
		const platform = await createPlatform();
		const games = await Promise.all(
			Array.from({ length: SIMULTANEOUS_REQUESTS }, () => createGame())
		);

		const responses = await Promise.all(
			games.map(game =>
				api()
					.post("/users/me/game-shelf")
					.set("Authorization", owner.authorization)
					.send({ gameId: game.id, platformId: platform.id })
			)
		);

		assert.equal(responses.filter(r => r.status === 201).length, 1);
		assert.equal(
			responses.filter(r => r.status === 402).length,
			SIMULTANEOUS_REQUESTS - 1
		);
		assert.equal(
			await GameShelf.count({ where: { userId: owner.user.id } }),
			FREE_SHELF_LIMIT
		);
	});
});
