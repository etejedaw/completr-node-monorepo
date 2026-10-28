import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { Queue } from "../../src/queue/queue.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

const QUEUE_PATH = "/users/me/queue";
const FREE_QUEUE_LIMIT = 10;

useTestDatabase();

async function createOwnedBacklog(
	userId: string,
	status: Parameters<typeof createBacklog>[3] = {}
) {
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	return createBacklog(userId, game.id, platform.id, status);
}

async function createOwnedBacklogs(userId: string, count: number) {
	const backlogs = [];
	for (let index = 0; index < count; index++) {
		backlogs.push(await createOwnedBacklog(userId));
	}
	return backlogs;
}

async function fillQueue(userId: string, count: number) {
	const backlogs = await createOwnedBacklogs(userId, count);
	await Queue.bulkCreate(
		backlogs.map((backlog, index) => ({
			userId,
			backlogId: backlog.id,
			position: index + 1
		}))
	);
	return backlogs;
}

function addFromBacklog(authorization: string, backlogId: string) {
	return api()
		.post(QUEUE_PATH)
		.query({ source: "backlog" })
		.set("Authorization", authorization)
		.send({ id: backlogId });
}

function addFromGame(authorization: string, body: Record<string, unknown>) {
	return api()
		.post(QUEUE_PATH)
		.query({ source: "game" })
		.set("Authorization", authorization)
		.send(body);
}

function replaceQueue(authorization: string, backlogIds: string[]) {
	return api()
		.put(QUEUE_PATH)
		.set("Authorization", authorization)
		.send({ backlogIds });
}

void describe("POST /users/me/queue", () => {
	void it("queues an existing not_started backlog entry at the end", async () => {
		const owner = await createUserWithSession();
		const [first, second] = await createOwnedBacklogs(owner.user.id, 2);
		await addFromBacklog(owner.authorization, first!.id).expect(201);

		const response = await addFromBacklog(owner.authorization, second!.id);

		assert.equal(response.status, 201);
		assert.equal(response.body.data.queue.position, 2);
		assert.equal(response.body.data.queue.backlog.id, second!.id);
		assert.equal(response.body.data.queue.backlog.status, "not_started");
	});

	void it("creates a not_started backlog entry when queuing a game", async () => {
		const owner = await createUserWithSession();
		const [game, platform] = await Promise.all([
			createGame(),
			createPlatform()
		]);

		const response = await addFromGame(owner.authorization, {
			id: game.id,
			platformId: platform.id
		});

		assert.equal(response.status, 201);
		const backlogId = response.body.data.queue.backlog.id;
		const backlog = await Backlog.findByPk(backlogId);
		assert.equal(backlog?.userId, owner.user.id);
		assert.equal(backlog?.gameId, game.id);
		assert.equal(backlog?.status, "not_started");
		assert.equal(response.body.data.queue.backlog.platform.id, platform.id);
	});

	void it("rejects queuing a game without platform with 400 QUEUE_SOURCE_MISMATCH", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();

		const response = await addFromGame(owner.authorization, {
			id: game.id
		});

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "QUEUE_SOURCE_MISMATCH");
	});

	for (const [description, query, body] of [
		["a missing source", {}, { id: randomUUID() }],
		["an unknown source", { source: "wishlist" }, { id: randomUUID() }],
		["a malformed id", { source: "backlog" }, { id: "not-a-uuid" }],
		[
			"unknown fields",
			{ source: "backlog" },
			{ id: randomUUID(), extra: 1 }
		]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const owner = await createUserWithSession();

			const response = await api()
				.post(QUEUE_PATH)
				.query(query)
				.set("Authorization", owner.authorization)
				.send(body);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("answers 404 QUEUE_BACKLOG_NOT_FOUND for an unknown backlog entry", async () => {
		const owner = await createUserWithSession();

		const response = await addFromBacklog(
			owner.authorization,
			randomUUID()
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_FOUND");
	});

	void it("answers 404 QUEUE_GAME_NOT_FOUND and QUEUE_PLATFORM_NOT_FOUND for unknown references", async () => {
		const owner = await createUserWithSession();
		const [game, platform] = await Promise.all([
			createGame(),
			createPlatform()
		]);

		const unknownGame = await addFromGame(owner.authorization, {
			id: randomUUID(),
			platformId: platform.id
		});
		assert.equal(unknownGame.status, 404);
		assert.equal(unknownGame.body.type, "QUEUE_GAME_NOT_FOUND");

		const unknownPlatform = await addFromGame(owner.authorization, {
			id: game.id,
			platformId: randomUUID()
		});
		assert.equal(unknownPlatform.status, 404);
		assert.equal(unknownPlatform.body.type, "QUEUE_PLATFORM_NOT_FOUND");
		assert.equal(
			await Backlog.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("rejects another user's backlog entry with 403 QUEUE_BACKLOG_NOT_OWNED", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const backlog = await createOwnedBacklog(owner.user.id);

		const response = await addFromBacklog(
			intruder.authorization,
			backlog.id
		);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_OWNED");
	});

	void it("rejects an entry that is not not_started with 409 QUEUE_BACKLOG_NOT_STARTED", async () => {
		const owner = await createUserWithSession();
		const backlog = await createOwnedBacklog(owner.user.id, {
			status: "playing"
		});

		const response = await addFromBacklog(owner.authorization, backlog.id);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_STARTED");
	});

	void it("rejects an entry already queued with 409 QUEUE_ALREADY_EXISTS", async () => {
		const owner = await createUserWithSession();
		const backlog = await createOwnedBacklog(owner.user.id);
		await addFromBacklog(owner.authorization, backlog.id).expect(201);

		const response = await addFromBacklog(owner.authorization, backlog.id);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "QUEUE_ALREADY_EXISTS");
	});

	void it("rejects a free user over the limit with 402 QUEUE_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");
		await fillQueue(owner.user.id, FREE_QUEUE_LIMIT);
		const extra = await createOwnedBacklog(owner.user.id);

		const response = await addFromBacklog(owner.authorization, extra.id);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "QUEUE_LIMIT_REACHED");
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			FREE_QUEUE_LIMIT
		);
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");
		await fillQueue(owner.user.id, FREE_QUEUE_LIMIT);
		const extra = await createOwnedBacklog(owner.user.id);

		const response = await addFromBacklog(owner.authorization, extra.id);

		assert.equal(response.status, 201);
		assert.equal(response.body.data.queue.position, FREE_QUEUE_LIMIT + 1);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await addFromBacklog("Bearer invalid", randomUUID());

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

function moveEntry(
	authorization: string,
	backlogId: string,
	position: unknown
) {
	return api()
		.patch(`${QUEUE_PATH}/${backlogId}/position`)
		.set("Authorization", authorization)
		.send({ position });
}

async function storedOrder(userId: string) {
	const rows = await Queue.findAll({
		where: { userId },
		order: [["position", "ASC"]]
	});
	return {
		backlogIds: rows.map(row => row.backlogId),
		positions: rows.map(row => row.position)
	};
}

void describe("PATCH /users/me/queue/:backlogId/position", () => {
	void it("moves an entry and shifts the rest keeping positions contiguous", async () => {
		const owner = await createUserWithSession();
		const [a, b, c, d] = await fillQueue(owner.user.id, 4);

		const response = await moveEntry(owner.authorization, d!.id, 2);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.queue.map(
				(entry: { backlog: { id: string } }) => entry.backlog.id
			),
			[a!.id, d!.id, b!.id, c!.id]
		);
		const stored = await storedOrder(owner.user.id);
		assert.deepEqual(stored.backlogIds, [a!.id, d!.id, b!.id, c!.id]);
		assert.deepEqual(stored.positions, [1, 2, 3, 4]);
	});

	void it("clamps positions beyond the end to the last place", async () => {
		const owner = await createUserWithSession();
		const [a, b, c] = await fillQueue(owner.user.id, 3);

		const response = await moveEntry(owner.authorization, a!.id, 500);

		assert.equal(response.status, 200);
		const stored = await storedOrder(owner.user.id);
		assert.deepEqual(stored.backlogIds, [b!.id, c!.id, a!.id]);
		assert.deepEqual(stored.positions, [1, 2, 3]);
	});

	void it("keeps every entry of a premium queue larger than one page", async () => {
		const owner = await createUserWithSession("premium");
		const backlogs = await fillQueue(owner.user.id, 120);
		const last = backlogs[119]!;

		const response = await moveEntry(owner.authorization, last.id, 1);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.queue.length, 120);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			120
		);
		const stored = await storedOrder(owner.user.id);
		assert.equal(stored.backlogIds[0], last.id);
		assert.deepEqual(
			stored.positions,
			Array.from({ length: 120 }, (_, index) => index + 1)
		);
	});

	void it("does not lose entries hidden by a search or a later page", async () => {
		const owner = await createUserWithSession("premium");
		const backlogs = await fillQueue(owner.user.id, 105);
		const beforeIds = backlogs.map(backlog => backlog.id);

		await moveEntry(owner.authorization, beforeIds[104]!, 3);
		await moveEntry(owner.authorization, beforeIds[0]!, 104);

		const secondPage = await api()
			.get(QUEUE_PATH)
			.query({ limit: 100, offset: 100 })
			.set("Authorization", owner.authorization);
		assert.equal(secondPage.body.data.total, 105);
		assert.equal(secondPage.body.data.queue.length, 5);
		const stored = await storedOrder(owner.user.id);
		assert.deepEqual([...stored.backlogIds].sort(), [...beforeIds].sort());
	});

	void it("is idempotent when the entry is already in that position", async () => {
		const owner = await createUserWithSession();
		const backlogs = await fillQueue(owner.user.id, 3);
		const expected = backlogs.map(backlog => backlog.id);

		const first = await moveEntry(owner.authorization, backlogs[1]!.id, 2);
		const second = await moveEntry(owner.authorization, backlogs[1]!.id, 2);

		assert.equal(first.status, 200);
		assert.equal(second.status, 200);
		assert.deepEqual(
			(await storedOrder(owner.user.id)).backlogIds,
			expected
		);
	});

	void it("serializes concurrent moves without duplicating or losing positions", async () => {
		const owner = await createUserWithSession("premium");
		const backlogs = await fillQueue(owner.user.id, 8);

		const responses = await Promise.all(
			backlogs.map((backlog, index) =>
				moveEntry(owner.authorization, backlog.id, 8 - index)
			)
		);

		assert.ok(responses.every(response => response.status === 200));
		const stored = await storedOrder(owner.user.id);
		assert.deepEqual(
			stored.positions,
			Array.from({ length: 8 }, (_, index) => index + 1)
		);
		assert.deepEqual(
			[...stored.backlogIds].sort(),
			backlogs.map(backlog => backlog.id).sort()
		);
	});

	void it("rejects a backlog that is not in the queue with 404 QUEUE_BACKLOG_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		await fillQueue(owner.user.id, 2);
		const outside = await createOwnedBacklog(owner.user.id);

		const response = await moveEntry(owner.authorization, outside.id, 1);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_FOUND");
	});

	void it("answers 404 for an unknown backlog id", async () => {
		const owner = await createUserWithSession();

		const response = await moveEntry(owner.authorization, randomUUID(), 1);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_FOUND");
	});

	void it("does not touch another user's queue", async () => {
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		const [foreignA, foreignB] = await fillQueue(other.user.id, 2);
		await fillQueue(owner.user.id, 2);

		const response = await moveEntry(owner.authorization, foreignB!.id, 1);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_FOUND");
		assert.deepEqual((await storedOrder(other.user.id)).backlogIds, [
			foreignA!.id,
			foreignB!.id
		]);
	});

	void it("rejects garbage positions with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const [first] = await fillQueue(owner.user.id, 2);
		const garbage: unknown[] = [
			0,
			-1,
			1.5,
			"2",
			"",
			null,
			undefined,
			"<script>alert(1)</script>",
			"🎮",
			Number.MAX_SAFE_INTEGER,
			[1],
			{ value: 1 }
		];

		for (const position of garbage) {
			const response = await moveEntry(
				owner.authorization,
				first!.id,
				position
			);
			assert.equal(response.status, 422, JSON.stringify(position));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("rejects extra body fields and malformed ids with 422", async () => {
		const owner = await createUserWithSession();
		const [first] = await fillQueue(owner.user.id, 1);

		const extra = await api()
			.patch(`${QUEUE_PATH}/${first!.id}/position`)
			.set("Authorization", owner.authorization)
			.send({ position: 1, backlogId: first!.id });
		const malformed = await moveEntry(owner.authorization, "not-a-uuid", 1);

		assert.equal(extra.status, 422);
		assert.equal(malformed.status, 422);
	});

	void it("rejects an invalid token with 401", async () => {
		const response = await api()
			.patch(`${QUEUE_PATH}/${randomUUID()}/position`)
			.set("Authorization", "Bearer invalid-token")
			.send({ position: 1 });

		assert.equal(response.status, 401);
	});
});

void describe("PUT /users/me/queue", () => {
	void it("replaces the queue keeping the requested order", async () => {
		const owner = await createUserWithSession();
		const [first, second, third] = await fillQueue(owner.user.id, 3);

		const response = await replaceQueue(owner.authorization, [
			third!.id,
			first!.id,
			second!.id
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.queue.map(
				(entry: { backlog: { id: string } }) => entry.backlog.id
			),
			[third!.id, first!.id, second!.id]
		);
		assert.deepEqual(
			response.body.data.queue.map(
				(entry: { position: number }) => entry.position
			),
			[1, 2, 3]
		);
	});

	void it("clears the queue with an empty list", async () => {
		const owner = await createUserWithSession();
		await fillQueue(owner.user.id, 2);

		const response = await replaceQueue(owner.authorization, []);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.queue, []);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("rejects duplicated ids with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const backlog = await createOwnedBacklog(owner.user.id);

		const response = await replaceQueue(owner.authorization, [
			backlog.id,
			backlog.id
		]);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects entries of another user with 404 QUEUE_BACKLOGS_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		const [mine] = await fillQueue(owner.user.id, 1);
		const foreign = await createOwnedBacklog(other.user.id);

		const response = await replaceQueue(owner.authorization, [
			mine!.id,
			foreign.id
		]);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "QUEUE_BACKLOGS_NOT_FOUND");
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			1
		);
	});

	void it("rejects entries that are not not_started with 409 QUEUE_BACKLOG_NOT_STARTED", async () => {
		const owner = await createUserWithSession();
		const playing = await createOwnedBacklog(owner.user.id, {
			status: "playing"
		});

		const response = await replaceQueue(owner.authorization, [playing.id]);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_STARTED");
	});

	void it("rejects a free user's queue over the limit with 402 QUEUE_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");
		const backlogs = await createOwnedBacklogs(
			owner.user.id,
			FREE_QUEUE_LIMIT + 1
		);

		const response = await replaceQueue(
			owner.authorization,
			backlogs.map(backlog => backlog.id)
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "QUEUE_LIMIT_REACHED");
	});
});

void describe("GET /users/me/queue", () => {
	void it("lists the queue in order with its total and the backlog ids", async () => {
		const owner = await createUserWithSession();
		const backlogs = await fillQueue(owner.user.id, 3);
		await fillQueue((await createUserWithSession()).user.id, 1);

		const response = await api()
			.get(QUEUE_PATH)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 3);
		assert.deepEqual(
			response.body.data.queue.map(
				(entry: { backlog: { id: string } }) => entry.backlog.id
			),
			backlogs.map(backlog => backlog.id)
		);

		const ids = await api()
			.get(`${QUEUE_PATH}/backlog-ids`)
			.set("Authorization", owner.authorization);
		assert.equal(ids.status, 200);
		assert.deepEqual(
			ids.body.data.backlogIds,
			backlogs.map(backlog => backlog.id)
		);
	});

	void it("paginates keeping the full total", async () => {
		const owner = await createUserWithSession();
		await fillQueue(owner.user.id, 3);

		const response = await api()
			.get(QUEUE_PATH)
			.query({ limit: 2 })
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.queue.length, 2);
		assert.equal(response.body.data.total, 3);
	});
});

void describe("GET /users/:username/queue", () => {
	void it("serves a public queue without authentication", async () => {
		const owner = await createUserWithSession();
		await fillQueue(owner.user.id, 2);

		const response = await api().get(`/users/${owner.user.username}/queue`);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
	});

	void it("hides the backlog notes of a public queue", async () => {
		const owner = await createUserWithSession();
		const [backlog] = await fillQueue(owner.user.id, 1);
		await backlog!.update({ notes: "Private thoughts" });
		const viewer = await createUserWithSession();

		const response = await api()
			.get(`/users/${owner.user.username}/queue`)
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 200);
		assert.equal("notes" in response.body.data.queue[0].backlog, false);

		const own = await api()
			.get(QUEUE_PATH)
			.set("Authorization", owner.authorization);

		assert.equal(own.body.data.queue[0].backlog.notes, "Private thoughts");
	});

	void it("hides entries of private backlogs keeping order, total and pagination", async () => {
		const owner = await createUserWithSession();
		const backlogs = await fillQueue(owner.user.id, 4);
		await backlogs[1]!.update({ isPublic: false });
		const visibleIds = [backlogs[0]!, backlogs[2]!, backlogs[3]!].map(
			backlog => backlog.id
		);
		const path = `/users/${owner.user.username}/queue`;

		const response = await api().get(path);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 3);
		assert.deepEqual(
			response.body.data.queue.map(
				(entry: { backlog: { id: string } }) => entry.backlog.id
			),
			visibleIds
		);
		assert.deepEqual(
			response.body.data.queue.map(
				(entry: { position: number }) => entry.position
			),
			[1, 2, 3]
		);

		const page = await api().get(path).query({ limit: 2, offset: 1 });

		assert.equal(page.body.data.total, 3);
		assert.deepEqual(
			page.body.data.queue.map(
				(entry: { position: number }) => entry.position
			),
			[2, 3]
		);
		assert.deepEqual(
			page.body.data.queue.map(
				(entry: { backlog: { id: string } }) => entry.backlog.id
			),
			visibleIds.slice(1)
		);
	});

	void it("does not expose the mood tags of the owner", async () => {
		const owner = await createUserWithSession();
		const [backlog] = await fillQueue(owner.user.id, 1);
		await UserGameTag.create({
			userId: owner.user.id,
			gameId: backlog!.gameId,
			tag: "cozy"
		});

		const response = await api().get(`/users/${owner.user.username}/queue`);

		assert.equal(response.status, 200);
		assert.equal("moodTags" in response.body.data.queue[0].backlog, false);

		const own = await api()
			.get(QUEUE_PATH)
			.set("Authorization", owner.authorization);

		assert.deepEqual(own.body.data.queue[0].backlog.moodTags, ["cozy"]);
	});

	void it("keeps private backlogs in the own queue", async () => {
		const owner = await createUserWithSession();
		const backlogs = await fillQueue(owner.user.id, 2);
		await backlogs[0]!.update({ isPublic: false, notes: "Mine" });

		const own = await api()
			.get(QUEUE_PATH)
			.set("Authorization", owner.authorization);

		assert.equal(own.body.data.total, 2);
		assert.equal(own.body.data.queue[0].backlog.notes, "Mine");
	});

	void it("rejects a private queue with 403 USER_PRIVATE", async () => {
		const owner = await createUserWithSession();
		await User.update(
			{ queueVisibility: "private" },
			{ where: { id: owner.user.id } }
		);

		const response = await api().get(`/users/${owner.user.username}/queue`);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});

	void it("answers 404 USER_NOT_FOUND for an unknown username", async () => {
		const response = await api().get("/users/ghost_user/queue");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});
});

void describe("queue positions when an entry leaves the queue", () => {
	async function queuedPositions(userId: string) {
		const entries = await Queue.findAll({
			where: { userId },
			order: [["position", "ASC"]]
		});
		return entries.map(entry => [entry.backlogId, entry.position]);
	}

	void it("compacts the remaining entries when a backlog starts playing", async () => {
		const owner = await createUserWithSession();
		const [first, second, third] = await fillQueue(owner.user.id, 3);

		const response = await api()
			.patch(`/users/me/backlog/${second!.id}`)
			.set("Authorization", owner.authorization)
			.send({ status: "playing" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.queueRemoved, true);
		assert.deepEqual(await queuedPositions(owner.user.id), [
			[first!.id, 1],
			[third!.id, 2]
		]);
	});

	void it("compacts the remaining entries when a queued backlog is deleted", async () => {
		const owner = await createUserWithSession();
		const [first, second, third] = await fillQueue(owner.user.id, 3);

		const response = await api()
			.delete(`/users/me/backlog/${first!.id}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 204);
		assert.deepEqual(await queuedPositions(owner.user.id), [
			[second!.id, 1],
			[third!.id, 2]
		]);
	});

	void it("appends after the compacted entries without repeating a position", async () => {
		const owner = await createUserWithSession();
		const [first, second] = await fillQueue(owner.user.id, 2);
		await api()
			.patch(`/users/me/backlog/${first!.id}`)
			.set("Authorization", owner.authorization)
			.send({ status: "playing" })
			.expect(200);
		const [next] = await createOwnedBacklogs(owner.user.id, 1);

		const response = await addFromBacklog(owner.authorization, next!.id);

		assert.equal(response.status, 201);
		assert.equal(response.body.data.queue.position, 2);
		assert.deepEqual(await queuedPositions(owner.user.id), [
			[second!.id, 1],
			[next!.id, 2]
		]);
	});

	void it("leaves the queue of other users untouched", async () => {
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		const [first] = await fillQueue(owner.user.id, 2);
		const othersBacklogs = await fillQueue(other.user.id, 2);

		await api()
			.delete(`/users/me/backlog/${first!.id}`)
			.set("Authorization", owner.authorization)
			.expect(204);

		assert.deepEqual(
			await queuedPositions(other.user.id),
			othersBacklogs.map((backlog, index) => [backlog.id, index + 1])
		);
	});
});
