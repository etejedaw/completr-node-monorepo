import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, mock } from "node:test";

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

const FREE_LIST_LIMIT = 5;

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource({ scale: 100 });
	scoreSource = source.code;
});

function putGameLists(
	authorization: string,
	gameId: string,
	listIds: string[]
) {
	return api()
		.put(`/games/${gameId}/lists`)
		.set("Authorization", authorization)
		.send({ listIds });
}

async function addItem(listId: string, gameId: string, position: number) {
	return ListItem.create({
		listId,
		gameId,
		position,
		score: null,
		duration: null
	});
}

async function listGameIds(listId: string) {
	const items = await ListItem.findAll({
		where: { listId },
		order: [["position", "ASC"]]
	});
	return items.map(item => item.gameId);
}

async function listPositions(listId: string) {
	const items = await ListItem.findAll({
		where: { listId },
		order: [["position", "ASC"]]
	});
	return items.map(item => item.position);
}

void describe("PUT /games/:gameId/lists", () => {
	void it("adds the game to missing lists and removes it from the others", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const other = await createGame();
		const third = await createGame();
		await createGameScore(game.id, scoreSource, 80);
		await createGameTime(game.id, "hltb", 10);
		const toAdd = await createList(owner.user.id, scoreSource);
		const toKeep = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});
		const toRemove = await createList(owner.user.id, scoreSource);
		const untouched = await createList(owner.user.id, scoreSource);
		await addItem(toAdd.id, other.id, 1);
		await addItem(toKeep.id, game.id, 1);
		await addItem(toRemove.id, game.id, 1);
		await addItem(toRemove.id, other.id, 2);
		await addItem(toRemove.id, third.id, 3);

		const response = await putGameLists(owner.authorization, game.id, [
			toAdd.id,
			toKeep.id
		]);

		assert.equal(response.status, 200);
		const containsById = new Map<string, boolean>(
			response.body.data.myLists.map(
				(list: { id: string; contains: boolean }) => [
					list.id,
					list.contains
				]
			)
		);
		assert.equal(containsById.get(toAdd.id), true);
		assert.equal(containsById.get(toKeep.id), true);
		assert.equal(containsById.get(toRemove.id), false);
		assert.equal(containsById.get(untouched.id), false);
		assert.ok(Array.isArray(response.body.data.lists));
		assert.deepEqual(
			response.body.data.lists.map((list: { id: string }) => list.id),
			[toKeep.id]
		);

		assert.deepEqual(await listGameIds(toAdd.id), [other.id, game.id]);
		assert.deepEqual(await listPositions(toAdd.id), [1, 2]);
		assert.deepEqual(await listGameIds(toRemove.id), [other.id, third.id]);
		assert.deepEqual(await listPositions(toRemove.id), [1, 2]);

		const added = await ListItem.findOne({
			where: { listId: toAdd.id, gameId: game.id }
		});
		assert.equal(added?.score, 4);
		assert.equal(added?.duration, 10);
	});

	void it("is idempotent when the final set already matches", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const list = await createList(owner.user.id, scoreSource);
		await addItem(list.id, game.id, 1);

		const response = await putGameLists(owner.authorization, game.id, [
			list.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(await listGameIds(list.id), [game.id]);
	});

	void it("removes the game from every list when listIds is empty", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const list = await createList(owner.user.id, scoreSource);
		await addItem(list.id, game.id, 1);

		const response = await putGameLists(owner.authorization, game.id, []);

		assert.equal(response.status, 200);
		assert.deepEqual(await listGameIds(list.id), []);
	});

	void it("rejects a list owned by someone else without applying anything", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUserWithSession();
		const game = await createGame();
		const ownList = await createList(owner.user.id, scoreSource);
		const foreignList = await createList(stranger.user.id, scoreSource);

		const response = await putGameLists(owner.authorization, game.id, [
			ownList.id,
			foreignList.id
		]);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "LIST_ITEM_FORBIDDEN");
		assert.deepEqual(await listGameIds(ownList.id), []);
		assert.deepEqual(await listGameIds(foreignList.id), []);
	});

	void it("answers 404 for an unknown list and applies nothing", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const ownList = await createList(owner.user.id, scoreSource);

		const response = await putGameLists(owner.authorization, game.id, [
			ownList.id,
			randomUUID()
		]);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_ITEM_LIST_NOT_FOUND");
		assert.deepEqual(await listGameIds(ownList.id), []);
	});

	void it("answers 404 for an unknown game", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);

		const response = await putGameLists(owner.authorization, randomUUID(), [
			list.id
		]);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_ITEM_GAMES_NOT_FOUND");
	});

	void it("rejects a frozen free user without applying anything", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const lists = [];
		for (let index = 0; index <= FREE_LIST_LIMIT; index++) {
			lists.push(await createList(owner.user.id, scoreSource));
		}
		const [first, second] = lists;
		await addItem(second!.id, game.id, 1);

		const response = await putGameLists(owner.authorization, game.id, [
			first!.id
		]);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "LIST_ITEM_FROZEN");
		assert.deepEqual(await listGameIds(first!.id), []);
		assert.deepEqual(await listGameIds(second!.id), [game.id]);
	});

	void it("rejects duplicate and malformed listIds", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const list = await createList(owner.user.id, scoreSource);

		const duplicated = await putGameLists(owner.authorization, game.id, [
			list.id,
			list.id
		]);
		const malformed = await putGameLists(owner.authorization, game.id, [
			"not-a-uuid"
		]);

		assert.equal(duplicated.status, 422);
		assert.equal(malformed.status, 422);
	});

	void it("rejects a request without a token", async () => {
		const response = await api()
			.put(`/games/${randomUUID()}/lists`)
			.send({ listIds: [] });

		assert.equal(response.status, 422);
	});

	void it("rolls back additions and removals when a write fails midway", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const firstToAdd = await createList(owner.user.id, scoreSource);
		const secondToAdd = await createList(owner.user.id, scoreSource);
		const toRemove = await createList(owner.user.id, scoreSource);
		await addItem(toRemove.id, game.id, 1);

		const destroyMock = mock.method(ListItem, "destroy", (() =>
			Promise.reject(new Error("boom"))) as typeof ListItem.destroy);

		try {
			const response = await putGameLists(owner.authorization, game.id, [
				firstToAdd.id,
				secondToAdd.id
			]);

			assert.equal(response.status, 500);
			assert.equal(destroyMock.mock.callCount(), 1);
		} finally {
			destroyMock.mock.restore();
		}

		assert.deepEqual(await listGameIds(firstToAdd.id), []);
		assert.deepEqual(await listGameIds(secondToAdd.id), []);
		assert.deepEqual(await listGameIds(toRemove.id), [game.id]);
	});
});
