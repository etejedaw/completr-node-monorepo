import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { GameScore } from "../../src/game-scores/game-score.model";
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

function listPayload(overrides: Record<string, unknown> = {}) {
	return {
		name: "Shortest JRPGs",
		description: "Ranked by ratio",
		scoreSource,
		durationSource: "hltb",
		...overrides
	};
}

async function createListsFor(userId: string, count: number) {
	for (let index = 0; index < count; index++) {
		await createList(userId, scoreSource);
	}
}

async function createRatedGame(score: number, hours: number) {
	const game = await createGame();
	await createGameScore(game.id, scoreSource, score);
	await createGameTime(game.id, "hltb", hours);
	return game;
}

void describe("lists CRUD", () => {
	void it("creates a list and returns it in /lists/me", async () => {
		const owner = await createUserWithSession();

		const created = await api()
			.post("/lists")
			.set("Authorization", owner.authorization)
			.send(listPayload({ isPublic: true }));

		assert.equal(created.status, 201);
		assert.equal(created.body.data.list.name, "Shortest JRPGs");
		assert.equal(created.body.data.list.isPublic, true);
		assert.equal(created.body.data.list.scoreSource, scoreSource);

		const mine = await api()
			.get("/lists/me")
			.set("Authorization", owner.authorization);
		assert.equal(mine.status, 200);
		assert.equal(mine.body.data.total, 1);
		assert.equal(mine.body.data.frozen, false);
		assert.equal(mine.body.data.lists[0].id, created.body.data.list.id);
	});

	void it("updates and deletes an owned list", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);

		const updated = await api()
			.patch(`/lists/${list.id}`)
			.set("Authorization", owner.authorization)
			.send({ name: "Renamed", isPublic: true });
		assert.equal(updated.status, 200);
		assert.equal(updated.body.data.list.name, "Renamed");
		assert.equal(updated.body.data.list.isPublic, true);

		const deleted = await api()
			.delete(`/lists/${list.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(deleted.status, 204);

		const fetched = await api()
			.get(`/lists/${list.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(fetched.status, 404);
		assert.equal(fetched.body.type, "LIST_NOT_FOUND");
	});

	void it("rejects an invalid body with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.post("/lists")
			.set("Authorization", owner.authorization)
			.send(listPayload({ durationSource: "metacritic" }));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an unknown score source with 422 LIST_SCORE_SOURCE_NOT_FOUND", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.post("/lists")
			.set("Authorization", owner.authorization)
			.send(listPayload({ scoreSource: "does-not-exist" }));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "LIST_SCORE_SOURCE_NOT_FOUND");
	});

	void it("rejects a malformed list id with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.get("/lists/not-a-uuid")
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("answers 404 LIST_NOT_FOUND for an unknown list", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.patch(`/lists/${randomUUID()}`)
			.set("Authorization", owner.authorization)
			.send({ name: "Ghost" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});

	void it("rejects an unauthenticated request with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/lists/me")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("lists privacy and ownership", () => {
	void it("serves a public list to other users", async () => {
		const owner = await createUserWithSession();
		const viewer = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});

		const response = await api()
			.get(`/lists/${list.id}`)
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.list.id, list.id);
		assert.equal(
			response.body.data.list.owner.username,
			owner.user.username
		);
	});

	void it("hides a private list from other users with 404 LIST_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const viewer = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);

		const response = await api()
			.get(`/lists/${list.id}`)
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});

	void it("rejects editing another user's list with 403 LIST_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});

		const patched = await api()
			.patch(`/lists/${list.id}`)
			.set("Authorization", intruder.authorization)
			.send({ name: "Hijacked" });
		assert.equal(patched.status, 403);
		assert.equal(patched.body.type, "LIST_FORBIDDEN");

		const deleted = await api()
			.delete(`/lists/${list.id}`)
			.set("Authorization", intruder.authorization);
		assert.equal(deleted.status, 403);
		assert.equal(deleted.body.type, "LIST_FORBIDDEN");
	});
});

void describe("lists free limit", () => {
	void it("rejects a free user's list over the limit with 402 LIST_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");
		await createListsFor(owner.user.id, FREE_LIST_LIMIT);

		const response = await api()
			.post("/lists")
			.set("Authorization", owner.authorization)
			.send(listPayload());

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "LIST_LIMIT_REACHED");
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");
		await createListsFor(owner.user.id, FREE_LIST_LIMIT);

		const response = await api()
			.post("/lists")
			.set("Authorization", owner.authorization)
			.send(listPayload());

		assert.equal(response.status, 201);
	});

	void it("freezes a free user over the limit: no updates, deletes allowed", async () => {
		const owner = await createUserWithSession("user");
		await createListsFor(owner.user.id, FREE_LIST_LIMIT);
		const extra = await createList(owner.user.id, scoreSource);
		const game = await createGame();

		const mine = await api()
			.get("/lists/me")
			.set("Authorization", owner.authorization);
		assert.equal(mine.body.data.frozen, true);

		const patched = await api()
			.patch(`/lists/${extra.id}`)
			.set("Authorization", owner.authorization)
			.send({ name: "Frozen" });
		assert.equal(patched.status, 402);
		assert.equal(patched.body.type, "LIST_FROZEN");

		const added = await api()
			.post(`/lists/${extra.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: game.id });
		assert.equal(added.status, 402);
		assert.equal(added.body.type, "LIST_ITEM_FROZEN");

		const deleted = await api()
			.delete(`/lists/${extra.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(deleted.status, 204);
	});
});

void describe("POST /lists/:listId/duplicate", () => {
	void it("copies a public list of another user as a private list with its items", async () => {
		const owner = await createUserWithSession();
		const copier = await createUserWithSession();
		const source = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});
		const game = await createRatedGame(80, 10);
		await api()
			.post(`/lists/${source.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: game.id })
			.expect(201);

		const response = await api()
			.post(`/lists/${source.id}/duplicate`)
			.set("Authorization", copier.authorization)
			.send({ name: "My copy" });

		assert.equal(response.status, 201);
		const copy = response.body.data.list;
		assert.notEqual(copy.id, source.id);
		assert.equal(copy.userId, copier.user.id);
		assert.equal(copy.name, "My copy");
		assert.equal(copy.isPublic, false);
		assert.equal(copy.items.length, 1);
		assert.equal(copy.items[0].game.id, game.id);
		assert.equal(copy.items[0].score, 4);
	});

	void it("rejects copying another user's private list with 403 LIST_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const copier = await createUserWithSession();
		const source = await createList(owner.user.id, scoreSource);

		const response = await api()
			.post(`/lists/${source.id}/duplicate`)
			.set("Authorization", copier.authorization)
			.send({ name: "Sneaky copy" });

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "LIST_FORBIDDEN");
	});

	void it("answers 404 LIST_NOT_FOUND for an unknown list", async () => {
		const copier = await createUserWithSession();

		const response = await api()
			.post(`/lists/${randomUUID()}/duplicate`)
			.set("Authorization", copier.authorization)
			.send({ name: "Ghost copy" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});

	void it("rejects a free user's copy over the limit with 402 LIST_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession();
		const copier = await createUserWithSession("user");
		await createListsFor(copier.user.id, FREE_LIST_LIMIT);
		const source = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});

		const response = await api()
			.post(`/lists/${source.id}/duplicate`)
			.set("Authorization", copier.authorization)
			.send({ name: "One too many" });

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "LIST_LIMIT_REACHED");
	});
});

void describe("list items", () => {
	void it("adds a game freezing the normalized score and duration of the list sources", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const game = await createRatedGame(80, 10);

		const response = await api()
			.post(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: game.id });

		assert.equal(response.status, 201);
		assert.equal(response.body.data.item.position, 1);
		assert.equal(response.body.data.item.score, 4);
		assert.equal(response.body.data.item.duration, 10);
		assert.equal(response.body.data.item.ratio, 8);
	});

	void it("leaves score and ratio empty when the source has no data", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const game = await createGame();

		const response = await api()
			.post(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: game.id });

		assert.equal(response.status, 201);
		assert.equal(response.body.data.item.score, null);
		assert.equal(response.body.data.item.duration, null);
		assert.equal(response.body.data.item.ratio, undefined);
	});

	void it("replaces the items keeping the requested order", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const first = await createGame();
		const second = await createGame();
		const third = await createGame();

		const response = await api()
			.put(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameIds: [first.id, second.id, third.id] });

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.items.map(
				(item: { game: { id: string } }) => item.game.id
			),
			[first.id, second.id, third.id]
		);
		assert.deepEqual(
			response.body.data.items.map(
				(item: { position: number }) => item.position
			),
			[1, 2, 3]
		);
	});

	void it("reorders existing items when replacing", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const first = await createGame();
		const second = await createGame();
		await api()
			.put(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameIds: [first.id, second.id] })
			.expect(200);

		const response = await api()
			.put(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameIds: [second.id, first.id] });

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.items.map(
				(item: { game: { id: string } }) => item.game.id
			),
			[second.id, first.id]
		);
	});

	void it("rejects duplicated game ids with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const game = await createGame();

		const response = await api()
			.put(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameIds: [game.id, game.id] });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an unknown game with 404 LIST_ITEM_GAMES_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);

		const response = await api()
			.post(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: randomUUID() });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_ITEM_GAMES_NOT_FOUND");
	});

	void it("rejects adding to an unknown list with 404 LIST_ITEM_LIST_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();

		const response = await api()
			.post(`/lists/${randomUUID()}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: game.id });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_ITEM_LIST_NOT_FOUND");
	});

	void it("rejects touching another user's items with 403 LIST_ITEM_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});
		const game = await createGame();

		const response = await api()
			.post(`/lists/${list.id}/items`)
			.set("Authorization", intruder.authorization)
			.send({ gameId: game.id });

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "LIST_ITEM_FORBIDDEN");
	});

	void it("removes an item", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const game = await createGame();
		await api()
			.post(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: game.id })
			.expect(201);

		const response = await api()
			.delete(`/lists/${list.id}/items/${game.id}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 204);
		const fetched = await api()
			.get(`/lists/${list.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(fetched.body.data.list.items.length, 0);
	});

	void it("refreshes frozen scores from the declared source", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, scoreSource);
		const game = await createRatedGame(80, 10);
		await api()
			.post(`/lists/${list.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameId: game.id })
			.expect(201);
		await GameScore.update(
			{ score: 90 },
			{ where: { gameId: game.id, source: scoreSource } }
		);

		const response = await api()
			.post(`/lists/${list.id}/refresh-scores`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.updatedItems, 1);
		const fetched = await api()
			.get(`/lists/${list.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(fetched.body.data.list.items[0].score, 4.5);
	});
});
