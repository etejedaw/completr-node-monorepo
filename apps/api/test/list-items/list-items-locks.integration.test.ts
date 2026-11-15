import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ListItem } from "../../src/list-items/list-item.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createGameTime,
	createList,
	createScoreSource
} from "../helpers/factories.helper";

const GAMES_IN_LIST = 6;
const PARALLEL_REQUESTS = 5;

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource({ scale: 100 });
	scoreSource = source.code;
});

async function createGames(count: number) {
	const games = [];
	for (let index = 0; index < count; index++) {
		const game = await createGame();
		await createGameScore(game.id, scoreSource, 80);
		await createGameTime(game.id, "hltb", 10);
		games.push(game);
	}
	return games;
}

async function storedItems(listId: string) {
	const items = await ListItem.findAll({
		where: { listId },
		order: [["position", "ASC"]]
	});
	return items.map(item => ({
		gameId: item.gameId,
		position: item.position
	}));
}

function contiguousPositions(count: number) {
	return Array.from({ length: count }, (_, index) => index + 1);
}

function putItems(authorization: string, listId: string, gameIds: string[]) {
	return api()
		.put(`/lists/${listId}/items`)
		.set("Authorization", authorization)
		.send({ gameIds });
}

void describe("list items under parallel requests", () => {
	void it("keeps one item per game and contiguous positions when the same PUT arrives many times", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const games = await createGames(GAMES_IN_LIST);
		const gameIds = games.map(game => game.id);

		const responses = await Promise.all(
			Array.from({ length: PARALLEL_REQUESTS }, () =>
				putItems(owner.authorization, list.id, gameIds)
			)
		);

		assert.ok(responses.every(response => response.status === 200));
		const items = await storedItems(list.id);
		assert.deepEqual(
			items.map(item => item.gameId),
			gameIds
		);
		assert.deepEqual(
			items.map(item => item.position),
			contiguousPositions(GAMES_IN_LIST)
		);
	});

	void it("keeps positions contiguous when different games are removed at once", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const games = await createGames(GAMES_IN_LIST);
		await putItems(
			owner.authorization,
			list.id,
			games.map(game => game.id)
		).expect(200);
		const removed = games.slice(0, PARALLEL_REQUESTS - 1);

		const responses = await Promise.all(
			removed.map(game =>
				api()
					.delete(`/lists/${list.id}/items/${game.id}`)
					.set("Authorization", owner.authorization)
			)
		);

		assert.ok(responses.every(response => response.status === 204));
		const items = await storedItems(list.id);
		assert.equal(items.length, GAMES_IN_LIST - removed.length);
		assert.deepEqual(
			items.map(item => item.position),
			contiguousPositions(items.length)
		);
	});

	void it("never answers 500 when adds, replaces and removals race on one list", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const games = await createGames(GAMES_IN_LIST);
		const gameIds = games.map(game => game.id);

		const responses = await Promise.all([
			putItems(owner.authorization, list.id, gameIds),
			putItems(owner.authorization, list.id, gameIds.slice(0, 3)),
			api()
				.post(`/lists/${list.id}/items`)
				.set("Authorization", owner.authorization)
				.send({ gameId: gameIds[5] }),
			api()
				.delete(`/lists/${list.id}/items/${gameIds[0]}`)
				.set("Authorization", owner.authorization),
			putItems(owner.authorization, list.id, gameIds)
		]);

		assert.ok(responses.every(response => response.status < 500));
		const items = await storedItems(list.id);
		assert.equal(
			new Set(items.map(item => item.gameId)).size,
			items.length
		);
		assert.deepEqual(
			items.map(item => item.position),
			contiguousPositions(items.length)
		);
	});

	void it("stores the game once per list when the same PUT /games/:gameId/lists arrives many times", async () => {
		const owner = await createUserWithSession();
		const [game] = await createGames(1);
		const lists = await Promise.all(
			Array.from({ length: 3 }, () =>
				createList(owner.user.id, scoreSource)
			)
		);
		const listIds = lists.map(list => list.id);

		const responses = await Promise.all(
			Array.from({ length: PARALLEL_REQUESTS }, () =>
				api()
					.put(`/games/${game!.id}/lists`)
					.set("Authorization", owner.authorization)
					.send({ listIds })
			)
		);

		assert.ok(responses.every(response => response.status === 200));
		for (const listId of listIds)
			assert.equal(
				await ListItem.count({ where: { listId, gameId: game!.id } }),
				1
			);
	});

	void it("never answers 500 when the same game is added to and removed from lists at once", async () => {
		const owner = await createUserWithSession();
		const [game] = await createGames(1);
		const lists = await Promise.all(
			Array.from({ length: 3 }, () =>
				createList(owner.user.id, scoreSource)
			)
		);
		const listIds = lists.map(list => list.id);

		const responses = await Promise.all(
			Array.from({ length: PARALLEL_REQUESTS }, (_, index) =>
				api()
					.put(`/games/${game!.id}/lists`)
					.set("Authorization", owner.authorization)
					.send({ listIds: index % 2 === 0 ? listIds : [] })
			)
		);

		assert.ok(responses.every(response => response.status < 500));
		for (const listId of listIds)
			assert.ok(
				(await ListItem.count({
					where: { listId, gameId: game!.id }
				})) <= 1
			);
	});
});
