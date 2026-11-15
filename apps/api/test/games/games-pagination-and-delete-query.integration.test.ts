import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Game } from "../../src/games/game.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";

const GAMES_WITH_THE_SAME_CREATION_TIME = 7;
const PAGE_SIZE = 2;

let userAuthorization: string;
let adminAuthorization: string;

useTestDatabase(async () => {
	userAuthorization = (await createUserWithSession()).authorization;
	adminAuthorization = (await createUserWithSession("admin")).authorization;
});

async function createGamesCreatedAtTheSameInstant() {
	const createdAt = new Date("2026-01-01T00:00:00.000Z");
	const games = await Promise.all(
		Array.from({ length: GAMES_WITH_THE_SAME_CREATION_TIME }, () =>
			createGame()
		)
	);
	await Game.update(
		{ createdAt },
		{ where: { id: games.map(game => game.id) }, silent: true }
	);
	return games.map(game => game.id);
}

async function readAllPages(sortBy: string, sortOrder: string) {
	const collected: string[] = [];
	for (let offset = 0; ; offset += PAGE_SIZE) {
		const response = await api()
			.get("/games")
			.query({
				limit: PAGE_SIZE,
				offset,
				sort_by: sortBy,
				sort_order: sortOrder
			})
			.set("Authorization", userAuthorization);
		assert.equal(response.status, 200);
		const ids = response.body.data.games.map(
			(game: { id: string }) => game.id
		);
		collected.push(...ids);
		if (ids.length < PAGE_SIZE) return collected;
	}
}

void describe("GET /games pagination with repeated sort values", () => {
	for (const sortOrder of ["asc", "desc"]) {
		void it(`never repeats or skips a game while paging ${sortOrder}`, async () => {
			const created = await createGamesCreatedAtTheSameInstant();

			const collected = await readAllPages("createdAt", sortOrder);

			assert.equal(new Set(collected).size, collected.length);
			for (const id of created) assert.ok(collected.includes(id));
		});
	}

	void it("pages the derived sorts without repeating games", async () => {
		await createGamesCreatedAtTheSameInstant();

		for (const sortBy of ["score", "duration", "ratio", "popularity"]) {
			const collected = await readAllPages(sortBy, "desc");
			assert.equal(new Set(collected).size, collected.length);
			assert.ok(collected.length >= GAMES_WITH_THE_SAME_CREATION_TIME);
		}
	});
});

void describe("DELETE /games/:id query", () => {
	for (const hard of ["maybe", "2", "TRUE!", ""]) {
		void it(`rejects hard="${hard}" without deleting anything`, async () => {
			const game = await createGame();

			const response = await api()
				.delete(`/games/${game.id}`)
				.query({ hard })
				.set("Authorization", adminAuthorization);

			assert.equal(response.status, 422);
			const stored = await Game.findByPk(game.id);
			assert.equal(stored?.isActive, true);
		});
	}

	void it("rejects unknown query params", async () => {
		const game = await createGame();

		const response = await api()
			.delete(`/games/${game.id}`)
			.query({ force: "true" })
			.set("Authorization", adminAuthorization);

		assert.equal(response.status, 422);
	});

	void it("keeps rejecting a moderator asking for a hard delete", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();

		const response = await api()
			.delete(`/games/${game.id}`)
			.query({ hard: "true" })
			.set("Authorization", moderator.authorization);

		assert.equal(response.status, 403);
		assert.ok(await Game.findByPk(game.id));
	});
});
