import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { Activity } from "../../src/activity/activity.model";
import { Backlog } from "../../src/backlog/backlog.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { Game } from "../../src/games/game.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { bearer, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

useTestDatabase();

interface PlatinumBody {
	id: string;
	backlogId: string | null;
	platformId: string | null;
	platinumedAt: string | null;
	notes?: string | null;
}

interface BacklogRunBody {
	id: string;
	game: { id: string };
	platinum?: PlatinumBody | null;
}

function platinumPath(gameId: string) {
	return `/users/me/games/${gameId}/platinum`;
}

function putPlatinum(
	authorization: string,
	gameId: string,
	body: Record<string, unknown> = {}
) {
	return api()
		.put(platinumPath(gameId))
		.set("Authorization", authorization)
		.send(body);
}

function deletePlatinum(authorization: string, gameId: string) {
	return api()
		.delete(platinumPath(gameId))
		.set("Authorization", authorization);
}

async function getMyBacklog(authorization: string, query = "") {
	const response = await api()
		.get(`/users/me/backlog${query}`)
		.set("Authorization", authorization)
		.expect(200);
	return response.body.data.backlog as BacklogRunBody[];
}

function getUserBacklog(username: string, authorization?: string, query = "") {
	const request = api().get(`/users/${username}/backlog${query}`);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function countPlatinumActivities(userId: string) {
	return Activity.count({ where: { userId, type: "game_platinumed" } });
}

async function createOwnerWithRun() {
	const owner = await createUserWithSession();
	const game = await createGame();
	const platform = await createPlatform();
	const run = await createBacklog(owner.user.id, game.id, platform.id, {
		status: "completed"
	});
	return { owner, game, platform, run };
}

void describe("PUT /users/me/games/:gameId/platinum", () => {
	void it("creates the platinum taking the platform from the run when it is not sent", async () => {
		const { owner, game, platform, run } = await createOwnerWithRun();

		const response = await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id,
			platinumedAt: "2026-03-12",
			notes: "  All trophies  "
		});

		assert.equal(response.status, 201);
		const platinum = response.body.data.platinum as PlatinumBody;
		assert.equal(platinum.backlogId, run.id);
		assert.equal(platinum.platformId, platform.id);
		assert.equal(platinum.platinumedAt, "2026-03-12");
		assert.equal(platinum.notes, "All trophies");
		assert.equal(
			await GamePlatinum.count({
				where: { userId: owner.user.id, gameId: game.id }
			}),
			1
		);
	});

	void it("creates a platinum without run, platform, date or notes", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();

		const response = await putPlatinum(owner.authorization, game.id);

		assert.equal(response.status, 201);
		assert.deepEqual(
			{ ...response.body.data.platinum, id: undefined },
			{
				id: undefined,
				backlogId: null,
				platformId: null,
				platinumedAt: null,
				notes: null
			}
		);
	});

	void it("keeps an explicit platform over the platform of the run", async () => {
		const { owner, game, run } = await createOwnerWithRun();
		const otherPlatform = await createPlatform();

		const response = await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id,
			platformId: otherPlatform.id
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.platinum.platformId, otherPlatform.id);
	});

	void it("updates the existing platinum replacing every field and answers 200", async () => {
		const { owner, game, run } = await createOwnerWithRun();
		const created = await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id,
			platinumedAt: "2026-03-12",
			notes: "first"
		});

		const response = await putPlatinum(owner.authorization, game.id, {
			platinumedAt: "2026-04-01"
		});

		assert.equal(response.status, 200);
		const platinum = response.body.data.platinum as PlatinumBody;
		assert.equal(platinum.id, created.body.data.platinum.id);
		assert.equal(platinum.backlogId, null);
		assert.equal(platinum.platformId, null);
		assert.equal(platinum.platinumedAt, "2026-04-01");
		assert.equal(platinum.notes, null);
	});

	void it("is idempotent: the same body twice leaves a single equal platinum", async () => {
		const { owner, game, run } = await createOwnerWithRun();
		const body = { backlogId: run.id, platinumedAt: "2026-03-12" };

		const first = await putPlatinum(owner.authorization, game.id, body);
		const second = await putPlatinum(owner.authorization, game.id, body);

		assert.equal(first.status, 201);
		assert.equal(second.status, 200);
		assert.deepEqual(second.body.data.platinum, first.body.data.platinum);
		assert.equal(
			await GamePlatinum.count({
				where: { userId: owner.user.id, gameId: game.id }
			}),
			1
		);
	});

	void it("records game_platinumed only when the platinum is created", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();

		await putPlatinum(owner.authorization, game.id).expect(201);
		await eventually(async () =>
			assert.equal(await countPlatinumActivities(owner.user.id), 1)
		);

		await putPlatinum(owner.authorization, game.id, {
			notes: "edited"
		}).expect(200);
		await delay(150);

		assert.equal(await countPlatinumActivities(owner.user.id), 1);
	});

	void it("answers 404 GAME_PLATINUM_BACKLOG_NOT_FOUND for a run of another user", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const game = await createGame();
		const platform = await createPlatform();
		const foreignRun = await createBacklog(
			stranger.id,
			game.id,
			platform.id
		);

		const response = await putPlatinum(owner.authorization, game.id, {
			backlogId: foreignRun.id
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_PLATINUM_BACKLOG_NOT_FOUND");
		assert.equal(
			await GamePlatinum.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("answers 404 GAME_PLATINUM_BACKLOG_NOT_FOUND for a run that does not exist", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();

		const response = await putPlatinum(owner.authorization, game.id, {
			backlogId: randomUUID()
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_PLATINUM_BACKLOG_NOT_FOUND");
	});

	void it("answers 422 GAME_PLATINUM_BACKLOG_GAME_MISMATCH for an own run of another game", async () => {
		const { owner, run } = await createOwnerWithRun();
		const otherGame = await createGame();

		const response = await putPlatinum(owner.authorization, otherGame.id, {
			backlogId: run.id
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_PLATINUM_BACKLOG_GAME_MISMATCH");
	});

	void it("answers 404 GAME_PLATINUM_GAME_NOT_FOUND for a game that does not exist", async () => {
		const owner = await createUserWithSession();

		const response = await putPlatinum(owner.authorization, randomUUID());

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_PLATINUM_GAME_NOT_FOUND");
	});

	void it("answers 422 GAME_PLATINUM_PLATFORM_NOT_FOUND for a platform that does not exist", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();

		const response = await putPlatinum(owner.authorization, game.id, {
			platformId: randomUUID()
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_PLATINUM_PLATFORM_NOT_FOUND");
	});

	void it("answers 422 COMMON_SCHEMA_INVALID for notes over 500 characters, a bad date or unknown fields", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();

		for (const body of [
			{ notes: "x".repeat(501) },
			{ platinumedAt: "12/03/2026" },
			{ status: "completed" }
		]) {
			const response = await putPlatinum(
				owner.authorization,
				game.id,
				body
			);
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("answers 422 AUTH_SCHEMA_INVALID without a token", async () => {
		const game = await createGame();

		const response = await api().put(platinumPath(game.id)).send({});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});
});

void describe("DELETE /users/me/games/:gameId/platinum", () => {
	void it("removes the platinum and answers 404 GAME_PLATINUM_NOT_FOUND when there is none", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		await putPlatinum(owner.authorization, game.id).expect(201);

		await deletePlatinum(owner.authorization, game.id).expect(204);
		const again = await deletePlatinum(owner.authorization, game.id);

		assert.equal(again.status, 404);
		assert.equal(again.body.type, "GAME_PLATINUM_NOT_FOUND");
		assert.equal(
			await GamePlatinum.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("does not touch the platinum of another user", async () => {
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		const game = await createGame();
		await putPlatinum(other.authorization, game.id).expect(201);

		const response = await deletePlatinum(owner.authorization, game.id);

		assert.equal(response.status, 404);
		assert.equal(
			await GamePlatinum.count({ where: { userId: other.user.id } }),
			1
		);
	});
});

void describe("GET /users/me/platinums", () => {
	void it("lists only the platinums of the session user, latest first, with notes", async () => {
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		const older = await createGame({ title: "Older Platinum" });
		const newer = await createGame({ title: "Newer Platinum" });
		const foreign = await createGame();
		await putPlatinum(owner.authorization, older.id, {
			platinumedAt: "2025-01-10",
			notes: "First"
		}).expect(201);
		await putPlatinum(owner.authorization, newer.id, {
			platinumedAt: "2026-02-20"
		}).expect(201);
		await putPlatinum(other.authorization, foreign.id).expect(201);

		const response = await api()
			.get("/users/me/platinums")
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		const { platinums, total } = response.body.data as {
			platinums: (PlatinumBody & { game: { id: string } })[];
			total: number;
		};
		assert.equal(total, 2);
		assert.deepEqual(
			platinums.map(platinum => platinum.game.id),
			[newer.id, older.id]
		);
		assert.equal(platinums.at(1)?.notes, "First");
	});

	void it("filters by game title with search and paginates keeping the total", async () => {
		const owner = await createUserWithSession();
		for (const title of ["Astro Bot", "Astro's Playroom", "Bloodborne"]) {
			const game = await createGame({ title });
			await putPlatinum(owner.authorization, game.id).expect(201);
		}

		const response = await api()
			.get("/users/me/platinums?search=astro&limit=1")
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
		assert.equal(response.body.data.platinums.length, 1);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/users/me/platinums")
			.set("Authorization", bearer("invalid"));

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GamePlatinums foreign keys", () => {
	void it("keeps the platinum with a null run when the run is deleted", async () => {
		const { owner, game, platform, run } = await createOwnerWithRun();
		await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id
		}).expect(201);

		await api()
			.delete(`/users/me/backlog/${run.id}`)
			.set("Authorization", owner.authorization)
			.expect(204);

		const platinum = await GamePlatinum.findOne({
			where: { userId: owner.user.id, gameId: game.id }
		});
		assert.ok(platinum);
		assert.equal(platinum.backlogId, null);
		assert.equal(platinum.platformId, platform.id);
	});

	void it("deletes the platinum when the user is deleted", async () => {
		const user = await createUser();
		const game = await createGame();
		await GamePlatinum.create({ userId: user.id, gameId: game.id });

		await User.destroy({ where: { id: user.id } });

		assert.equal(
			await GamePlatinum.count({ where: { userId: user.id } }),
			0
		);
	});

	void it("deletes the platinum when the game is deleted", async () => {
		const user = await createUser();
		const game = await createGame();
		await GamePlatinum.create({ userId: user.id, gameId: game.id });

		await Game.destroy({ where: { id: game.id } });

		assert.equal(
			await GamePlatinum.count({ where: { gameId: game.id } }),
			0
		);
	});

	void it("answers 409 GAME_IN_USE and keeps the game when hard deleting a game with a platinum", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const game = await createGame();
		await GamePlatinum.create({ userId: user.id, gameId: game.id });

		const response = await api()
			.delete(`/games/${game.id}?hard=true`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_IN_USE");
		assert.equal(await Game.count({ where: { id: game.id } }), 1);
	});
});

void describe("platinum in the backlog", () => {
	void it("adds the same platinum to every run of the game and null to games without one", async () => {
		const { owner, game, platform, run } = await createOwnerWithRun();
		const secondRun = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);
		const plainGame = await createGame();
		const plainRun = await createBacklog(
			owner.user.id,
			plainGame.id,
			platform.id
		);
		await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id,
			notes: "mine"
		}).expect(201);

		const backlog = await getMyBacklog(owner.authorization);

		const byId = new Map(backlog.map(entry => [entry.id, entry]));
		const platinum = byId.get(run.id)?.platinum;
		assert.ok(platinum);
		assert.equal(platinum.backlogId, run.id);
		assert.equal(platinum.notes, "mine");
		assert.deepEqual(byId.get(secondRun.id)?.platinum, platinum);
		assert.equal(byId.get(plainRun.id)?.platinum, null);
	});

	void it("filters the own backlog to platinumed games with platinumed_only", async () => {
		const { owner, game, platform } = await createOwnerWithRun();
		const plainGame = await createGame();
		await createBacklog(owner.user.id, plainGame.id, platform.id);
		await putPlatinum(owner.authorization, game.id).expect(201);

		const platinumed = await getMyBacklog(
			owner.authorization,
			"?platinumed_only=true"
		);
		const all = await getMyBacklog(
			owner.authorization,
			"?platinumed_only=false"
		);

		assert.deepEqual(
			platinumed.map(entry => entry.game.id),
			[game.id]
		);
		assert.equal(all.length, 2);
	});

	void it("answers 422 COMMON_SCHEMA_INVALID for a platinumed_only that is not a boolean", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.get("/users/me/backlog?platinumed_only=maybe")
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("shows the platinum without notes in the public backlog and hides the id of a private run", async () => {
		const { owner, game, platform, run } = await createOwnerWithRun();
		const publicRun = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);
		await Backlog.update({ isPublic: false }, { where: { id: run.id } });
		await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id,
			notes: "secret"
		}).expect(201);
		const viewer = await createUserWithSession();

		const response = await getUserBacklog(
			owner.user.username,
			viewer.authorization
		);

		assert.equal(response.status, 200);
		const entries = response.body.data.backlog as BacklogRunBody[];
		assert.deepEqual(
			entries.map(entry => entry.id),
			[publicRun.id]
		);
		const platinum = entries[0]!.platinum;
		assert.ok(platinum);
		assert.equal(platinum.backlogId, null);
		assert.equal(platinum.platformId, platform.id);
		assert.equal("notes" in platinum, false);
	});

	void it("shows the public run id and filters the public backlog with platinumed_only", async () => {
		const { owner, game, platform, run } = await createOwnerWithRun();
		const plainGame = await createGame();
		await createBacklog(owner.user.id, plainGame.id, platform.id);
		await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id
		}).expect(201);

		const response = await getUserBacklog(
			owner.user.username,
			undefined,
			"?platinumed_only=true"
		);

		assert.equal(response.status, 200);
		const entries = response.body.data.backlog as BacklogRunBody[];
		assert.deepEqual(
			entries.map(entry => entry.id),
			[run.id]
		);
		assert.equal(entries[0]!.platinum?.backlogId, run.id);
	});

	void it("shows the notes to the owner in their public backlog", async () => {
		const { owner, game, run } = await createOwnerWithRun();
		await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id,
			notes: "mine"
		}).expect(201);

		const response = await getUserBacklog(
			owner.user.username,
			owner.authorization
		);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.backlog[0].platinum.notes, "mine");
	});

	void it("does not serve the platinum when the backlog of the owner is private", async () => {
		const { owner, game } = await createOwnerWithRun();
		await putPlatinum(owner.authorization, game.id).expect(201);
		await owner.user.update({ backlogVisibility: "private" });
		const viewer = await createUserWithSession();

		const response = await getUserBacklog(
			owner.user.username,
			viewer.authorization
		);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});
});

void describe("platinum in the game detail", () => {
	void it("exposes userPlatinum to the owner and null to other users", async () => {
		const { owner, game, run } = await createOwnerWithRun();
		await putPlatinum(owner.authorization, game.id, {
			backlogId: run.id,
			platinumedAt: "2026-03-12"
		}).expect(201);
		const other = await createUserWithSession();

		const own = await api()
			.get(`/games/${game.code}`)
			.set("Authorization", owner.authorization)
			.expect(200);
		const foreign = await api()
			.get(`/games/${game.code}`)
			.set("Authorization", other.authorization)
			.expect(200);

		assert.equal(own.body.data.game.userPlatinum.backlogId, run.id);
		assert.equal(
			own.body.data.game.userPlatinum.platinumedAt,
			"2026-03-12"
		);
		assert.equal(foreign.body.data.game.userPlatinum, null);
	});
});

void describe("saved filters with platinumed_only", () => {
	void it("accepts platinumed_only in the filters of a saved view", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.post("/users/me/saved-filters")
			.set("Authorization", owner.authorization)
			.send({ name: "Platinums", filters: { platinumed_only: "true" } });

		assert.equal(response.status, 201);
	});
});
