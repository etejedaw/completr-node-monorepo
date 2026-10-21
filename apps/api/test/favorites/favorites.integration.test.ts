import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Favorite } from "../../src/favorites/favorite.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

const FAVORITES_PATH = "/users/me/favorites";
const FREE_FAVORITE_LIMIT = 10;

useTestDatabase();

async function createGameIds(count: number) {
	const games = await Promise.all(
		Array.from({ length: count }, () => createGame())
	);
	return games.map(game => game.id);
}

function replaceFavorites(authorization: string, gameIds: unknown) {
	return api()
		.put(FAVORITES_PATH)
		.set("Authorization", authorization)
		.send({ gameIds });
}

function favoriteGameIds(response: {
	body: { data: { favorites: { game: { id: string } }[] } };
}) {
	return response.body.data.favorites.map(entry => entry.game.id);
}

void describe("PUT /users/me/favorites", () => {
	void it("replaces the favorites keeping the requested order", async () => {
		const owner = await createUserWithSession();
		const [first, second, third] = await createGameIds(3);
		await replaceFavorites(owner.authorization, [first, second]).expect(
			200
		);

		const response = await replaceFavorites(owner.authorization, [
			third,
			first
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(favoriteGameIds(response), [third, first]);
		assert.deepEqual(
			response.body.data.favorites.map(
				(entry: { position: number }) => entry.position
			),
			[1, 2]
		);
		assert.equal(
			await Favorite.count({ where: { userId: owner.user.id } }),
			2
		);
	});

	void it("clears the favorites with an empty list", async () => {
		const owner = await createUserWithSession();
		await replaceFavorites(
			owner.authorization,
			await createGameIds(2)
		).expect(200);

		const response = await replaceFavorites(owner.authorization, []);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.favorites, []);
		assert.equal(
			await Favorite.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	for (const [description, gameIds] of [
		["duplicated ids", "duplicate"],
		["a malformed id", ["not-a-uuid"]],
		["a missing list", undefined]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const owner = await createUserWithSession();
			const duplicated = randomUUID();

			const response = await replaceFavorites(
				owner.authorization,
				gameIds === "duplicate" ? [duplicated, duplicated] : gameIds
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("rejects an unknown game with 404 FAVORITE_GAMES_NOT_FOUND keeping the favorites", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);
		await replaceFavorites(owner.authorization, [gameId]).expect(200);

		const response = await replaceFavorites(owner.authorization, [
			gameId,
			randomUUID()
		]);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "FAVORITE_GAMES_NOT_FOUND");
		assert.equal(
			await Favorite.count({ where: { userId: owner.user.id } }),
			1
		);
	});

	void it("rejects a free user over the limit with 402 FAVORITE_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");

		const response = await replaceFavorites(
			owner.authorization,
			await createGameIds(FREE_FAVORITE_LIMIT + 1)
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "FAVORITE_LIMIT_REACHED");
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");

		const response = await replaceFavorites(
			owner.authorization,
			await createGameIds(FREE_FAVORITE_LIMIT + 1)
		);

		assert.equal(response.status, 200);
		assert.equal(
			response.body.data.favorites.length,
			FREE_FAVORITE_LIMIT + 1
		);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await replaceFavorites("Bearer invalid", []);

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /users/me/favorites", () => {
	void it("lists the caller's favorites flagging the games in the backlog", async () => {
		const owner = await createUserWithSession();
		const [inBacklog, notInBacklog] = await createGameIds(2);
		await createBacklog(
			owner.user.id,
			inBacklog!,
			(await createPlatform()).id
		);
		await replaceFavorites(owner.authorization, [
			notInBacklog,
			inBacklog
		]).expect(200);
		await replaceFavorites(
			(await createUserWithSession()).authorization,
			await createGameIds(1)
		).expect(200);

		const response = await api()
			.get(FAVORITES_PATH)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
		assert.deepEqual(
			response.body.data.favorites.map(
				(entry: { inBacklog: boolean; game: { id: string } }) => [
					entry.game.id,
					entry.inBacklog
				]
			),
			[
				[notInBacklog, false],
				[inBacklog, true]
			]
		);

		const ids = await api()
			.get(`${FAVORITES_PATH}/game-ids`)
			.set("Authorization", owner.authorization);
		assert.equal(ids.status, 200);
		assert.deepEqual(
			new Set(ids.body.data.gameIds),
			new Set([inBacklog, notInBacklog])
		);
	});
});

void describe("GET /users/:username/favorites", () => {
	void it("serves public favorites without authentication", async () => {
		const owner = await createUserWithSession();
		const gameIds = await createGameIds(2);
		await replaceFavorites(owner.authorization, gameIds).expect(200);

		const response = await api().get(
			`/users/${owner.user.username}/favorites`
		);

		assert.equal(response.status, 200);
		assert.deepEqual(favoriteGameIds(response), gameIds);
	});

	void it("rejects private favorites with 403 USER_PRIVATE", async () => {
		const owner = await createUserWithSession();
		await User.update(
			{ favoriteVisibility: "private" },
			{ where: { id: owner.user.id } }
		);

		const response = await api().get(
			`/users/${owner.user.username}/favorites`
		);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});

	void it("answers 404 USER_NOT_FOUND for an unknown username", async () => {
		const response = await api().get("/users/ghost_user/favorites");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});
});
