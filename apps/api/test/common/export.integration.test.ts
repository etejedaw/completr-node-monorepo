import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { BACKLOG_EXPORT_COLUMNS } from "../../src/backlog/backlog.export-row.mapper";
import { environmentConfig } from "../../src/common/config/environment.config";
import { Favorite } from "../../src/favorites/favorite.model";
import { FAVORITES_EXPORT_COLUMNS } from "../../src/favorites/favorites.export-row.mapper";
import { PLATINUMS_EXPORT_COLUMNS } from "../../src/game-platinum/game-platinum.export-row.mapper";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { GAME_SHELF_EXPORT_COLUMNS } from "../../src/game-shelf/game-shelf.export-row.mapper";
import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { ListItem } from "../../src/list-items/list-item.model";
import { LIST_EXPORT_COLUMNS } from "../../src/lists/lists.export-row.mapper";
import { QUEUE_EXPORT_COLUMNS } from "../../src/queue/queue.export-row.mapper";
import { Queue } from "../../src/queue/queue.model";
import { WISHLIST_EXPORT_COLUMNS } from "../../src/wishlist/wishlist.export-row.mapper";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createList,
	createPlatform,
	createScoreSource,
	createWishlistEntries
} from "../helpers/factories.helper";

const BOM = "﻿";
const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

useTestDatabase();

const ME_EXPORTS = [
	{ resource: "backlog", columns: BACKLOG_EXPORT_COLUMNS },
	{ resource: "queue", columns: QUEUE_EXPORT_COLUMNS },
	{ resource: "game-shelf", columns: GAME_SHELF_EXPORT_COLUMNS },
	{ resource: "wishlist", columns: WISHLIST_EXPORT_COLUMNS },
	{ resource: "favorites", columns: FAVORITES_EXPORT_COLUMNS },
	{ resource: "platinums", columns: PLATINUMS_EXPORT_COLUMNS }
] as const;

function todayInUtc() {
	return new Date().toISOString().slice(0, 10);
}

function exportRequest(path: string, authorization?: string, format?: string) {
	const request = api().get(path);
	if (authorization) request.set("Authorization", authorization);
	if (format) request.query({ format });
	return request;
}

function csvLines(text: string) {
	assert.ok(text.startsWith(BOM), "csv body must start with a BOM");
	assert.ok(text.endsWith("\r\n"), "csv body must end with CRLF");
	return text.slice(BOM.length, -2).split("\r\n");
}

function headerLine(columns: readonly string[]) {
	return columns.join(",");
}

async function createOwnedGame(userId: string) {
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	const backlog = await createBacklog(userId, game.id, platform.id);
	return { game, platform, backlog };
}

void describe("GET collection exports", () => {
	for (const { resource, columns } of ME_EXPORTS) {
		const path = `/users/me/${resource}/export`;

		void describe(`GET ${path}`, () => {
			void it("responds 401 AUTH_INVALID_TOKEN with an invalid token", async () => {
				const response = await exportRequest(
					path,
					"Bearer not-a-token"
				);
				assert.equal(response.status, 401);
				assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
			});

			void it("responds 422 AUTH_SCHEMA_INVALID without the Authorization header", async () => {
				const response = await exportRequest(path);
				assert.equal(response.status, 422);
				assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
			});

			void it("exports an empty collection as a CSV with only the header", async () => {
				const { authorization } = await createUserWithSession();

				const response = await exportRequest(path, authorization);

				assert.equal(response.status, 200);
				assert.equal(
					response.headers["content-type"],
					CSV_CONTENT_TYPE
				);
				assert.equal(
					response.headers["content-disposition"],
					`attachment; filename="completr-${resource}-${todayInUtc()}.csv"`
				);
				assert.deepEqual(csvLines(response.text), [
					headerLine(columns)
				]);
			});

			void it("exports an empty collection as [] in JSON for premium", async () => {
				const { authorization } =
					await createUserWithSession("premium");

				const response = await exportRequest(
					path,
					authorization,
					"json"
				);

				assert.equal(response.status, 200);
				assert.equal(
					response.headers["content-type"],
					JSON_CONTENT_TYPE
				);
				assert.equal(
					response.headers["content-disposition"],
					`attachment; filename="completr-${resource}-${todayInUtc()}.json"`
				);
				assert.deepEqual(response.body, []);
			});

			void it("responds 402 EXPORT_FORMAT_PREMIUM when a free user asks for JSON", async () => {
				const { authorization } = await createUserWithSession();

				const response = await exportRequest(
					path,
					authorization,
					"json"
				);

				assert.equal(response.status, 402);
				assert.equal(response.body.type, "EXPORT_FORMAT_PREMIUM");
			});

			void it("rejects an unknown format with the schema validation error", async () => {
				const { authorization } =
					await createUserWithSession("premium");

				const response = await exportRequest(
					path,
					authorization,
					"xlsx"
				);

				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			});
		});
	}

	void it("exposes Content-Disposition to the browser through CORS", async () => {
		const { authorization } = await createUserWithSession();
		const [origin] = environmentConfig.CORS_ORIGIN.split(",");

		const response = await exportRequest(
			"/users/me/backlog/export",
			authorization
		).set("Origin", origin === "*" ? "http://localhost:4200" : origin!);

		assert.equal(response.status, 200);
		assert.match(
			String(response.headers["access-control-expose-headers"]),
			/Content-Disposition/
		);
	});
});

void describe("GET /users/me/backlog/export", () => {
	void it("exports every entry of the user, newest first, without other users' data", async () => {
		const owner = await createUserWithSession("premium");
		const stranger = await createUserWithSession();
		const older = await createOwnedGame(owner.user.id);
		await older.backlog.update({
			status: "completed",
			startedAt: "2026-01-02",
			finishedAt: "2026-02-03",
			realDuration: 8,
			userRating: 4.5,
			notes: '=HYPERLINK("x"), great'
		});
		const newer = await createOwnedGame(owner.user.id);
		const olderAddedAt = older.backlog.createdAt.toISOString();
		await createOwnedGame(stranger.user.id);

		const json = await exportRequest(
			"/users/me/backlog/export",
			owner.authorization,
			"json"
		);

		assert.equal(json.status, 200);
		assert.equal(json.body.length, 2);
		assert.deepEqual(Object.keys(json.body[0]), [
			...BACKLOG_EXPORT_COLUMNS
		]);
		assert.equal(json.body[0].gameTitle, newer.game.title);
		assert.deepEqual(json.body[1], {
			gameTitle: older.game.title,
			gameCode: older.game.code,
			platform: older.platform.name,
			status: "completed",
			score: 4,
			duration: 10,
			ratio: 8,
			realDuration: 8,
			personalRatio: 10,
			userRating: 4.5,
			startedAt: "2026-01-02",
			finishedAt: "2026-02-03",
			notes: '=HYPERLINK("x"), great',
			isPublic: true,
			compilationTitle: null,
			addedAt: olderAddedAt
		});

		const csv = await exportRequest(
			"/users/me/backlog/export",
			owner.authorization
		);
		const lines = csvLines(csv.text);
		assert.equal(lines.length, 3);
		assert.equal(
			lines[2],
			[
				older.game.title,
				older.game.code,
				older.platform.name,
				"completed",
				"4",
				"10",
				"8",
				"8",
				"10",
				"4.5",
				"2026-01-02",
				"2026-02-03",
				'"\'=HYPERLINK(""x""), great"',
				"true",
				"",
				olderAddedAt
			].join(",")
		);
	});
});

void describe("GET /users/me/queue/export", () => {
	void it("exports the queue ordered by position", async () => {
		const owner = await createUserWithSession("premium");
		const first = await createOwnedGame(owner.user.id);
		const second = await createOwnedGame(owner.user.id);
		await Queue.create({
			userId: owner.user.id,
			backlogId: second.backlog.id,
			position: 2
		});
		await Queue.create({
			userId: owner.user.id,
			backlogId: first.backlog.id,
			position: 1
		});

		const response = await exportRequest(
			"/users/me/queue/export",
			owner.authorization,
			"json"
		);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.map(
				(row: { position: number; gameTitle: string }) => [
					row.position,
					row.gameTitle
				]
			),
			[
				[1, first.game.title],
				[2, second.game.title]
			]
		);
		assert.equal(response.body[0].platform, first.platform.name);
		assert.equal(response.body[0].status, "not_started");
		assert.equal(response.body[0].ratio, 8);
	});
});

void describe("GET /users/me/game-shelf/export", () => {
	void it("exports the shelf ordered by game title", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();
		const zelda = await createGame({ title: `Zelda ${randomUUID()}` });
		const astro = await createGame({ title: `Astro ${randomUUID()}` });
		await GameShelf.create({
			userId: owner.user.id,
			gameId: zelda.id,
			platformId: platform.id
		});
		await GameShelf.create({
			userId: owner.user.id,
			gameId: astro.id,
			platformId: platform.id,
			edition: "Deluxe",
			notes: "Sealed",
			acquiredAt: new Date("2025-12-24T00:00:00.000Z")
		});

		const response = await exportRequest(
			"/users/me/game-shelf/export",
			owner.authorization
		);
		const lines = csvLines(response.text);

		assert.equal(response.status, 200);
		assert.equal(lines.length, 3, response.text);
		assert.ok(
			lines[1]!.startsWith(
				`${astro.title},${astro.code},${platform.name},Deluxe,2025-12-24,Sealed,true,`
			),
			lines[1]!
		);
		assert.ok(lines[2]!.startsWith(`${zelda.title},`));
	});
});

void describe("GET /users/me/wishlist/export", () => {
	void it("exports the wishlist ordered by position with an optional platform", async () => {
		const owner = await createUserWithSession("premium");
		const [first, second] = await Promise.all([createGame(), createGame()]);
		await createWishlistEntries(owner.user.id, [first.id, second.id]);

		const response = await exportRequest(
			"/users/me/wishlist/export",
			owner.authorization,
			"json"
		);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.map(
				(row: {
					position: number;
					gameTitle: string;
					platform: null;
				}) => [row.position, row.gameTitle, row.platform]
			),
			[
				[1, first.title, null],
				[2, second.title, null]
			]
		);
	});
});

void describe("GET /users/me/favorites/export", () => {
	void it("exports the favorites ordered by position", async () => {
		const owner = await createUserWithSession("premium");
		const [first, second] = await Promise.all([createGame(), createGame()]);
		await Favorite.bulkCreate([
			{ userId: owner.user.id, gameId: second.id, position: 2 },
			{ userId: owner.user.id, gameId: first.id, position: 1 }
		]);

		const response = await exportRequest(
			"/users/me/favorites/export",
			owner.authorization,
			"json"
		);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.map((row: { gameCode: string }) => row.gameCode),
			[first.code, second.code]
		);
	});
});

void describe("GET /users/me/platinums/export", () => {
	void it("exports the platinums, latest first", async () => {
		const owner = await createUserWithSession("premium");
		const platform = await createPlatform();
		const [older, newer] = await Promise.all([createGame(), createGame()]);
		await GamePlatinum.bulkCreate([
			{
				userId: owner.user.id,
				gameId: older.id,
				platformId: platform.id,
				platinumedAt: "2025-05-01",
				notes: "Grindy"
			},
			{
				userId: owner.user.id,
				gameId: newer.id,
				platinumedAt: "2026-05-01"
			}
		]);

		const response = await exportRequest(
			"/users/me/platinums/export",
			owner.authorization,
			"json"
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body, [
			{
				gameTitle: newer.title,
				gameCode: newer.code,
				platform: null,
				platinumedAt: "2026-05-01",
				notes: null
			},
			{
				gameTitle: older.title,
				gameCode: older.code,
				platform: platform.name,
				platinumedAt: "2025-05-01",
				notes: "Grindy"
			}
		]);
	});
});

void describe("GET /lists/:listId/export", () => {
	async function createListWithItems(userId: string, name: string) {
		const source = await createScoreSource();
		const list = await createList(userId, source.code, { name });
		const [first, second] = await Promise.all([createGame(), createGame()]);
		await ListItem.bulkCreate([
			{ listId: list.id, gameId: second.id, position: 2 },
			{
				listId: list.id,
				gameId: first.id,
				position: 1,
				score: 4,
				duration: 20
			}
		]);
		return { list, first, second };
	}

	void it("responds 401 AUTH_INVALID_TOKEN with an invalid token", async () => {
		const response = await exportRequest(
			`/lists/${randomUUID()}/export`,
			"Bearer not-a-token"
		);
		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});

	void it("exports an own list as CSV named after its slug", async () => {
		const owner = await createUserWithSession();
		const { list, first, second } = await createListWithItems(
			owner.user.id,
			"Mis RPG: Favoritos"
		);

		const response = await exportRequest(
			`/lists/${list.id}/export`,
			owner.authorization
		);
		const lines = csvLines(response.text);

		assert.equal(response.status, 200);
		assert.equal(response.headers["content-type"], CSV_CONTENT_TYPE);
		assert.equal(
			response.headers["content-disposition"],
			`attachment; filename="completr-list-mis-rpg-favoritos-${todayInUtc()}.csv"`
		);
		assert.equal(lines[0], headerLine(LIST_EXPORT_COLUMNS));
		assert.ok(
			lines[1]!.startsWith(`1,${first.title},${first.code},4,20,4,`)
		);
		assert.ok(lines[2]!.startsWith(`2,${second.title},${second.code},,,,`));
	});

	void it("exports an own list as JSON for premium", async () => {
		const owner = await createUserWithSession("premium");
		const { list, first } = await createListWithItems(owner.user.id, "Top");

		const response = await exportRequest(
			`/lists/${list.id}/export`,
			owner.authorization,
			"json"
		);

		assert.equal(response.status, 200);
		assert.equal(response.headers["content-type"], JSON_CONTENT_TYPE);
		assert.equal(response.body.length, 2);
		assert.deepEqual(Object.keys(response.body[0]), [
			...LIST_EXPORT_COLUMNS
		]);
		assert.equal(response.body[0].gameTitle, first.title);
		assert.equal(response.body[0].ratio, 4);
		assert.equal(response.body[1].score, null);
	});

	void it("exports an empty own list as only the header", async () => {
		const owner = await createUserWithSession();
		const source = await createScoreSource();
		const list = await createList(owner.user.id, source.code);

		const response = await exportRequest(
			`/lists/${list.id}/export`,
			owner.authorization
		);

		assert.equal(response.status, 200);
		assert.deepEqual(csvLines(response.text), [
			headerLine(LIST_EXPORT_COLUMNS)
		]);
	});

	void it("responds 402 EXPORT_FORMAT_PREMIUM when a free user asks for JSON", async () => {
		const owner = await createUserWithSession();
		const { list } = await createListWithItems(owner.user.id, "Free");

		const response = await exportRequest(
			`/lists/${list.id}/export`,
			owner.authorization,
			"json"
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "EXPORT_FORMAT_PREMIUM");
	});

	void it("responds 404 LIST_NOT_FOUND for a public list of another user", async () => {
		const owner = await createUserWithSession();
		const viewer = await createUserWithSession("premium");
		const source = await createScoreSource();
		const list = await createList(owner.user.id, source.code, {
			isPublic: true
		});

		const response = await exportRequest(
			`/lists/${list.id}/export`,
			viewer.authorization
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});

	void it("responds 404 LIST_NOT_FOUND for a list that does not exist", async () => {
		const { authorization } = await createUserWithSession();

		const response = await exportRequest(
			`/lists/${randomUUID()}/export`,
			authorization
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});

	void it("rejects an unknown format with the schema validation error", async () => {
		const owner = await createUserWithSession();
		const source = await createScoreSource();
		const list = await createList(owner.user.id, source.code);

		const response = await exportRequest(
			`/lists/${list.id}/export`,
			owner.authorization,
			"pdf"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});
