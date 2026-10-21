import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { UniqueConstraintError } from "sequelize";

import { Game } from "../../src/games/game.model";
import { Platform } from "../../src/platforms/platform.model";
import { Wishlist } from "../../src/wishlist/wishlist.model";
import * as wishlistService from "../../src/wishlist/wishlist.service";
import { asModel } from "../unit-helpers/as-model";
import {
	buildRequestUser,
	captureRejection,
	stub,
	stubTransaction
} from "../unit-helpers/mocks";

const FREE_WISHLIST_LIMIT = 20;
const FREE_USER = buildRequestUser();

function errorCode(error: unknown) {
	return (error as { code: string }).code;
}

function gameIds(count: number) {
	return Array.from({ length: count }, (_, index) => `g-${index}`);
}

void describe("wishlistService.replaceWishlist", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("clears the wishlist when the new list is empty", async () => {
		const destroy = stub(Wishlist, "destroy", async () => 2);

		assert.deepEqual(
			await wishlistService.replaceWishlist(FREE_USER, []),
			[]
		);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1" } }
		]);
	});

	void it("rejects a free user above the limit and allows exactly the limit", async () => {
		const findGames = stub(Game, "findAll", async () => []);
		const error = await captureRejection(
			wishlistService.replaceWishlist(
				FREE_USER,
				gameIds(FREE_WISHLIST_LIMIT + 1)
			)
		);
		assert.equal(errorCode(error), "WISHLIST_LIMIT_REACHED");
		assert.equal(findGames.mock.callCount(), 0);
		mock.restoreAll();

		stub(Game, "findAll", async () =>
			gameIds(FREE_WISHLIST_LIMIT).map(id => ({ id }))
		);
		stubTransaction();
		stub(Wishlist, "destroy", async () => 0);
		const bulkCreate = stub(Wishlist, "bulkCreate", async () => []);
		stub(Wishlist, "findAll", async () => []);
		await wishlistService.replaceWishlist(
			FREE_USER,
			gameIds(FREE_WISHLIST_LIMIT)
		);
		assert.equal(
			(bulkCreate.mock.calls[0]?.arguments[0] as unknown[]).length,
			FREE_WISHLIST_LIMIT
		);
	});

	void it("fails when some games do not exist", async () => {
		stub(Game, "findAll", async () => [{ id: "g-1" }]);

		const error = await captureRejection(
			wishlistService.replaceWishlist(FREE_USER, ["g-1", "g-2"])
		);

		assert.equal(errorCode(error), "WISHLIST_GAMES_NOT_FOUND");
	});

	void it("rebuilds positions from 1 in the given order", async () => {
		stub(Game, "findAll", async () => [{ id: "g-2" }, { id: "g-1" }]);
		stubTransaction();
		stub(Wishlist, "destroy", async () => 0);
		const bulkCreate = stub(Wishlist, "bulkCreate", async () => []);
		stub(Wishlist, "findAll", async () => []);

		await wishlistService.replaceWishlist(FREE_USER, ["g-2", "g-1"]);

		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments[0], [
			{ userId: "user-1", gameId: "g-2", platformId: null, position: 1 },
			{ userId: "user-1", gameId: "g-1", platformId: null, position: 2 }
		]);
	});

	void it("keeps the desired platform of entries that stay in the wishlist", async () => {
		stub(Game, "findAll", async () => [{ id: "g-1" }, { id: "g-2" }]);
		stubTransaction();
		stub(Wishlist, "destroy", async () => 1);
		const bulkCreate = stub(Wishlist, "bulkCreate", async () => []);
		stub(Wishlist, "findAll", async () => [
			{ gameId: "g-1", platformId: "platform-9" },
			{ gameId: "g-3", platformId: "platform-3" }
		]);

		await wishlistService.replaceWishlist(FREE_USER, ["g-2", "g-1"]);

		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments[0], [
			{
				userId: "user-1",
				gameId: "g-2",
				platformId: null,
				position: 1
			},
			{
				userId: "user-1",
				gameId: "g-1",
				platformId: "platform-9",
				position: 2
			}
		]);
	});

	void it("reads, destroys and recreates the entries inside one transaction", async () => {
		stub(Game, "findAll", async () => [{ id: "g-1" }]);
		const { transaction, mocked } = stubTransaction();
		const destroy = stub(Wishlist, "destroy", async () => 1);
		const bulkCreate = stub(Wishlist, "bulkCreate", async () => []);
		const findAll = stub(Wishlist, "findAll", async () => []);

		await wishlistService.replaceWishlist(FREE_USER, ["g-1"]);

		assert.equal(mocked.mock.callCount(), 1);
		assert.deepEqual(findAll.mock.calls[0]?.arguments, [
			{
				where: { userId: "user-1" },
				attributes: ["gameId", "platformId"],
				transaction
			}
		]);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1" }, transaction }
		]);
		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments[1], {
			transaction
		});
	});
});

void describe("wishlistService.addToWishlist", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	function stubHappyPath(count = 0) {
		stub(Game, "findOne", async () => asModel({ id: "g-1" }));
		stub(Platform, "findOne", async () => asModel({ id: "p-1" }));
		const findWishlist = stub(Wishlist, "findOne", async () => null);
		stub(Wishlist, "count", async () => count);
		const create = stub(Wishlist, "create", async () => ({}));
		return { findWishlist, create };
	}

	void it("fails when the game does not exist", async () => {
		stub(Game, "findOne", async () => null);

		const error = await captureRejection(
			wishlistService.addToWishlist(FREE_USER, "g-1")
		);

		assert.equal(errorCode(error), "WISHLIST_GAMES_NOT_FOUND");
	});

	void it("fails when the desired platform does not exist", async () => {
		stub(Game, "findOne", async () => asModel({ id: "g-1" }));
		stub(Platform, "findOne", async () => null);

		const error = await captureRejection(
			wishlistService.addToWishlist(FREE_USER, "g-1", "p-9")
		);

		assert.equal(errorCode(error), "WISHLIST_PLATFORM_NOT_FOUND");
	});

	void it("does not check the platform when none is given", async () => {
		const platformLookup = stub(Platform, "findOne", async () => null);
		stubHappyPath();

		await wishlistService.addToWishlist(FREE_USER, "g-1");

		assert.equal(platformLookup.mock.callCount(), 0);
	});

	void it("rejects a game that is already in the wishlist", async () => {
		stub(Game, "findOne", async () => asModel({ id: "g-1" }));
		stub(Wishlist, "findOne", async () => asModel({ id: "w-1" }));

		const error = await captureRejection(
			wishlistService.addToWishlist(FREE_USER, "g-1")
		);

		assert.equal(errorCode(error), "WISHLIST_ALREADY_EXISTS");
	});

	void it("rejects a free user at the limit but allows premium users", async () => {
		stubHappyPath(FREE_WISHLIST_LIMIT);
		const error = await captureRejection(
			wishlistService.addToWishlist(FREE_USER, "g-1")
		);
		assert.equal(errorCode(error), "WISHLIST_LIMIT_REACHED");
		mock.restoreAll();

		const { create } = stubHappyPath(FREE_WISHLIST_LIMIT);
		await wishlistService.addToWishlist(
			buildRequestUser({ role: "premium" }),
			"g-1"
		);
		assert.equal(create.mock.callCount(), 1);
	});

	void it("appends at the end with a null platform by default", async () => {
		const { create } = stubHappyPath(4);

		await wishlistService.addToWishlist(FREE_USER, "g-1");

		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			userId: "user-1",
			gameId: "g-1",
			platformId: null,
			position: 5
		});
	});

	void it("maps a concurrent unique violation to WISHLIST_ALREADY_EXISTS", async () => {
		stub(Game, "findOne", async () => asModel({ id: "g-1" }));
		stub(Wishlist, "findOne", async () => null);
		stub(Wishlist, "count", async () => 0);
		stub(Wishlist, "create", async () => {
			throw new UniqueConstraintError({});
		});

		const error = await captureRejection(
			wishlistService.addToWishlist(FREE_USER, "g-1")
		);

		assert.equal(errorCode(error), "WISHLIST_ALREADY_EXISTS");
	});
});

void describe("wishlistService.removeFromWishlist", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("fails with WISHLIST_NOT_FOUND when nothing was deleted", async () => {
		stub(Wishlist, "destroy", async () => 0);

		const error = await captureRejection(
			wishlistService.removeFromWishlist(FREE_USER, "g-1")
		);

		assert.equal(errorCode(error), "WISHLIST_NOT_FOUND");
	});

	void it("deletes only the entry of the requesting user", async () => {
		const destroy = stub(Wishlist, "destroy", async () => 1);

		await wishlistService.removeFromWishlist(FREE_USER, "g-1");

		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1", gameId: "g-1" } }
		]);
	});
});
