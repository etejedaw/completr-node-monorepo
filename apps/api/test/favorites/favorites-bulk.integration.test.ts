import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { Activity } from "../../src/activity/activity.model";
import { Favorite } from "../../src/favorites/favorite.model";
import { createUserWithSession } from "../helpers/auth.helper";
import {
	itRejectsInvalidBulkRequests,
	postBulk,
	skippedIds
} from "../helpers/bulk.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createUser } from "../helpers/factories.helper";

const BULK_PATH = "/users/me/favorites/bulk";
const FREE_FAVORITE_LIMIT = 10;

useTestDatabase();

async function createGameIds(count: number) {
	const ids = [];
	for (let index = 0; index < count; index++) {
		ids.push((await createGame()).id);
	}
	return ids;
}

async function favoriteGames(userId: string, gameIds: string[]) {
	await Favorite.bulkCreate(
		gameIds.map((gameId, index) => ({
			userId,
			gameId,
			position: index + 1
		}))
	);
}

async function favoritesOrder(userId: string) {
	const entries = await Favorite.findAll({
		where: { userId },
		order: [["position", "ASC"]]
	});
	return entries.map(entry => [entry.gameId, entry.position]);
}

function bulkAdd(authorization: string, gameIds: string[]) {
	return postBulk(BULK_PATH, authorization, "add", { gameIds });
}

function bulkRemove(authorization: string, gameIds: string[]) {
	return postBulk(BULK_PATH, authorization, "remove", { gameIds });
}

function favoriteActivities(userId: string) {
	return Activity.count({ where: { userId, type: "favorite_added" } });
}

void describe("POST /users/me/favorites/bulk?action=add", () => {
	void it("appends games after the existing favorites in the order received", async () => {
		const owner = await createUserWithSession();
		const [existing, first, second] = await createGameIds(3);
		await favoriteGames(owner.user.id, [existing!]);

		const response = await bulkAdd(owner.authorization, [second!, first!]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			action: "add",
			succeeded: [second, first],
			skipped: []
		});
		assert.deepEqual(await favoritesOrder(owner.user.id), [
			[existing, 1],
			[second, 2],
			[first, 3]
		]);
	});

	void it("reports a game already favorite as succeeded without duplicating it", async () => {
		const owner = await createUserWithSession();
		const [existing, fresh] = await createGameIds(2);
		await favoriteGames(owner.user.id, [existing!]);

		const response = await bulkAdd(owner.authorization, [
			existing!,
			fresh!
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [existing, fresh]);
		assert.equal(
			await Favorite.count({ where: { userId: owner.user.id } }),
			2
		);
		await delay(150);
		assert.equal(await favoriteActivities(owner.user.id), 1);
	});

	void it("skips games that do not exist with FAVORITE_GAMES_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const [game] = await createGameIds(1);
		const missing = randomUUID();

		const response = await bulkAdd(owner.authorization, [
			missing,
			game!,
			game!
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [game]);
		assert.deepEqual(response.body.data.skipped, [
			{ id: missing, code: "FAVORITE_GAMES_NOT_FOUND" }
		]);
	});

	void it("answers 402 FAVORITE_LIMIT_REACHED and adds nothing when the batch exceeds the free limit", async () => {
		const owner = await createUserWithSession();
		const existing = await createGameIds(FREE_FAVORITE_LIMIT - 1);
		await favoriteGames(owner.user.id, existing);
		const extra = await createGameIds(2);

		const response = await bulkAdd(owner.authorization, extra);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "FAVORITE_LIMIT_REACHED");
		assert.equal(
			await Favorite.count({ where: { userId: owner.user.id } }),
			FREE_FAVORITE_LIMIT - 1
		);
		await delay(150);
		assert.equal(await favoriteActivities(owner.user.id), 0);
	});

	void it("does not count games already favorite against the free limit", async () => {
		const owner = await createUserWithSession();
		const existing = await createGameIds(FREE_FAVORITE_LIMIT);
		await favoriteGames(owner.user.id, existing);

		const response = await bulkAdd(owner.authorization, existing);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, existing);
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");
		const gameIds = await createGameIds(FREE_FAVORITE_LIMIT + 2);

		const response = await bulkAdd(owner.authorization, gameIds);

		assert.equal(response.status, 200);
		assert.equal(
			await Favorite.count({ where: { userId: owner.user.id } }),
			FREE_FAVORITE_LIMIT + 2
		);
	});

	void it("does not duplicate favorites when the same batch is sent twice at once", async () => {
		const owner = await createUserWithSession();
		const gameIds = await createGameIds(3);

		const responses = await Promise.all([
			bulkAdd(owner.authorization, gameIds),
			bulkAdd(owner.authorization, gameIds)
		]);

		for (const response of responses) assert.equal(response.status, 200);
		assert.deepEqual(await favoritesOrder(owner.user.id), [
			[gameIds[0], 1],
			[gameIds[1], 2],
			[gameIds[2], 3]
		]);
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "add",
		idsKey: "gameIds",
		otherActionBody: { backlogIds: [randomUUID()] }
	});
});

void describe("POST /users/me/favorites/bulk?action=remove", () => {
	void it("removes favorites and renumbers the rest 1..n", async () => {
		const owner = await createUserWithSession();
		const gameIds = await createGameIds(4);
		await favoriteGames(owner.user.id, gameIds);
		const [first, second, third, fourth] = gameIds;

		const response = await bulkRemove(owner.authorization, [
			third!,
			first!
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			action: "remove",
			succeeded: [third, first],
			skipped: []
		});
		assert.deepEqual(await favoritesOrder(owner.user.id), [
			[second, 1],
			[fourth, 2]
		]);
	});

	void it("skips games that were not favorite with FAVORITE_GAMES_NOT_FOUND and leaves other users alone", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const [favorite, notFavorite, strangerFavorite] =
			await createGameIds(3);
		await favoriteGames(owner.user.id, [favorite!]);
		await favoriteGames(stranger.id, [strangerFavorite!]);
		const missing = randomUUID();

		const response = await bulkRemove(owner.authorization, [
			notFavorite!,
			favorite!,
			strangerFavorite!,
			missing
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [favorite]);
		assert.deepEqual(
			skippedIds(response.body.data.skipped),
			[notFavorite!, strangerFavorite!, missing].sort()
		);
		for (const item of response.body.data.skipped)
			assert.equal(item.code, "FAVORITE_GAMES_NOT_FOUND");
		assert.equal(
			await Favorite.count({ where: { userId: stranger.id } }),
			1
		);
	});

	void it("skips everything on a second identical batch", async () => {
		const owner = await createUserWithSession();
		const gameIds = await createGameIds(2);
		await favoriteGames(owner.user.id, gameIds);

		await bulkRemove(owner.authorization, gameIds).expect(200);
		const response = await bulkRemove(owner.authorization, gameIds);

		assert.deepEqual(response.body.data.succeeded, []);
		assert.equal(response.body.data.skipped.length, 2);
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "remove",
		idsKey: "gameIds",
		otherActionBody: { ids: [randomUUID()] }
	});
});
