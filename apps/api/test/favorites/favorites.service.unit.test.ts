import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { Favorite } from "../../src/favorites/favorite.model";
import * as favoritesService from "../../src/favorites/favorites.service";
import { Game } from "../../src/games/game.model";
import {
	buildRequestUser,
	captureRejection,
	stub,
	stubTransaction
} from "../unit-helpers/mocks";

const FREE_FAVORITE_LIMIT = 10;
const FREE_USER = buildRequestUser();

function gameIds(count: number) {
	return Array.from({ length: count }, (_, index) => `g-${index}`);
}

function stubGamesExist(ids: string[]) {
	stub(Game, "findAll", async () => ids.map(id => ({ id })));
}

void describe("favoritesService.replaceFavorites", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("clears the favorites when the new list is empty", async () => {
		const destroy = stub(Favorite, "destroy", async () => 3);

		assert.deepEqual(
			await favoritesService.replaceFavorites(FREE_USER, []),
			[]
		);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1" } }
		]);
	});

	void it("rejects a free user above the limit with FAVORITE_LIMIT_REACHED", async () => {
		const findAll = stub(Game, "findAll", async () => []);

		const error = await captureRejection(
			favoritesService.replaceFavorites(
				FREE_USER,
				gameIds(FREE_FAVORITE_LIMIT + 1)
			)
		);

		assert.equal(
			(error as { code: string }).code,
			"FAVORITE_LIMIT_REACHED"
		);
		assert.equal(findAll.mock.callCount(), 0);
	});

	void it("accepts exactly the free limit and any amount for premium users", async () => {
		for (const [user, count] of [
			[FREE_USER, FREE_FAVORITE_LIMIT],
			[buildRequestUser({ role: "admin" }), 40]
		] as const) {
			stubGamesExist(gameIds(count));
			stubTransaction();
			stub(Favorite, "destroy", async () => 0);
			const bulkCreate = stub(Favorite, "bulkCreate", async () => []);
			stub(Favorite, "findAll", async () => []);

			await favoritesService.replaceFavorites(user, gameIds(count));

			assert.equal(
				(bulkCreate.mock.calls[0]?.arguments[0] as unknown[]).length,
				count
			);
			mock.restoreAll();
		}
	});

	void it("reports which games were not found", async () => {
		stubGamesExist(["g-1"]);

		const error = await captureRejection(
			favoritesService.replaceFavorites(FREE_USER, ["g-1", "g-2"])
		);

		assert.equal(
			(error as { code: string }).code,
			"FAVORITE_GAMES_NOT_FOUND"
		);
	});

	void it("rebuilds positions from 1 in the given order inside a transaction", async () => {
		stubGamesExist(["g-2", "g-1"]);
		const { transaction } = stubTransaction();
		const destroy = stub(Favorite, "destroy", async () => 0);
		const bulkCreate = stub(Favorite, "bulkCreate", async () => []);
		stub(Favorite, "findAll", async () => []);

		await favoritesService.replaceFavorites(FREE_USER, ["g-2", "g-1"]);

		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1" }, transaction }
		]);
		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments, [
			[
				{ userId: "user-1", gameId: "g-2", position: 1 },
				{ userId: "user-1", gameId: "g-1", position: 2 }
			],
			{ transaction }
		]);
	});
});
