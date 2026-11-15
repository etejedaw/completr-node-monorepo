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

const TOTAL_ENTRIES = 30;
const PAGE_SIZE = 7;

useTestDatabase();

async function seedShelf(userId: string) {
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	await createShelfEntries(userId, game.id, platform.id, TOTAL_ENTRIES);
	await GameShelf.update({ isPublic: true }, { where: { userId } });
}

async function readAllPages(path: string, authorization?: string) {
	const ids: string[] = [];
	for (let offset = 0; offset < TOTAL_ENTRIES; offset += PAGE_SIZE) {
		const request = api().get(`${path}?limit=${PAGE_SIZE}&offset=${offset}`);
		const response = authorization
			? await request.set("Authorization", authorization)
			: await request;
		assert.equal(response.status, 200);
		for (const entry of response.body.data.gameShelf as { id: string }[])
			ids.push(entry.id);
	}
	return ids;
}

void describe("game shelf pagination", () => {
	void it("walks the whole own shelf without repeating or skipping entries", async () => {
		const owner = await createUserWithSession();
		await seedShelf(owner.user.id);

		const ids = await readAllPages("/users/me/game-shelf", owner.authorization);

		assert.equal(ids.length, TOTAL_ENTRIES);
		assert.equal(new Set(ids).size, TOTAL_ENTRIES);
	});

	void it("walks the whole public shelf without repeating or skipping entries", async () => {
		const owner = await createUserWithSession();
		await seedShelf(owner.user.id);

		const ids = await readAllPages(
			`/users/${owner.user.username}/game-shelf`
		);

		assert.equal(ids.length, TOTAL_ENTRIES);
		assert.equal(new Set(ids).size, TOTAL_ENTRIES);
	});

	void it("returns the same order on repeated requests", async () => {
		const owner = await createUserWithSession();
		await seedShelf(owner.user.id);

		const first = await readAllPages(
			"/users/me/game-shelf",
			owner.authorization
		);
		const second = await readAllPages(
			"/users/me/game-shelf",
			owner.authorization
		);

		assert.deepEqual(first, second);
	});
});
