import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { User } from "../../src/users/user.model";
import { Wishlist } from "../../src/wishlist/wishlist.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createWishlistEntries
} from "../helpers/factories.helper";

const WISHLIST_PATH = "/users/me/wishlist";
const FREE_WISHLIST_LIMIT = 20;

useTestDatabase();

async function createGameIds(count: number) {
	const games = await Promise.all(
		Array.from({ length: count }, () => createGame())
	);
	return games.map(game => game.id);
}

function addToWishlist(authorization: string, body: Record<string, unknown>) {
	return api()
		.post(WISHLIST_PATH)
		.set("Authorization", authorization)
		.send(body);
}

function replaceWishlist(authorization: string, gameIds: string[]) {
	return api()
		.put(WISHLIST_PATH)
		.set("Authorization", authorization)
		.send({ gameIds });
}

void describe("POST /users/me/wishlist", () => {
	void it("adds a game with its desired platform at the end", async () => {
		const owner = await createUserWithSession();
		const [first, second] = await createGameIds(2);
		const platform = await createPlatform();
		await addToWishlist(owner.authorization, { gameId: first }).expect(201);

		const response = await addToWishlist(owner.authorization, {
			gameId: second,
			platformId: platform.id
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.wishlist.position, 2);
		assert.equal(response.body.data.wishlist.game.id, second);
		assert.equal(response.body.data.wishlist.platform.id, platform.id);
	});

	void it("adds a game without platform", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);

		const response = await addToWishlist(owner.authorization, { gameId });

		assert.equal(response.status, 201);
		assert.equal(response.body.data.wishlist.platform, null);
	});

	for (const [description, body] of [
		["a malformed game id", { gameId: "not-a-uuid" }],
		[
			"a malformed platform id",
			{ gameId: randomUUID(), platformId: "ps5" }
		],
		["unknown fields", { gameId: randomUUID(), position: 1 }]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const owner = await createUserWithSession();

			const response = await addToWishlist(owner.authorization, body);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("answers 404 WISHLIST_GAMES_NOT_FOUND for an unknown game", async () => {
		const owner = await createUserWithSession();

		const response = await addToWishlist(owner.authorization, {
			gameId: randomUUID()
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "WISHLIST_GAMES_NOT_FOUND");
	});

	void it("answers 404 WISHLIST_PLATFORM_NOT_FOUND for an unknown platform", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);

		const response = await addToWishlist(owner.authorization, {
			gameId,
			platformId: randomUUID()
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "WISHLIST_PLATFORM_NOT_FOUND");
	});

	void it("rejects a game already wished with 409 WISHLIST_ALREADY_EXISTS", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);
		await addToWishlist(owner.authorization, { gameId }).expect(201);

		const response = await addToWishlist(owner.authorization, { gameId });

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "WISHLIST_ALREADY_EXISTS");
	});

	void it("rejects a free user over the limit with 402 WISHLIST_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");
		await createWishlistEntries(
			owner.user.id,
			await createGameIds(FREE_WISHLIST_LIMIT)
		);
		const [extra] = await createGameIds(1);

		const response = await addToWishlist(owner.authorization, {
			gameId: extra
		});

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "WISHLIST_LIMIT_REACHED");
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");
		await createWishlistEntries(
			owner.user.id,
			await createGameIds(FREE_WISHLIST_LIMIT)
		);
		const [extra] = await createGameIds(1);

		const response = await addToWishlist(owner.authorization, {
			gameId: extra
		});

		assert.equal(response.status, 201);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await addToWishlist("Bearer invalid", {
			gameId: randomUUID()
		});

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("PUT /users/me/wishlist", () => {
	void it("replaces the wishlist keeping the requested order", async () => {
		const owner = await createUserWithSession();
		const [first, second, third] = await createGameIds(3);
		await createWishlistEntries(owner.user.id, [first!, second!]);

		const response = await replaceWishlist(owner.authorization, [
			third!,
			first!
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.wishlist.map(
				(entry: { game: { id: string } }) => entry.game.id
			),
			[third, first]
		);
		assert.deepEqual(
			response.body.data.wishlist.map(
				(entry: { position: number }) => entry.position
			),
			[1, 2]
		);
	});

	void it("keeps the platform of the entries it reorders", async () => {
		const owner = await createUserWithSession();
		const [first, second] = await createGameIds(2);
		const platform = await createPlatform();
		await createWishlistEntries(
			owner.user.id,
			[first!, second!],
			platform.id
		);

		const response = await replaceWishlist(owner.authorization, [
			second!,
			first!
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.wishlist.map(
				(entry: { platform: { id: string } | null }) =>
					entry.platform?.id ?? null
			),
			[platform.id, platform.id]
		);
	});

	void it("clears the wishlist with an empty list", async () => {
		const owner = await createUserWithSession();
		await createWishlistEntries(owner.user.id, await createGameIds(2));

		const response = await replaceWishlist(owner.authorization, []);

		assert.equal(response.status, 200);
		assert.equal(
			await Wishlist.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("rejects duplicated ids with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);

		const response = await replaceWishlist(owner.authorization, [
			gameId!,
			gameId!
		]);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an unknown game with 404 WISHLIST_GAMES_NOT_FOUND keeping the wishlist", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);
		await createWishlistEntries(owner.user.id, [gameId!]);

		const response = await replaceWishlist(owner.authorization, [
			gameId!,
			randomUUID()
		]);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "WISHLIST_GAMES_NOT_FOUND");
		assert.equal(
			await Wishlist.count({ where: { userId: owner.user.id } }),
			1
		);
	});

	void it("rejects a free user's wishlist over the limit with 402 WISHLIST_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");

		const response = await replaceWishlist(
			owner.authorization,
			await createGameIds(FREE_WISHLIST_LIMIT + 1)
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "WISHLIST_LIMIT_REACHED");
	});
});

void describe("DELETE /users/me/wishlist/:gameId", () => {
	void it("removes a wished game", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);
		await createWishlistEntries(owner.user.id, [gameId!]);

		const response = await api()
			.delete(`${WISHLIST_PATH}/${gameId}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await Wishlist.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("does not remove another user's entry and answers 404 WISHLIST_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const [gameId] = await createGameIds(1);
		await createWishlistEntries(owner.user.id, [gameId!]);

		const response = await api()
			.delete(`${WISHLIST_PATH}/${gameId}`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "WISHLIST_NOT_FOUND");
		assert.equal(
			await Wishlist.count({ where: { userId: owner.user.id } }),
			1
		);
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.delete(`${WISHLIST_PATH}/not-a-uuid`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("GET /users/me/wishlist", () => {
	void it("lists only the caller's entries in order and their game ids", async () => {
		const owner = await createUserWithSession();
		const gameIds = await createGameIds(3);
		await createWishlistEntries(owner.user.id, gameIds);
		await createWishlistEntries(
			(await createUserWithSession()).user.id,
			await createGameIds(1)
		);

		const response = await api()
			.get(WISHLIST_PATH)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 3);
		assert.deepEqual(
			response.body.data.wishlist.map(
				(entry: { game: { id: string } }) => entry.game.id
			),
			gameIds
		);

		const ids = await api()
			.get(`${WISHLIST_PATH}/game-ids`)
			.set("Authorization", owner.authorization);
		assert.equal(ids.status, 200);
		assert.deepEqual(new Set(ids.body.data.gameIds), new Set(gameIds));
	});

	void it("searches by game title", async () => {
		const owner = await createUserWithSession();
		const [match, other] = await Promise.all([
			createGame({ title: "Hollow Knight" }),
			createGame({ title: "Celeste" })
		]);
		await createWishlistEntries(owner.user.id, [match.id, other.id]);

		const response = await api()
			.get(WISHLIST_PATH)
			.query({ search: "hollow" })
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.wishlist.map(
				(entry: { game: { id: string } }) => entry.game.id
			),
			[match.id]
		);
	});
});

void describe("GET /users/:username/wishlist", () => {
	void it("serves a public wishlist without authentication", async () => {
		const owner = await createUserWithSession();
		await createWishlistEntries(owner.user.id, await createGameIds(2));

		const response = await api().get(
			`/users/${owner.user.username}/wishlist`
		);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
	});

	void it("rejects a private wishlist with 403 USER_PRIVATE", async () => {
		const owner = await createUserWithSession();
		await User.update(
			{ wishlistVisibility: "private" },
			{ where: { id: owner.user.id } }
		);

		const response = await api().get(
			`/users/${owner.user.username}/wishlist`
		);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});
});
