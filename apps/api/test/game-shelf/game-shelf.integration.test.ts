import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { bearer, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createShelfEntries
} from "../helpers/factories.helper";

const SHELF_PATH = "/users/me/game-shelf";
const FREE_SHELF_LIMIT = 250;

useTestDatabase();

async function createGameAndPlatform(title?: string) {
	const [game, platform] = await Promise.all([
		createGame({ title }),
		createPlatform()
	]);
	return { game, platform };
}

async function addToShelf(
	authorization: string,
	body: Record<string, unknown>
) {
	return api()
		.post(SHELF_PATH)
		.set("Authorization", authorization)
		.send(body);
}

void describe("POST /users/me/game-shelf", () => {
	void it("adds a game to the shelf", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();

		const response = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id,
			acquiredAt: "2026-01-15",
			edition: "Deluxe"
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.gameShelf.userId, owner.user.id);
		assert.equal(response.body.data.gameShelf.gameId, game.id);
		assert.equal(response.body.data.gameShelf.platformId, platform.id);
		assert.equal(response.body.data.gameShelf.edition, "Deluxe");
	});

	void it("rejects an invalid body with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const { game } = await createGameAndPlatform();

		const response = await addToShelf(owner.authorization, {
			gameId: game.id,
			acquiredAt: "15/01/2026"
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		const paths = response.body.issues.map(
			(issue: { path: string }) => issue.path
		);
		assert.ok(paths.includes("platformId"));
		assert.ok(paths.includes("acquiredAt"));
	});

	void it("rejects an unknown game with 422 COMMON_REFERENCE_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();

		const response = await addToShelf(owner.authorization, {
			gameId: randomUUID(),
			platformId: platform.id
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_REFERENCE_NOT_FOUND");
	});

	void it("rejects a gameId that is not a UUID with 422", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();

		const response = await addToShelf(owner.authorization, {
			gameId: "not-a-uuid",
			platformId: platform.id
		});

		assert.equal(response.status, 422);
	});

	void it("rejects a platformId that is not a UUID with 422", async () => {
		const owner = await createUserWithSession();
		const { game } = await createGameAndPlatform();

		const response = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: "not-a-uuid"
		});

		assert.equal(response.status, 422);
	});

	void it("rejects a free user over the limit with 402 GAME_SHELF_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");
		const { game, platform } = await createGameAndPlatform();
		await createShelfEntries(
			owner.user.id,
			game.id,
			platform.id,
			FREE_SHELF_LIMIT
		);

		const response = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id
		});

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "GAME_SHELF_LIMIT_REACHED");
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");
		const { game, platform } = await createGameAndPlatform();
		await createShelfEntries(
			owner.user.id,
			game.id,
			platform.id,
			FREE_SHELF_LIMIT
		);

		const response = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id
		});

		assert.equal(response.status, 201);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const { game, platform } = await createGameAndPlatform();

		const response = await addToShelf(bearer("invalid"), {
			gameId: game.id,
			platformId: platform.id
		});

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /users/me/game-shelf", () => {
	void it("lists the shelf with game, platform and backlog flag", async () => {
		const owner = await createUserWithSession();
		const inBacklog = await createGameAndPlatform("Hollow Knight");
		const notInBacklog = await createGameAndPlatform("Celeste");
		await addToShelf(owner.authorization, {
			gameId: inBacklog.game.id,
			platformId: inBacklog.platform.id
		}).then(response => assert.equal(response.status, 201));
		await addToShelf(owner.authorization, {
			gameId: notInBacklog.game.id,
			platformId: notInBacklog.platform.id
		}).then(response => assert.equal(response.status, 201));
		await createBacklog(
			owner.user.id,
			inBacklog.game.id,
			inBacklog.platform.id
		);

		const response = await api()
			.get(SHELF_PATH)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
		const byGameId = new Map<string, { inBacklog: boolean }>(
			response.body.data.gameShelf.map(
				(entry: { game: { id: string }; inBacklog: boolean }) => [
					entry.game.id,
					entry
				]
			)
		);
		assert.equal(byGameId.get(inBacklog.game.id)?.inBacklog, true);
		assert.equal(byGameId.get(notInBacklog.game.id)?.inBacklog, false);
	});

	void it("filters by title", async () => {
		const owner = await createUserWithSession();
		const wanted = await createGameAndPlatform("Outer Wilds");
		const other = await createGameAndPlatform("Hades");
		for (const { game, platform } of [wanted, other]) {
			await addToShelf(owner.authorization, {
				gameId: game.id,
				platformId: platform.id
			});
		}

		const response = await api()
			.get(SHELF_PATH)
			.query({ search: "outer" })
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 1);
		assert.equal(response.body.data.gameShelf[0].game.id, wanted.game.id);
	});

	void it("only lists the caller's entries", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id
		});

		const response = await api()
			.get(SHELF_PATH)
			.set("Authorization", stranger.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 0);
	});
});

void describe("PATCH /users/me/game-shelf/:gameShelfId", () => {
	void it("updates and clears editable fields", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const created = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id,
			edition: "Standard"
		});
		const entryId = created.body.data.gameShelf.id;

		const response = await api()
			.patch(`${SHELF_PATH}/${entryId}`)
			.set("Authorization", owner.authorization)
			.send({ edition: null, notes: "Physical copy" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.gameShelf.id, entryId);
		assert.equal(response.body.data.gameShelf.edition, null);
		assert.equal(response.body.data.gameShelf.notes, "Physical copy");
	});

	void it("rejects editing another user's entry with 403 GAME_SHELF_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const created = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id
		});

		const response = await api()
			.patch(`${SHELF_PATH}/${created.body.data.gameShelf.id}`)
			.set("Authorization", intruder.authorization)
			.send({ notes: "Mine now" });

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "GAME_SHELF_FORBIDDEN");
	});

	void it("answers 404 GAME_SHELF_NOT_FOUND for an unknown entry", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.patch(`${SHELF_PATH}/${randomUUID()}`)
			.set("Authorization", owner.authorization)
			.send({ notes: "Ghost" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_SHELF_NOT_FOUND");
	});

	void it("rejects unknown fields with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.patch(`${SHELF_PATH}/${randomUUID()}`)
			.set("Authorization", owner.authorization)
			.send({ platformId: randomUUID() });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("DELETE /users/me/game-shelf/:gameShelfId", () => {
	void it("removes an owned entry", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const created = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id
		});
		const entryId = created.body.data.gameShelf.id;

		const response = await api()
			.delete(`${SHELF_PATH}/${entryId}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 204);
		assert.equal(await GameShelf.count({ where: { id: entryId } }), 0);
	});

	void it("does not remove another user's entry", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		const created = await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id
		});
		const entryId = created.body.data.gameShelf.id;

		const response = await api()
			.delete(`${SHELF_PATH}/${entryId}`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 204);
		assert.equal(await GameShelf.count({ where: { id: entryId } }), 1);
	});
});

void describe("GET /users/:username/game-shelf", () => {
	void it("serves a public shelf without authentication", async () => {
		const owner = await createUserWithSession();
		const { game, platform } = await createGameAndPlatform();
		await addToShelf(owner.authorization, {
			gameId: game.id,
			platformId: platform.id
		});

		const response = await api().get(
			`/users/${owner.user.username}/game-shelf`
		);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 1);
	});

	void it("rejects a private shelf with 403 USER_PRIVATE", async () => {
		const owner = await createUserWithSession();
		const viewer = await createUserWithSession();
		await User.update(
			{ shelfVisibility: "private" },
			{ where: { id: owner.user.id } }
		);

		const response = await api()
			.get(`/users/${owner.user.username}/game-shelf`)
			.set("Authorization", viewer.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});

	void it("answers 404 USER_NOT_FOUND for an unknown username", async () => {
		const response = await api().get("/users/nobody_here/game-shelf");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});
});
