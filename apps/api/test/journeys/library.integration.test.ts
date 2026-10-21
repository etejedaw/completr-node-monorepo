import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";

const SHELF_PATH = "/users/me/game-shelf";
const BACKLOG_PATH = "/users/me/backlog";
const QUEUE_PATH = "/users/me/queue";

useTestDatabase();

type Owner = Awaited<ReturnType<typeof createUserWithSession>>;

interface QueueEntry {
	position: number;
	backlog: { id: string; ratio: number | null; game: { id: string } };
}

interface BacklogEntry {
	id: string;
	status: string;
	score: number;
	duration: number;
	ratio: number | null;
	personalRatio: number | null;
	realDuration: number | null;
	userRating: number | null;
	notes: string | null;
	game: { id: string };
}

void describe("library journey: shelf, backlog, queue and a second playthrough", () => {
	let owner: Owner;
	let platform: Platform;
	let hades: Game;
	let celeste: Game;
	let outerWilds: Game;
	let hadesShelfId: string;
	let hadesFirstRunId: string;
	let hadesSecondRunId: string;
	let celesteRunId: string;
	let outerWildsRunId: string;

	async function getShelf() {
		const response = await api()
			.get(SHELF_PATH)
			.set("Authorization", owner.authorization)
			.expect(200);
		return response.body.data as {
			gameShelf: {
				id: string;
				inBacklog: boolean;
				game: { id: string };
			}[];
			total: number;
		};
	}

	async function getBacklog(query: Record<string, string> = {}) {
		const response = await api()
			.get(BACKLOG_PATH)
			.query(query)
			.set("Authorization", owner.authorization)
			.expect(200);
		return response.body.data as { backlog: BacklogEntry[]; total: number };
	}

	async function getQueue() {
		const response = await api()
			.get(QUEUE_PATH)
			.set("Authorization", owner.authorization)
			.expect(200);
		return response.body.data as { queue: QueueEntry[]; total: number };
	}

	async function queuedBacklogIds() {
		const { queue } = await getQueue();
		return queue.map(entry => entry.backlog.id);
	}

	async function getOwnProfile() {
		const response = await api()
			.get(`/users/${owner.user.username}`)
			.set("Authorization", owner.authorization)
			.expect(200);
		return response.body.data as {
			backlogStats: Record<string, number>;
			backlogTotal: number;
		};
	}

	function queueFromBacklog(backlogId: string) {
		return api()
			.post(QUEUE_PATH)
			.query({ source: "backlog" })
			.set("Authorization", owner.authorization)
			.send({ id: backlogId });
	}

	function queueFromGame(gameId: string) {
		return api()
			.post(QUEUE_PATH)
			.query({ source: "game" })
			.set("Authorization", owner.authorization)
			.send({ id: gameId, platformId: platform.id });
	}

	function patchBacklog(backlogId: string, body: Record<string, unknown>) {
		return api()
			.patch(`${BACKLOG_PATH}/${backlogId}`)
			.set("Authorization", owner.authorization)
			.send(body);
	}

	void it("starts with an empty library", async () => {
		owner = await createUserWithSession();
		platform = await createPlatform();
		[hades, celeste, outerWilds] = await Promise.all([
			createGame({ title: "Hades" }),
			createGame({ title: "Celeste" }),
			createGame({ title: "Outer Wilds" })
		]);

		assert.equal((await getShelf()).total, 0);
		assert.equal((await getBacklog()).total, 0);
		assert.equal((await getQueue()).total, 0);
	});

	void it("adds Hades to the shelf", async () => {
		const response = await api()
			.post(SHELF_PATH)
			.set("Authorization", owner.authorization)
			.send({
				gameId: hades.id,
				platformId: platform.id,
				edition: "Standard"
			});
		assert.equal(response.status, 201);
		hadesShelfId = response.body.data.gameShelf.id;

		const shelf = await getShelf();
		assert.equal(shelf.total, 1);
		assert.equal(shelf.gameShelf[0]!.id, hadesShelfId);
		assert.equal(shelf.gameShelf[0]!.game.id, hades.id);
		assert.equal(shelf.gameShelf[0]!.inBacklog, false);
	});

	void it("rejects a shelf entry with a malformed game id and keeps the shelf as it was", async () => {
		const response = await api()
			.post(SHELF_PATH)
			.set("Authorization", owner.authorization)
			.send({ gameId: "hades", platformId: platform.id });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal((await getShelf()).total, 1);
	});

	void it("creates the backlog entry of the shelved game with its ratio", async () => {
		const response = await api()
			.post(BACKLOG_PATH)
			.set("Authorization", owner.authorization)
			.send({
				gameId: hades.id,
				platformId: platform.id,
				score: 4.5,
				duration: 20
			});
		assert.equal(response.status, 201);
		hadesFirstRunId = response.body.data.backlog.id;

		const { backlog, total } = await getBacklog();
		assert.equal(total, 1);
		assert.equal(backlog[0]!.id, hadesFirstRunId);
		assert.equal(backlog[0]!.status, "not_started");
		assert.equal(backlog[0]!.ratio, 4.5);
		assert.equal((await getShelf()).gameShelf[0]!.inBacklog, true);
	});

	void it("queues the backlog entry", async () => {
		const response = await queueFromBacklog(hadesFirstRunId);
		assert.equal(response.status, 201);
		assert.equal(response.body.data.queue.position, 1);

		assert.deepEqual(await queuedBacklogIds(), [hadesFirstRunId]);
		const ids = await api()
			.get(`${QUEUE_PATH}/backlog-ids`)
			.set("Authorization", owner.authorization)
			.expect(200);
		assert.deepEqual(ids.body.data.backlogIds, [hadesFirstRunId]);
	});

	void it("rejects queuing the same entry twice and keeps a single queue entry", async () => {
		const response = await queueFromBacklog(hadesFirstRunId);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "QUEUE_ALREADY_EXISTS");
		assert.equal((await getQueue()).total, 1);
	});

	void it("queues two more games straight from the catalog", async () => {
		const celesteQueued = await queueFromGame(celeste.id);
		const outerWildsQueued = await queueFromGame(outerWilds.id);
		assert.equal(celesteQueued.status, 201);
		assert.equal(outerWildsQueued.status, 201);
		celesteRunId = celesteQueued.body.data.queue.backlog.id;
		outerWildsRunId = outerWildsQueued.body.data.queue.backlog.id;

		const { queue, total } = await getQueue();
		assert.equal(total, 3);
		assert.deepEqual(
			queue.map(entry => entry.backlog.game.id),
			[hades.id, celeste.id, outerWilds.id]
		);
		assert.deepEqual(
			queue.map(entry => entry.position),
			[1, 2, 3]
		);

		const { backlog } = await getBacklog({ status: "not_started" });
		assert.deepEqual(
			new Set(backlog.map(entry => entry.id)),
			new Set([hadesFirstRunId, celesteRunId, outerWildsRunId])
		);
	});

	void it("serializes a missing ratio as null for games queued without score", async () => {
		const { queue } = await getQueue();
		const celesteEntry = queue.find(
			entry => entry.backlog.id === celesteRunId
		);

		assert.ok(celesteEntry);
		assert.equal(celesteEntry.backlog.ratio, null);
	});

	void it("reorders the queue", async () => {
		const response = await api()
			.put(QUEUE_PATH)
			.set("Authorization", owner.authorization)
			.send({
				backlogIds: [hadesFirstRunId, outerWildsRunId, celesteRunId]
			});
		assert.equal(response.status, 200);

		assert.deepEqual(await queuedBacklogIds(), [
			hadesFirstRunId,
			outerWildsRunId,
			celesteRunId
		]);
	});

	void it("rejects a reorder with an unknown entry and keeps the order", async () => {
		const stranger = await createUserWithSession();
		const foreign = await api()
			.post(BACKLOG_PATH)
			.set("Authorization", stranger.authorization)
			.send({
				gameId: hades.id,
				platformId: platform.id,
				score: 4,
				duration: 10
			})
			.expect(201);

		const response = await api()
			.put(QUEUE_PATH)
			.set("Authorization", owner.authorization)
			.send({
				backlogIds: [foreign.body.data.backlog.id, hadesFirstRunId]
			});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "QUEUE_BACKLOGS_NOT_FOUND");
		assert.deepEqual(await queuedBacklogIds(), [
			hadesFirstRunId,
			outerWildsRunId,
			celesteRunId
		]);
	});

	void it("starts the first game of the queue and it leaves the queue", async () => {
		const response = await patchBacklog(hadesFirstRunId, {
			status: "playing",
			startedAt: "2026-03-01"
		});
		assert.equal(response.status, 200);
		assert.equal(response.body.data.backlog.status, "playing");
		assert.equal(response.body.data.queueRemoved, true);

		assert.deepEqual(await queuedBacklogIds(), [
			outerWildsRunId,
			celesteRunId
		]);
		const { backlog } = await getBacklog({ status: "playing" });
		assert.deepEqual(
			backlog.map(entry => entry.id),
			[hadesFirstRunId]
		);
	});

	void it("rejects queuing the game being played and keeps the queue", async () => {
		const response = await queueFromBacklog(hadesFirstRunId);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "QUEUE_BACKLOG_NOT_STARTED");
		assert.deepEqual(await queuedBacklogIds(), [
			outerWildsRunId,
			celesteRunId
		]);
	});

	void it("completes it with rating, real duration and notes", async () => {
		const response = await patchBacklog(hadesFirstRunId, {
			status: "completed",
			finishedAt: "2026-03-20",
			realDuration: 15,
			userRating: 4.5,
			notes: "Escaped on the 12th run"
		});
		assert.equal(response.status, 200);
		assert.equal(response.body.data.queueRemoved, false);

		const { backlog } = await getBacklog({ status: "completed" });
		assert.equal(backlog.length, 1);
		const entry = backlog[0]!;
		assert.equal(entry.id, hadesFirstRunId);
		assert.equal(entry.realDuration, 15);
		assert.equal(entry.userRating, 4.5);
		assert.equal(entry.notes, "Escaped on the 12th run");
		assert.equal(entry.ratio, 4.5);
		assert.equal(entry.personalRatio, 6);
	});

	void it("shows the ratio ranking and the stats of the library", async () => {
		const ranked = await getBacklog({
			sort_by: "ratio",
			sort_order: "desc"
		});
		assert.equal(ranked.backlog[0]!.id, hadesFirstRunId);

		const profile = await getOwnProfile();
		assert.equal(profile.backlogTotal, 3);
		assert.deepEqual(profile.backlogStats, {
			not_started: 2,
			playing: 0,
			completed: 1,
			abandoned: 0,
			endless: 0,
			total: 3
		});

		const filter = await api()
			.post("/users/me/saved-filters")
			.set("Authorization", owner.authorization)
			.send({ name: "Completed", filters: { status: "completed" } })
			.expect(201);
		const stats = await api()
			.get(
				`/users/me/saved-filters/${filter.body.data.savedFilter.id}/stats`
			)
			.set("Authorization", owner.authorization)
			.expect(200);
		assert.equal(stats.body.data.stats.totalEntries, 1);
		assert.equal(stats.body.data.stats.countByStatus.completed, 1);
		assert.equal(stats.body.data.stats.totalRealHours, 15);
		assert.equal(stats.body.data.stats.avgUserRating, 4.5);
		assert.equal(stats.body.data.stats.completionRate, 1);
	});

	void it("edits the completed entry and recomputes its ratios", async () => {
		const response = await patchBacklog(hadesFirstRunId, {
			score: 5,
			notes: null
		});
		assert.equal(response.status, 200);

		const { backlog } = await getBacklog({ status: "completed" });
		const entry = backlog[0]!;
		assert.equal(entry.status, "completed");
		assert.equal(entry.score, 5);
		assert.equal(entry.notes, null);
		assert.equal(entry.ratio, 5);
		assert.equal(entry.personalRatio, 6.67);
	});

	void it("rejects an invalid edit and keeps the entry unchanged", async () => {
		const response = await patchBacklog(hadesFirstRunId, {
			userRating: 4.2
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		const { backlog } = await getBacklog({ status: "completed" });
		assert.equal(backlog[0]!.userRating, 4.5);
	});

	void it("starts a second playthrough of the same game as a new entry", async () => {
		const response = await api()
			.post(BACKLOG_PATH)
			.set("Authorization", owner.authorization)
			.send({
				gameId: hades.id,
				platformId: platform.id,
				score: 5,
				duration: 20
			});
		assert.equal(response.status, 201);
		hadesSecondRunId = response.body.data.backlog.id;
		assert.notEqual(hadesSecondRunId, hadesFirstRunId);

		const runs = await getBacklog({ game_id: hades.id });
		assert.deepEqual(
			new Set(runs.backlog.map(entry => entry.id)),
			new Set([hadesFirstRunId, hadesSecondRunId])
		);
		assert.equal((await getOwnProfile()).backlogStats.total, 4);
	});

	void it("queues the second playthrough at the end of the queue", async () => {
		const response = await queueFromBacklog(hadesSecondRunId);
		assert.equal(response.status, 201);

		const { queue } = await getQueue();
		assert.deepEqual(
			queue.map(entry => entry.backlog.id),
			[outerWildsRunId, celesteRunId, hadesSecondRunId]
		);
		assert.deepEqual(
			queue.map(entry => entry.position),
			[1, 2, 3]
		);
	});

	void it("deletes the first playthrough keeping the shelf, the second run and the queue", async () => {
		const response = await api()
			.delete(`${BACKLOG_PATH}/${hadesFirstRunId}`)
			.set("Authorization", owner.authorization);
		assert.equal(response.status, 204);

		const runs = await getBacklog({ game_id: hades.id });
		assert.deepEqual(
			runs.backlog.map(entry => entry.id),
			[hadesSecondRunId]
		);

		const shelf = await getShelf();
		assert.equal(shelf.total, 1);
		assert.equal(shelf.gameShelf[0]!.id, hadesShelfId);
		assert.equal(shelf.gameShelf[0]!.inBacklog, true);

		const queued = new Set(await queuedBacklogIds());
		assert.deepEqual(
			queued,
			new Set([outerWildsRunId, celesteRunId, hadesSecondRunId])
		);

		const profile = await getOwnProfile();
		assert.equal(profile.backlogStats.total, 3);
		assert.equal(profile.backlogStats.completed, 0);
	});

	void it("deletes the queued second playthrough and it leaves the queue", async () => {
		await api()
			.delete(`${BACKLOG_PATH}/${hadesSecondRunId}`)
			.set("Authorization", owner.authorization)
			.expect(204);

		assert.deepEqual(await queuedBacklogIds(), [
			outerWildsRunId,
			celesteRunId
		]);
		const shelf = await getShelf();
		assert.equal(shelf.total, 1);
		assert.equal(shelf.gameShelf[0]!.inBacklog, false);
	});
});
