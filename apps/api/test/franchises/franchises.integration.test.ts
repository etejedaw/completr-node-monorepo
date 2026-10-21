import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Game } from "../../src/games/game.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createFranchise,
	createFranchiseGame,
	createPlatform
} from "../helpers/factories.helper";

useTestDatabase();

function trackPath(code: string) {
	return `/franchises/${code}/track`;
}

void describe("GET /franchises", () => {
	void it("lists franchises by name with the total and searches them", async () => {
		const viewer = await createUserWithSession();
		const zelda = await createFranchise({ name: `Zelda ${randomUUID()}` });
		await createFranchise({ name: `Metroid ${randomUUID()}` });

		const all = await api()
			.get("/franchises")
			.set("Authorization", viewer.authorization);
		assert.equal(all.status, 200);
		assert.ok(all.body.data.total >= 2);

		const searched = await api()
			.get("/franchises")
			.query({ search: zelda.name.slice(0, 12) })
			.set("Authorization", viewer.authorization);
		assert.equal(searched.status, 200);
		assert.deepEqual(
			searched.body.data.franchises.map(
				(franchise: { id: string }) => franchise.id
			),
			[zelda.id]
		);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/franchises")
			.set("Authorization", "Bearer invalid");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /franchises/:code", () => {
	void it("serves the franchise with its games without authentication", async () => {
		const franchise = await createFranchise();
		const games = await Promise.all([
			createFranchiseGame(franchise.id),
			createFranchiseGame(franchise.id)
		]);

		const response = await api().get(`/franchises/${franchise.code}`);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.franchise.id, franchise.id);
		assert.deepEqual(
			new Set(
				response.body.data.games.map((game: { id: string }) => game.id)
			),
			new Set(games.map(game => game.id))
		);
		assert.deepEqual(response.body.data.progress, {
			completed: 0,
			total: 2
		});
		assert.equal(response.body.data.isTracked, false);
	});

	void it("reports the viewer's progress and backlog status per game", async () => {
		const viewer = await createUserWithSession();
		const franchise = await createFranchise();
		const [completed, playing] = await Promise.all([
			createFranchiseGame(franchise.id),
			createFranchiseGame(franchise.id),
			createFranchiseGame(franchise.id)
		]);
		const platform = await createPlatform();
		await createBacklog(viewer.user.id, completed!.id, platform.id, {
			status: "completed"
		});
		await createBacklog(viewer.user.id, playing!.id, platform.id, {
			status: "playing"
		});

		const response = await api()
			.get(`/franchises/${franchise.code}`)
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.progress, {
			completed: 1,
			total: 3
		});
		const statusByGame = new Map(
			response.body.data.games.map(
				(game: { id: string; backlogStatus: string | null }) => [
					game.id,
					game.backlogStatus
				]
			)
		);
		assert.equal(statusByGame.get(completed!.id), "completed");
		assert.equal(statusByGame.get(playing!.id), "playing");
	});

	void it("answers 404 FRANCHISE_NOT_FOUND for an unknown code", async () => {
		const response = await api().get("/franchises/does-not-exist");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "FRANCHISE_NOT_FOUND");
	});
});

void describe("POST and DELETE /franchises/:code/track", () => {
	void it("tracks and untracks a franchise", async () => {
		const viewer = await createUserWithSession();
		const franchise = await createFranchise();

		await api()
			.post(trackPath(franchise.code))
			.set("Authorization", viewer.authorization)
			.expect(204);
		await api()
			.post(trackPath(franchise.code))
			.set("Authorization", viewer.authorization)
			.expect(204);
		const tracked = await api()
			.get(`/franchises/${franchise.code}`)
			.set("Authorization", viewer.authorization);
		assert.equal(tracked.body.data.isTracked, true);

		await api()
			.delete(trackPath(franchise.code))
			.set("Authorization", viewer.authorization)
			.expect(204);
		const untracked = await api()
			.get(`/franchises/${franchise.code}`)
			.set("Authorization", viewer.authorization);
		assert.equal(untracked.body.data.isTracked, false);
	});

	void it("answers 404 FRANCHISE_NOT_FOUND when tracking an unknown franchise", async () => {
		const viewer = await createUserWithSession();

		const response = await api()
			.post(trackPath("does-not-exist"))
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "FRANCHISE_NOT_FOUND");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const franchise = await createFranchise();

		const response = await api()
			.post(trackPath(franchise.code))
			.set("Authorization", "Bearer invalid");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("franchise management", () => {
	void it("lets a moderator create a franchise with a slug code", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await api()
			.post("/franchises")
			.set("Authorization", moderator.authorization)
			.send({ name: "The Legend of Zelda", description: "Hyrule" });

		assert.equal(response.status, 201);
		assert.equal(response.body.data.franchise.code, "the-legend-of-zelda");
		await api().get("/franchises/the-legend-of-zelda").expect(200);
	});

	void it("rejects a duplicated name with 409 FRANCHISE_UNIQUE_CONSTRAINT", async () => {
		const moderator = await createUserWithSession("moderator");
		const existing = await createFranchise();

		const response = await api()
			.post("/franchises")
			.set("Authorization", moderator.authorization)
			.send({ name: existing.name });

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "FRANCHISE_UNIQUE_CONSTRAINT");
	});

	void it("rejects an invalid body with 422 COMMON_SCHEMA_INVALID", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await api()
			.post("/franchises")
			.set("Authorization", moderator.authorization)
			.send({ name: "" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a regular user with 403 AUTH_FORBIDDEN", async () => {
		const user = await createUserWithSession("premium");
		const franchise = await createFranchise();

		const created = await api()
			.post("/franchises")
			.set("Authorization", user.authorization)
			.send({ name: "Not allowed" });
		assert.equal(created.status, 403);
		assert.equal(created.body.type, "AUTH_FORBIDDEN");

		const deleted = await api()
			.delete(`/franchises/${franchise.id}`)
			.set("Authorization", user.authorization);
		assert.equal(deleted.status, 403);
		assert.equal(deleted.body.type, "AUTH_FORBIDDEN");
	});

	void it("renames a franchise regenerating its code", async () => {
		const moderator = await createUserWithSession("moderator");
		const franchise = await createFranchise();

		const response = await api()
			.patch(`/franchises/${franchise.id}`)
			.set("Authorization", moderator.authorization)
			.send({ name: "Metroid Prime" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.franchise.name, "Metroid Prime");
		assert.equal(response.body.data.franchise.code, "metroid-prime");
	});

	void it("answers 404 FRANCHISE_NOT_FOUND when updating or deleting an unknown franchise", async () => {
		const moderator = await createUserWithSession("moderator");

		const patched = await api()
			.patch(`/franchises/${randomUUID()}`)
			.set("Authorization", moderator.authorization)
			.send({ name: "Ghost" });
		assert.equal(patched.status, 404);
		assert.equal(patched.body.type, "FRANCHISE_NOT_FOUND");

		const deleted = await api()
			.delete(`/franchises/${randomUUID()}`)
			.set("Authorization", moderator.authorization);
		assert.equal(deleted.status, 404);
		assert.equal(deleted.body.type, "FRANCHISE_NOT_FOUND");
	});

	void it("rejects a malformed franchise id with 422 COMMON_SCHEMA_INVALID", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await api()
			.delete("/franchises/not-a-uuid")
			.set("Authorization", moderator.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("deletes a franchise detaching its games", async () => {
		const moderator = await createUserWithSession("moderator");
		const franchise = await createFranchise();
		const game = await createFranchiseGame(franchise.id);

		const response = await api()
			.delete(`/franchises/${franchise.id}`)
			.set("Authorization", moderator.authorization);

		assert.equal(response.status, 204);
		await api().get(`/franchises/${franchise.code}`).expect(404);
		const detached = await Game.findByPk(game.id);
		assert.equal(detached?.franchiseId, null);
	});
});
