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
		const request = api().get(
			`${path}?limit=${PAGE_SIZE}&offset=${offset}`
		);
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

		const ids = await readAllPages(
			"/users/me/game-shelf",
			owner.authorization
		);

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

void describe("game shelf filter by game_id", () => {
	async function setup() {
		const owner = await createUserWithSession();
		const [target, other, platform] = await Promise.all([
			createGame(),
			createGame(),
			createPlatform()
		]);
		await createShelfEntries(owner.user.id, target.id, platform.id, 1);
		await createShelfEntries(owner.user.id, other.id, platform.id, 3);
		return { owner, target, other, platform };
	}

	void it("returns only the entries of that game", async () => {
		const { owner, target } = await setup();

		const response = await api()
			.get(`/users/me/game-shelf?game_id=${target.id}&limit=1`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 1);
		assert.equal(response.body.data.gameShelf.length, 1);
		assert.equal(response.body.data.gameShelf[0].game.id, target.id);
	});

	void it("is empty for a game that is not on the shelf", async () => {
		const { owner } = await setup();
		const stranger = await createGame();

		const response = await api()
			.get(`/users/me/game-shelf?game_id=${stranger.id}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { gameShelf: [], total: 0 });
	});

	void it("does not reveal the shelf of another user", async () => {
		const { target } = await setup();
		const intruder = await createUserWithSession();

		const response = await api()
			.get(`/users/me/game-shelf?game_id=${target.id}`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { gameShelf: [], total: 0 });
	});

	void it("combines with pagination keeping the total of the filter", async () => {
		const { owner, target, platform } = await setup();
		await createShelfEntries(owner.user.id, target.id, platform.id, 4);

		const response = await api()
			.get(`/users/me/game-shelf?game_id=${target.id}&limit=2&offset=3`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 5);
		assert.equal(response.body.data.gameShelf.length, 2);
	});

	void it("leaves the unfiltered listing unchanged", async () => {
		const { owner } = await setup();

		const response = await api()
			.get("/users/me/game-shelf")
			.set("Authorization", owner.authorization);

		assert.equal(response.body.data.total, 4);
	});

	void it("rejects garbage with 422 COMMON_SCHEMA_INVALID", async () => {
		const { owner } = await setup();
		for (const query of [
			"game_id=not-a-uuid",
			"game_id=",
			"game_id[]=x",
			"gameId=00000000-0000-4000-8000-000000000000",
			"unknown=1"
		]) {
			const response = await api()
				.get(`/users/me/game-shelf?${query}`)
				.set("Authorization", owner.authorization);

			assert.equal(response.status, 422, query);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID", query);
		}
	});
});
