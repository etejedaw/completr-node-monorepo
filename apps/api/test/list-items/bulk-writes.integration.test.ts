import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ListItem } from "../../src/list-items/list-item.model";
import { SavedFilter } from "../../src/saved-filters/saved-filter.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createGameTime,
	createList,
	createSavedFilter,
	createScoreSource
} from "../helpers/factories.helper";
import { countQueries } from "../helpers/query-counter.helper";

const FEW = 1;
const FEW_MOVABLE = 2;
const MANY = 6;
const MAX_OWNED_LISTS = 5;

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

async function createListWithItems(userId: string, count: number) {
	const list = await createList(userId, scoreSource);
	const games = await createGames(count);
	for (const [index, game] of games.entries()) {
		await ListItem.create({
			listId: list.id,
			gameId: game.id,
			position: index + 1,
			score: null,
			duration: null
		});
	}
	return { list, games };
}

void describe("PUT /lists/:listId/items query count", () => {
	void it("does not grow with the number of moved items", async () => {
		const owner = await createUserWithSession();
		const counts: number[] = [];
		for (const size of [FEW, MANY]) {
			const { list, games } = await createListWithItems(
				owner.user.id,
				size
			);
			const reversed = games.map(game => game.id).reverse();
			counts.push(
				await countQueries(() =>
					api()
						.put(`/lists/${list.id}/items`)
						.set("Authorization", owner.authorization)
						.send({ gameIds: reversed })
						.expect(200)
				)
			);
			const items = await ListItem.findAll({
				where: { listId: list.id },
				order: [["position", "ASC"]]
			});
			assert.deepEqual(
				items.map(item => item.gameId),
				reversed
			);
		}
		assert.equal(counts[1], counts[0]);
	});

	void it("refreshes updatedAt of the moved items", async () => {
		const owner = await createUserWithSession();
		const { list, games } = await createListWithItems(owner.user.id, 3);
		const before = await ListItem.findAll({ where: { listId: list.id } });
		const updatedAtByGame = new Map(
			before.map(item => [item.gameId, item.updatedAt.getTime()])
		);

		await api()
			.put(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameIds: [games[1]!.id, games[0]!.id, games[2]!.id] })
			.expect(200);

		const after = await ListItem.findAll({ where: { listId: list.id } });
		for (const item of after) {
			const previous = updatedAtByGame.get(item.gameId)!;
			if (item.gameId === games[2]!.id)
				assert.equal(item.updatedAt.getTime(), previous);
			else assert.ok(item.updatedAt.getTime() > previous);
		}
	});
});

void describe("POST /lists/:listId/refresh-scores query count", () => {
	void it("does not grow with the number of items", async () => {
		const owner = await createUserWithSession();
		const warmUp = await createListWithItems(owner.user.id, FEW);
		await api()
			.post(`/lists/${warmUp.list.id}/refresh-scores`)
			.set("Authorization", owner.authorization)
			.expect(200);
		const counts: number[] = [];
		for (const size of [FEW, MANY]) {
			const { list } = await createListWithItems(owner.user.id, size);
			counts.push(
				await countQueries(() =>
					api()
						.post(`/lists/${list.id}/refresh-scores`)
						.set("Authorization", owner.authorization)
						.expect(200)
				)
			);
			const items = await ListItem.findAll({
				where: { listId: list.id }
			});
			assert.equal(items.length, size);
			for (const item of items) {
				assert.equal(item.score, 4);
				assert.equal(item.duration, 10);
			}
		}
		assert.equal(counts[1], counts[0]);
	});
});

void describe("PUT /games/:gameId/lists query count", () => {
	void it("does not grow with the number of requested lists", async () => {
		const counts: number[] = [];
		for (const size of [FEW, MAX_OWNED_LISTS]) {
			const owner = await createUserWithSession();
			const game = await createGame();
			const listIds: string[] = [];
			for (let index = 0; index < size; index++) {
				const list = await createList(owner.user.id, scoreSource);
				await ListItem.create({
					listId: list.id,
					gameId: game.id,
					position: 1,
					score: null,
					duration: null
				});
				listIds.push(list.id);
			}
			counts.push(
				await countQueries(() =>
					api()
						.put(`/games/${game.id}/lists`)
						.set("Authorization", owner.authorization)
						.send({ listIds })
						.expect(200)
				)
			);
		}
		assert.equal(counts[1], counts[0]);
	});
});

void describe("PUT /users/me/saved-filters/reorder query count", () => {
	void it("does not grow with the number of moved filters", async () => {
		const counts: number[] = [];
		for (const size of [FEW_MOVABLE, MANY]) {
			const owner = await createUserWithSession();
			const filters = [];
			for (let index = 0; index < size; index++) {
				filters.push(
					await createSavedFilter(owner.user.id, {
						position: index + 1
					})
				);
			}
			const reversed = filters.map(filter => filter.id).reverse();
			counts.push(
				await countQueries(() =>
					api()
						.put("/users/me/saved-filters/reorder")
						.set("Authorization", owner.authorization)
						.send({ ids: reversed })
						.expect(200)
				)
			);
			const stored = await SavedFilter.findAll({
				where: { userId: owner.user.id },
				order: [["position", "ASC"]]
			});
			assert.deepEqual(
				stored.map(filter => filter.id),
				reversed
			);
		}
		assert.equal(counts[1], counts[0]);
	});
});
