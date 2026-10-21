import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { BacklogProgress } from "../../src/backlog-progress/backlog-progress.model";
import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { Queue } from "../../src/queue/queue.model";
import { Review } from "../../src/reviews/review.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createShelfEntries
} from "../helpers/factories.helper";

const BACKLOG_PATH = "/users/me/backlog";
const FREE_QUEUE_LIMIT = 10;
const FREE_SHELF_LIMIT = 250;

useTestDatabase();

async function createGameAndPlatform(title?: string) {
	const [game, platform] = await Promise.all([
		createGame({ title }),
		createPlatform()
	]);
	return { game, platform };
}

function backlogPayload(
	gameId: string,
	platformId: string,
	overrides: Record<string, unknown> = {}
) {
	return { gameId, platformId, score: 4, duration: 10, ...overrides };
}

async function addToBacklog(
	authorization: string,
	body: Record<string, unknown>
) {
	return api()
		.post(BACKLOG_PATH)
		.set("Authorization", authorization)
		.send(body);
}

function idsOf(response: { body: { data: { backlog: { id: string }[] } } }) {
	return response.body.data.backlog.map(entry => entry.id);
}

void describe("POST /users/me/backlog", () => {
	void it("creates an entry as not_started with its ratio", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, { notes: "Play after exams" })
		);

		assert.equal(response.status, 201);
		const entry = response.body.data.backlog;
		assert.equal(entry.status, "not_started");
		assert.equal(entry.score, 4);
		assert.equal(entry.duration, 10);
		assert.equal(entry.ratio, 8);
		assert.equal(entry.notes, "Play after exams");
		assert.equal(entry.game.id, game.id);
		assert.equal(entry.platform.id, platform.id);
	});

	void it("creates a new entry for every playthrough of the same game", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();

		const first = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id)
		);
		const second = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, { status: "playing" })
		);

		assert.equal(first.status, 201);
		assert.equal(second.status, 201);
		assert.notEqual(
			first.body.data.backlog.id,
			second.body.data.backlog.id
		);
		assert.equal(
			await Backlog.count({
				where: { userId: owner.user.id, gameId: game.id }
			}),
			2
		);
	});

	for (const [description, overrides] of [
		["a score above 5", { score: 5.5 }],
		["a score with more than 2 decimals", { score: 4.123 }],
		["a duration with more than 2 decimals", { duration: 10.555 }],
		["a user rating off the half-point step", { userRating: 3.3 }],
		["an unknown status", { status: "paused" }],
		["a missing duration", { duration: undefined }]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const owner = await createUserWithSession();
			const { game, platform } = await createGameAndPlatform();

			const response = await addToBacklog(
				owner.authorization,
				backlogPayload(game.id, platform.id, overrides)
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("rejects an unknown game with 422 COMMON_REFERENCE_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(randomUUID(), platform.id)
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_REFERENCE_NOT_FOUND");
	});

	void it("rejects a compilation that does not contain the game with 400 BACKLOG_COMPILATION_CONTEXT_INVALID", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const notACompilation = await createGame();

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				compilationGameId: notACompilation.id
			})
		);

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "BACKLOG_COMPILATION_CONTEXT_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const { game, platform } = await createGameAndPlatform();

		const response = await addToBacklog(
			"Bearer invalid",
			backlogPayload(game.id, platform.id)
		);

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("POST /users/me/backlog with extras", () => {
	const extras = {
		status: "not_started",
		addToQueue: true,
		addToShelf: true,
		moodTags: ["Cozy", "co-op"],
		progressNote: "Chapter 3"
	};

	async function fillQueue(userId: string, count: number) {
		const { game, platform } = await createGameAndPlatform();
		for (let position = 1; position <= count; position++) {
			const backlog = await createBacklog(userId, game.id, platform.id);
			await Queue.create({ userId, backlogId: backlog.id, position });
		}
	}

	async function countWrites(userId: string, gameId: string) {
		const [backlogs, reviews, tags, progress, queue, shelf] =
			await Promise.all([
				Backlog.count({ where: { userId, gameId } }),
				Review.count({ where: { userId, gameId } }),
				UserGameTag.count({ where: { userId, gameId } }),
				BacklogProgress.count({
					include: [{ model: Backlog, where: { userId, gameId } }]
				}),
				Queue.count({
					where: { userId },
					include: [{ model: Backlog, where: { gameId } }]
				}),
				GameShelf.count({ where: { userId, gameId } })
			]);
		return { backlogs, reviews, tags, progress, queue, shelf };
	}

	const NOTHING_WRITTEN = {
		backlogs: 0,
		reviews: 0,
		tags: 0,
		progress: 0,
		queue: 0,
		shelf: 0
	};

	void it("creates the entry with its queue, shelf, mood tags and progress note", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, extras)
		);

		assert.equal(response.status, 201);
		const backlogId = response.body.data.backlog.id;
		assert.deepEqual(await countWrites(owner.user.id, game.id), {
			backlogs: 1,
			reviews: 0,
			tags: 2,
			progress: 1,
			queue: 1,
			shelf: 1
		});
		const tags = await UserGameTag.findAll({
			where: { userId: owner.user.id, gameId: game.id },
			order: [["tag", "ASC"]]
		});
		assert.deepEqual(
			tags.map(row => row.tag),
			["co-op", "cozy"]
		);
		const note = await BacklogProgress.findOne({ where: { backlogId } });
		assert.equal(note?.note, "Chapter 3");
		const shelf = await GameShelf.findOne({
			where: { userId: owner.user.id, gameId: game.id }
		});
		assert.equal(shelf?.platformId, platform.id);
	});

	void it("creates the review of a completed entry", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				status: "completed",
				userRating: 4.5,
				review: { content: "Loved it", rating: 4.5 }
			})
		);

		assert.equal(response.status, 201);
		const review = await Review.findOne({
			where: { userId: owner.user.id, gameId: game.id }
		});
		assert.equal(review?.content, "Loved it");
		assert.equal(review?.rating, 4.5);
	});

	void it("keeps the existing review and shelf entry instead of failing", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		await Review.create({
			userId: owner.user.id,
			gameId: game.id,
			content: "First impressions"
		});
		await createShelfEntries(owner.user.id, game.id, platform.id, 1);

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				status: "completed",
				addToShelf: true,
				review: { content: "Second run" }
			})
		);

		assert.equal(response.status, 201);
		const counts = await countWrites(owner.user.id, game.id);
		assert.equal(counts.reviews, 1);
		assert.equal(counts.shelf, 1);
		const review = await Review.findOne({
			where: { userId: owner.user.id, gameId: game.id }
		});
		assert.equal(review?.content, "First impressions");
	});

	void it("adds the copy to the shelf when the game is shelved on another platform", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const otherPlatform = await createPlatform();
		await createShelfEntries(owner.user.id, game.id, otherPlatform.id, 1);

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, { addToShelf: true })
		);

		assert.equal(response.status, 201);
		assert.equal((await countWrites(owner.user.id, game.id)).shelf, 2);
	});

	void it("rolls everything back when the shelf limit fails after the other writes", async () => {
		const owner = await createUserWithSession("user");
		const { game, platform } = await createGameAndPlatform();
		const shelved = await createGame();
		await createShelfEntries(
			owner.user.id,
			shelved.id,
			platform.id,
			FREE_SHELF_LIMIT
		);

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				...extras,
				status: "not_started"
			})
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "GAME_SHELF_LIMIT_REACHED");
		assert.deepEqual(
			await countWrites(owner.user.id, game.id),
			NOTHING_WRITTEN
		);
	});

	void it("rolls everything back when Up Next is full", async () => {
		const owner = await createUserWithSession("user");
		const { game, platform } = await createGameAndPlatform();
		await fillQueue(owner.user.id, FREE_QUEUE_LIMIT);

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, extras)
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "QUEUE_LIMIT_REACHED");
		assert.deepEqual(
			await countWrites(owner.user.id, game.id),
			NOTHING_WRITTEN
		);
		assert.equal(
			await Queue.count({ where: { userId: owner.user.id } }),
			FREE_QUEUE_LIMIT
		);
	});

	void it("rejects queueing an entry that is not not_started with 409 and writes nothing", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				status: "playing",
				addToQueue: true,
				moodTags: ["cozy"],
				progressNote: "Chapter 1"
			})
		);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_STARTED");
		assert.deepEqual(
			await countWrites(owner.user.id, game.id),
			NOTHING_WRITTEN
		);
	});

	void it("keeps the previous mood tags when the creation fails", async () => {
		const owner = await createUserWithSession("user");
		const { game, platform } = await createGameAndPlatform();
		await UserGameTag.create({
			userId: owner.user.id,
			gameId: game.id,
			tag: "previous"
		});
		await fillQueue(owner.user.id, FREE_QUEUE_LIMIT);

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				addToQueue: true,
				moodTags: ["replacement"]
			})
		);

		assert.equal(response.status, 402);
		const tags = await UserGameTag.findAll({
			where: { userId: owner.user.id, gameId: game.id }
		});
		assert.deepEqual(
			tags.map(row => row.tag),
			["previous"]
		);
	});

	void it("rejects a review on an entry that is not finished with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();

		const response = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				status: "playing",
				review: { content: "Too early" }
			})
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(
			await Backlog.count({ where: { userId: owner.user.id } }),
			0
		);
	});
});

void describe("PATCH /users/me/backlog/:backlogId", () => {
	void it("changes the status and clears nullable fields", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const created = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, {
				startedAt: "2026-01-01",
				notes: "Draft"
			})
		);
		const backlogId = created.body.data.backlog.id;

		const response = await api()
			.patch(`${BACKLOG_PATH}/${backlogId}`)
			.set("Authorization", owner.authorization)
			.send({
				status: "completed",
				finishedAt: "2026-02-01",
				realDuration: 8,
				userRating: 4.5,
				notes: null
			});

		assert.equal(response.status, 200);
		const entry = response.body.data.backlog;
		assert.equal(entry.status, "completed");
		assert.equal(entry.finishedAt, "2026-02-01");
		assert.equal(entry.realDuration, 8);
		assert.equal(entry.personalRatio, 10);
		assert.equal(entry.userRating, 4.5);
		assert.equal(entry.notes, null);
		assert.equal(response.body.data.queueRemoved, false);
	});

	void it("removes the entry from the queue when it leaves not_started", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const backlog = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);
		await Queue.create({
			userId: owner.user.id,
			backlogId: backlog.id,
			position: 1
		});

		const response = await api()
			.patch(`${BACKLOG_PATH}/${backlog.id}`)
			.set("Authorization", owner.authorization)
			.send({ status: "playing" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.queueRemoved, true);
		assert.equal(
			await Queue.count({ where: { backlogId: backlog.id } }),
			0
		);
	});

	void it("keeps the queue entry when the status stays not_started", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const backlog = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);
		await Queue.create({
			userId: owner.user.id,
			backlogId: backlog.id,
			position: 1
		});

		const response = await api()
			.patch(`${BACKLOG_PATH}/${backlog.id}`)
			.set("Authorization", owner.authorization)
			.send({ score: 3.5 });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.queueRemoved, false);
		assert.equal(
			await Queue.count({ where: { backlogId: backlog.id } }),
			1
		);
	});

	void it("rejects editing another user's entry with 403 BACKLOG_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const backlog = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);

		const response = await api()
			.patch(`${BACKLOG_PATH}/${backlog.id}`)
			.set("Authorization", intruder.authorization)
			.send({ status: "abandoned" });

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "BACKLOG_FORBIDDEN");
	});

	void it("answers 404 BACKLOG_NOT_FOUND for an unknown entry", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.patch(`${BACKLOG_PATH}/${randomUUID()}`)
			.set("Authorization", owner.authorization)
			.send({ status: "playing" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_NOT_FOUND");
	});

	void it("rejects an invalid body with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.patch(`${BACKLOG_PATH}/${randomUUID()}`)
			.set("Authorization", owner.authorization)
			.send({ gameId: randomUUID() });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("DELETE /users/me/backlog/:backlogId", () => {
	void it("removes an owned entry and its queue entry", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const backlog = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);
		await Queue.create({
			userId: owner.user.id,
			backlogId: backlog.id,
			position: 1
		});

		const response = await api()
			.delete(`${BACKLOG_PATH}/${backlog.id}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 204);
		assert.equal(await Backlog.count({ where: { id: backlog.id } }), 0);
		assert.equal(
			await Queue.count({ where: { backlogId: backlog.id } }),
			0
		);
	});

	void it("rejects deleting another user's entry with 403 BACKLOG_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const backlog = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);

		const response = await api()
			.delete(`${BACKLOG_PATH}/${backlog.id}`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "BACKLOG_FORBIDDEN");
	});

	void it("answers 404 BACKLOG_NOT_FOUND for an unknown entry", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.delete(`${BACKLOG_PATH}/${randomUUID()}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_NOT_FOUND");
	});
});

void describe("GET /users/me/backlog", () => {
	async function seedBacklog() {
		const owner = await createUserWithSession();
		const platform = await createPlatform();
		const [celeste, hades, outerWilds] = await Promise.all([
			createGame({ title: "Celeste" }),
			createGame({ title: "Hades" }),
			createGame({ title: "Outer Wilds" })
		]);
		const fastest = await createBacklog(
			owner.user.id,
			celeste.id,
			platform.id,
			{ status: "completed", score: 4.5, duration: 9 }
		);
		const middle = await createBacklog(
			owner.user.id,
			hades.id,
			platform.id,
			{
				status: "playing",
				score: 4.5,
				duration: 22
			}
		);
		const slowest = await createBacklog(
			owner.user.id,
			outerWilds.id,
			platform.id,
			{ status: "not_started", score: 4.5, duration: 30 }
		);
		await createBacklog(
			(await createUserWithSession()).user.id,
			celeste.id,
			platform.id
		);
		return { owner, fastest, middle, slowest };
	}

	void it("lists only the caller's entries with the total", async () => {
		const { owner, fastest, middle, slowest } = await seedBacklog();

		const response = await api()
			.get(BACKLOG_PATH)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 3);
		assert.deepEqual(
			new Set(idsOf(response)),
			new Set([fastest.id, middle.id, slowest.id])
		);
	});

	void it("filters by several statuses", async () => {
		const { owner, fastest, middle } = await seedBacklog();

		const response = await api()
			.get(BACKLOG_PATH)
			.query({ status: "completed,playing" })
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(
			new Set(idsOf(response)),
			new Set([fastest.id, middle.id])
		);
	});

	void it("sorts by ratio", async () => {
		const { owner, fastest, middle, slowest } = await seedBacklog();

		const response = await api()
			.get(BACKLOG_PATH)
			.query({ sort_by: "ratio", sort_order: "desc" })
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(idsOf(response), [fastest.id, middle.id, slowest.id]);
	});

	void it("searches by game title", async () => {
		const { owner, middle } = await seedBacklog();

		const response = await api()
			.get(BACKLOG_PATH)
			.query({ search: "had" })
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(idsOf(response), [middle.id]);
	});

	void it("paginates keeping the full total", async () => {
		const { owner } = await seedBacklog();

		const response = await api()
			.get(BACKLOG_PATH)
			.query({ limit: 2, offset: 0 })
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.backlog.length, 2);
		assert.equal(response.body.data.total, 3);
	});

	for (const [description, query] of [
		["an unknown status", { status: "paused" }],
		["an unknown sort field", { sort_by: "popularity" }],
		["a limit above 100", { limit: 101 }]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const owner = await createUserWithSession();

			const response = await api()
				.get(BACKLOG_PATH)
				.query(query)
				.set("Authorization", owner.authorization);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}
});

void describe("GET /users/:username/backlog", () => {
	void it("hides notes and private entries from other users", async () => {
		const owner = await createUserWithSession();
		const viewer = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const visible = await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, { notes: "Secret" })
		);
		await addToBacklog(
			owner.authorization,
			backlogPayload(game.id, platform.id, { isPublic: false })
		);

		const response = await api()
			.get(`/users/${owner.user.username}/backlog`)
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(idsOf(response), [visible.body.data.backlog.id]);
		assert.equal("notes" in response.body.data.backlog[0], false);
	});

	void it("rejects a private backlog with 403 USER_PRIVATE", async () => {
		const owner = await createUserWithSession();
		await User.update(
			{ backlogVisibility: "private" },
			{ where: { id: owner.user.id } }
		);

		const response = await api().get(
			`/users/${owner.user.username}/backlog`
		);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});
});
