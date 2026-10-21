import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";

const WISHLIST_PATH = "/users/me/wishlist";
const FAVORITES_PATH = "/users/me/favorites";
const FREE_WISHLIST_LIMIT = 20;
const FREE_FAVORITE_LIMIT = 10;

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface WishlistEntry {
	position: number;
	game: { id: string };
	platform: { id: string } | null;
}

interface FavoriteEntry {
	position: number;
	inBacklog: boolean;
	game: { id: string };
}

function createGames(count: number) {
	return Promise.all(Array.from({ length: count }, () => createGame()));
}

void describe("wishlist and favorites journey", () => {
	let owner: Account;
	let playStation: Platform;
	let nintendoSwitch: Platform;
	let hollowKnight: Game;
	let silksong: Game;
	let hades: Game;

	async function getWishlist() {
		const response = await api()
			.get(WISHLIST_PATH)
			.set("Authorization", owner.authorization)
			.expect(200);
		return response.body.data as {
			wishlist: WishlistEntry[];
			total: number;
		};
	}

	async function wishlistGameIds() {
		return (await getWishlist()).wishlist.map(entry => entry.game.id);
	}

	async function getFavorites() {
		const response = await api()
			.get(FAVORITES_PATH)
			.set("Authorization", owner.authorization)
			.expect(200);
		return response.body.data as {
			favorites: FavoriteEntry[];
			total: number;
		};
	}

	async function favoriteGameIds() {
		return (await getFavorites()).favorites.map(entry => entry.game.id);
	}

	function addToWishlist(gameId: string, platformId?: string) {
		return api()
			.post(WISHLIST_PATH)
			.set("Authorization", owner.authorization)
			.send({ gameId, platformId });
	}

	function replaceWishlist(gameIds: string[]) {
		return api()
			.put(WISHLIST_PATH)
			.set("Authorization", owner.authorization)
			.send({ gameIds });
	}

	function replaceFavorites(gameIds: string[]) {
		return api()
			.put(FAVORITES_PATH)
			.set("Authorization", owner.authorization)
			.send({ gameIds });
	}

	void it("wishes three games, two of them for a specific platform", async () => {
		owner = await createUserWithSession();
		[playStation, nintendoSwitch] = await Promise.all([
			createPlatform(),
			createPlatform()
		]);
		[hollowKnight, silksong, hades] = await Promise.all([
			createGame({ title: "Hollow Knight" }),
			createGame({ title: "Silksong" }),
			createGame({ title: "Hades" })
		]);

		assert.equal(
			(await addToWishlist(hollowKnight.id, playStation.id)).status,
			201
		);
		assert.equal(
			(await addToWishlist(silksong.id, nintendoSwitch.id)).status,
			201
		);
		assert.equal((await addToWishlist(hades.id)).status, 201);

		const { wishlist, total } = await getWishlist();
		assert.equal(total, 3);
		assert.deepEqual(
			wishlist.map(entry => entry.game.id),
			[hollowKnight.id, silksong.id, hades.id]
		);
		assert.deepEqual(
			wishlist.map(entry => entry.platform?.id ?? null),
			[playStation.id, nintendoSwitch.id, null]
		);

		const gameIds = await api()
			.get(`${WISHLIST_PATH}/game-ids`)
			.set("Authorization", owner.authorization)
			.expect(200);
		assert.deepEqual(
			new Set(gameIds.body.data.gameIds),
			new Set([hollowKnight.id, silksong.id, hades.id])
		);
	});

	void it("rejects wishing the same game twice and an unknown platform", async () => {
		const duplicated = await addToWishlist(hollowKnight.id);
		assert.equal(duplicated.status, 409);
		assert.equal(duplicated.body.type, "WISHLIST_ALREADY_EXISTS");

		const unknownPlatform = await addToWishlist(
			(await createGame()).id,
			randomUUID()
		);
		assert.equal(unknownPlatform.status, 404);
		assert.equal(unknownPlatform.body.type, "WISHLIST_PLATFORM_NOT_FOUND");

		assert.deepEqual(await wishlistGameIds(), [
			hollowKnight.id,
			silksong.id,
			hades.id
		]);
	});

	void it("reorders the wishlist", async () => {
		const response = await replaceWishlist([
			hades.id,
			hollowKnight.id,
			silksong.id
		]);
		assert.equal(response.status, 200);

		const { wishlist } = await getWishlist();
		assert.deepEqual(
			wishlist.map(entry => entry.game.id),
			[hades.id, hollowKnight.id, silksong.id]
		);
		assert.deepEqual(
			wishlist.map(entry => entry.position),
			[1, 2, 3]
		);
	});

	void it("keeps the platform of every entry after reordering", async () => {
		const { wishlist } = await getWishlist();

		assert.deepEqual(
			wishlist.map(entry => entry.platform?.id ?? null),
			[null, playStation.id, nintendoSwitch.id]
		);
	});

	void it("moves a wished game to the backlog and out of the wishlist", async () => {
		const created = await api()
			.post("/users/me/backlog")
			.set("Authorization", owner.authorization)
			.send({
				gameId: silksong.id,
				platformId: nintendoSwitch.id,
				score: 4.5,
				duration: 30
			});
		assert.equal(created.status, 201);
		const removed = await api()
			.delete(`${WISHLIST_PATH}/${silksong.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(removed.status, 204);

		assert.deepEqual(await wishlistGameIds(), [hades.id, hollowKnight.id]);
		const backlog = await api()
			.get("/users/me/backlog")
			.set("Authorization", owner.authorization)
			.expect(200);
		assert.equal(backlog.body.data.total, 1);
		assert.equal(backlog.body.data.backlog[0].game.id, silksong.id);
		assert.equal(
			backlog.body.data.backlog[0].platform.id,
			nintendoSwitch.id
		);
	});

	void it("answers 404 when removing a game that is no longer wished", async () => {
		const response = await api()
			.delete(`${WISHLIST_PATH}/${silksong.id}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "WISHLIST_NOT_FOUND");
		assert.equal((await getWishlist()).total, 2);
	});

	void it("stops a free user at the wishlist limit", async () => {
		const extraGames = await createGames(FREE_WISHLIST_LIMIT - 2);
		const fullWishlist = [
			hades.id,
			hollowKnight.id,
			...extraGames.map(game => game.id)
		];
		await replaceWishlist(fullWishlist).expect(200);

		const added = await addToWishlist((await createGame()).id);
		assert.equal(added.status, 402);
		assert.equal(added.body.type, "WISHLIST_LIMIT_REACHED");

		const replaced = await replaceWishlist([...fullWishlist, silksong.id]);
		assert.equal(replaced.status, 402);
		assert.equal(replaced.body.type, "WISHLIST_LIMIT_REACHED");

		assert.deepEqual(await wishlistGameIds(), fullWishlist);
	});

	void it("adds favorites flagging the ones in the backlog", async () => {
		const response = await replaceFavorites([hollowKnight.id, silksong.id]);
		assert.equal(response.status, 200);

		const { favorites, total } = await getFavorites();
		assert.equal(total, 2);
		assert.deepEqual(
			favorites.map(entry => [entry.game.id, entry.inBacklog]),
			[
				[hollowKnight.id, false],
				[silksong.id, true]
			]
		);
	});

	void it("appends, reorders and removes favorites", async () => {
		await replaceFavorites([hollowKnight.id, silksong.id, hades.id]).expect(
			200
		);
		assert.deepEqual(await favoriteGameIds(), [
			hollowKnight.id,
			silksong.id,
			hades.id
		]);

		await replaceFavorites([hades.id, hollowKnight.id, silksong.id]).expect(
			200
		);
		const reordered = await getFavorites();
		assert.deepEqual(
			reordered.favorites.map(entry => entry.game.id),
			[hades.id, hollowKnight.id, silksong.id]
		);
		assert.deepEqual(
			reordered.favorites.map(entry => entry.position),
			[1, 2, 3]
		);

		await replaceFavorites([hades.id, silksong.id]).expect(200);
		assert.deepEqual(await favoriteGameIds(), [hades.id, silksong.id]);
	});

	void it("rejects an unknown favorite and keeps the favorites", async () => {
		const response = await replaceFavorites([hades.id, randomUUID()]);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "FAVORITE_GAMES_NOT_FOUND");
		assert.deepEqual(await favoriteGameIds(), [hades.id, silksong.id]);
	});

	void it("stops a free user at the favorites limit", async () => {
		const games = await createGames(FREE_FAVORITE_LIMIT + 1);

		const response = await replaceFavorites(games.map(game => game.id));

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "FAVORITE_LIMIT_REACHED");
		assert.deepEqual(await favoriteGameIds(), [hades.id, silksong.id]);
	});

	void it("clears every favorite", async () => {
		await replaceFavorites([]).expect(200);

		assert.equal((await getFavorites()).total, 0);
	});
});
