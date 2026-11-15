import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Wishlist } from "../../src/wishlist/wishlist.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createWishlistEntries
} from "../helpers/factories.helper";

const WISHLIST_PATH = "/users/me/wishlist";
const FREE_WISHLIST_LIMIT = 20;
const SIMULTANEOUS_REQUESTS = 6;

useTestDatabase();

async function createGameIds(count: number) {
	const games = await Promise.all(
		Array.from({ length: count }, () => createGame())
	);
	return games.map(game => game.id);
}

function addToWishlist(authorization: string, gameId: string) {
	return api()
		.post(WISHLIST_PATH)
		.set("Authorization", authorization)
		.send({ gameId });
}

async function positionsOf(userId: string) {
	const entries = await Wishlist.findAll({
		where: { userId },
		order: [["position", "ASC"]]
	});
	return entries.map(entry => entry.position);
}

void describe("wishlist under concurrent requests", () => {
	void it("never exceeds the free limit when several adds race for the last slots", async () => {
		const owner = await createUserWithSession();
		const existing = await createGameIds(FREE_WISHLIST_LIMIT - 2);
		await createWishlistEntries(owner.user.id, existing);
		const incoming = await createGameIds(SIMULTANEOUS_REQUESTS);

		const responses = await Promise.all(
			incoming.map(gameId => addToWishlist(owner.authorization, gameId))
		);

		assert.equal(responses.filter(r => r.status === 201).length, 2);
		assert.equal(responses.filter(r => r.status === 402).length, 4);
		assert.equal(
			await Wishlist.count({ where: { userId: owner.user.id } }),
			FREE_WISHLIST_LIMIT
		);
	});

	void it("answers a double click on the same game with one 201 and one 409", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);

		const responses = await Promise.all([
			addToWishlist(owner.authorization, gameId!),
			addToWishlist(owner.authorization, gameId!)
		]);

		assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
		assert.equal(
			await Wishlist.count({ where: { userId: owner.user.id } }),
			1
		);
	});

	void it("gives every concurrent add its own position", async () => {
		const owner = await createUserWithSession();
		const incoming = await createGameIds(SIMULTANEOUS_REQUESTS);

		await Promise.all(
			incoming.map(gameId => addToWishlist(owner.authorization, gameId))
		);

		assert.deepEqual(
			await positionsOf(owner.user.id),
			incoming.map((_, index) => index + 1)
		);
	});

	void it("closes the gap left by a removed game", async () => {
		const owner = await createUserWithSession();
		const games = await createGameIds(4);
		await createWishlistEntries(owner.user.id, games);

		await api()
			.delete(`${WISHLIST_PATH}/${games[1]}`)
			.set("Authorization", owner.authorization)
			.expect(204);

		assert.deepEqual(await positionsOf(owner.user.id), [1, 2, 3]);
	});

	void it("answers 404 when removing a game twice at the same time", async () => {
		const owner = await createUserWithSession();
		const [gameId] = await createGameIds(1);
		await createWishlistEntries(owner.user.id, [gameId!]);

		const responses = await Promise.all(
			[0, 1].map(() =>
				api()
					.delete(`${WISHLIST_PATH}/${gameId}`)
					.set("Authorization", owner.authorization)
			)
		);

		assert.deepEqual(responses.map(r => r.status).sort(), [204, 404]);
	});
});
