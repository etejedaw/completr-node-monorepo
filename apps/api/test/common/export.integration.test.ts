import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { BACKLOG_EXPORT_COLUMNS } from "../../src/backlog/backlog.export-row.mapper";
import { Backlog } from "../../src/backlog/backlog.model";
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
import { Wishlist } from "../../src/wishlist/wishlist.model";
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
const CSV = "text/csv";
const JSON_TYPE = "application/json";
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

function exportRequest(
	path: string,
	options: {
		authorization?: string;
		accept?: string;
		query?: Record<string, string>;
	} = {}
) {
	const request = api().get(path);
	if (options.authorization)
		request.set("Authorization", options.authorization);
	if (options.accept) request.set("Accept", options.accept);
	if (options.query) request.query(options.query);
	return request;
}

function exportJson(
	path: string,
	authorization: string,
	query?: Record<string, string>
) {
	return exportRequest(path, { authorization, accept: JSON_TYPE, query });
}

function titlesOf(response: { body: { gameTitle: string }[] }) {
	return response.body.map(row => row.gameTitle);
}

function csvLines(text: string) {
	assert.ok(text.startsWith(BOM), "csv body must start with a BOM");
	assert.ok(text.endsWith("\r\n"), "csv body must end with CRLF");
	return text.slice(BOM.length, -2).split("\r\n");
}

function headerLine(columns: readonly string[]) {
	return columns.join(",");
}

function uniqueTitle(prefix: string) {
	return `${prefix} ${randomUUID().slice(0, 8)}`;
}

async function createOwnedGame(
	userId: string,
	overrides: Parameters<typeof createBacklog>[3] & { title?: string } = {}
) {
	const { title, ...backlogOverrides } = overrides;
	const [game, platform] = await Promise.all([
		createGame(title ? { title } : {}),
		createPlatform()
	]);
	const backlog = await createBacklog(
		userId,
		game.id,
		platform.id,
		backlogOverrides
	);
	return { game, platform, backlog };
}

void describe("GET collection exports", () => {
	for (const { resource, columns } of ME_EXPORTS) {
		const path = `/users/me/${resource}/export`;

		void describe(`GET ${path}`, () => {
			void it("responds 401 AUTH_INVALID_TOKEN with an invalid token", async () => {
				const response = await exportRequest(path, {
					authorization: "Bearer not-a-token"
				});
				assert.equal(response.status, 401);
				assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
			});

			void it("responds 422 AUTH_SCHEMA_INVALID without the Authorization header", async () => {
				const response = await exportRequest(path);
				assert.equal(response.status, 422);
				assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
			});

			void it("exports an empty collection as CSV with only the header when there is no Accept header", async () => {
				const { authorization } = await createUserWithSession();

				const response = await api()
					.get(path)
					.set("Authorization", authorization)
					.unset("Accept");

				assert.equal(response.status, 200);
				assert.equal(
					response.headers["content-type"],
					CSV_CONTENT_TYPE
				);
				assert.match(String(response.headers.vary), /Accept/);
				assert.equal(
					response.headers["content-disposition"],
					`attachment; filename="completr-${resource}-${todayInUtc()}.csv"`
				);
				assert.deepEqual(csvLines(response.text), [
					headerLine(columns)
				]);
			});

			void it("exports CSV for Accept text/csv", async () => {
				const { authorization } = await createUserWithSession();

				const response = await exportRequest(path, {
					authorization,
					accept: CSV
				});

				assert.equal(response.status, 200);
				assert.equal(
					response.headers["content-type"],
					CSV_CONTENT_TYPE
				);
			});

			void it("exports an empty collection as [] for Accept application/json and premium", async () => {
				const { authorization } =
					await createUserWithSession("premium");

				const response = await exportJson(path, authorization);

				assert.equal(response.status, 200);
				assert.equal(
					response.headers["content-type"],
					JSON_CONTENT_TYPE
				);
				assert.match(String(response.headers.vary), /Accept/);
				assert.equal(
					response.headers["content-disposition"],
					`attachment; filename="completr-${resource}-${todayInUtc()}.json"`
				);
				assert.deepEqual(response.body, []);
			});

			void it("responds 402 EXPORT_FORMAT_PREMIUM when a free user accepts only JSON", async () => {
				const { authorization } = await createUserWithSession();

				const response = await exportJson(path, authorization);

				assert.equal(response.status, 402);
				assert.equal(response.body.type, "EXPORT_FORMAT_PREMIUM");
			});

			void it("responds 406 EXPORT_FORMAT_NOT_ACCEPTABLE when neither CSV nor JSON is accepted", async () => {
				const { authorization } =
					await createUserWithSession("premium");

				const response = await exportRequest(path, {
					authorization,
					accept: "application/xml"
				});

				assert.equal(response.status, 406);
				assert.equal(
					response.body.type,
					"EXPORT_FORMAT_NOT_ACCEPTABLE"
				);
				assert.match(String(response.headers.vary), /Accept/);
			});
		});
	}

	void it("picks CSV for wildcards and when text/csv wins the quality ranking", async () => {
		const { authorization } = await createUserWithSession("premium");

		for (const accept of [
			"*/*",
			"text/*",
			"application/json;q=0.5, text/csv"
		]) {
			const response = await exportRequest("/users/me/backlog/export", {
				authorization,
				accept
			});
			assert.equal(
				response.headers["content-type"],
				CSV_CONTENT_TYPE,
				accept
			);
		}
	});

	void it("picks JSON when application/json wins the quality ranking", async () => {
		const { authorization } = await createUserWithSession("premium");

		const response = await exportRequest("/users/me/backlog/export", {
			authorization,
			accept: "text/csv;q=0.4, application/json"
		});

		assert.equal(response.headers["content-type"], JSON_CONTENT_TYPE);
	});

	void it("ignores a format query param", async () => {
		const { authorization } = await createUserWithSession();

		const response = await exportRequest("/users/me/backlog/export", {
			authorization,
			query: { format: "json" }
		});

		assert.equal(response.status, 200);
		assert.equal(response.headers["content-type"], CSV_CONTENT_TYPE);
	});

	void it("exposes Content-Disposition to the browser through CORS", async () => {
		const { authorization } = await createUserWithSession();
		const [origin] = environmentConfig.CORS_ORIGIN.split(",");

		const response = await exportRequest("/users/me/backlog/export", {
			authorization
		}).set("Origin", origin === "*" ? "http://localhost:4200" : origin!);

		assert.equal(response.status, 200);
		assert.match(
			String(response.headers["access-control-expose-headers"]),
			/Content-Disposition/
		);
	});
});

void describe("GET /users/me/backlog/export", () => {
	const PATH = "/users/me/backlog/export";

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
		await Backlog.update(
			{ createdAt: new Date(Date.now() - 60_000) },
			{ where: { id: older.backlog.id }, silent: true }
		);
		await older.backlog.reload();
		const newer = await createOwnedGame(owner.user.id);
		const olderAddedAt = older.backlog.createdAt.toISOString();
		await createOwnedGame(stranger.user.id);

		const json = await exportJson(PATH, owner.authorization);

		assert.equal(json.status, 200);
		assert.equal(json.body.length, 2);
		assert.deepEqual(Object.keys(json.body[0]), [
			...BACKLOG_EXPORT_COLUMNS
		]);
		assert.equal(json.body[0].gameTitle, newer.game.title);
		assert.deepEqual(json.body[1], {
			gameTitle: older.game.title,
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
			addedAt: olderAddedAt
		});

		const csv = await exportRequest(PATH, {
			authorization: owner.authorization
		});
		const lines = csvLines(csv.text);
		assert.equal(lines.length, 3);
		assert.equal(
			lines[2],
			[
				older.game.title,
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
				olderAddedAt
			].join(",")
		);
	});

	void it("applies the listing filters, search and sort, ignoring pagination", async () => {
		const owner = await createUserWithSession("premium");
		const keyword = `zq${randomUUID().slice(0, 6)}`;
		const short = await createOwnedGame(owner.user.id, {
			status: "completed",
			duration: 5,
			title: `${keyword} Short`
		});
		const long = await createOwnedGame(owner.user.id, {
			status: "completed",
			duration: 30,
			title: `${keyword} Long`
		});
		await createOwnedGame(owner.user.id, {
			status: "playing",
			title: `${keyword} Playing`
		});
		await createOwnedGame(owner.user.id, {
			status: "completed",
			title: uniqueTitle("Other")
		});

		const response = await exportJson(PATH, owner.authorization, {
			status: "completed",
			search: keyword,
			sort_by: "duration",
			sort_order: "asc",
			limit: "1",
			offset: "1"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(titlesOf(response), [
			short.game.title,
			long.game.title
		]);
	});

	void it("rejects an invalid filter with the schema validation error", async () => {
		const { authorization } = await createUserWithSession();

		const response = await exportRequest(PATH, {
			authorization,
			query: { status: "finished" }
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("GET /users/me/queue/export", () => {
	const PATH = "/users/me/queue/export";

	async function queueGames(userId: string) {
		const keyword = `qk${randomUUID().slice(0, 6)}`;
		const first = await createOwnedGame(userId, {
			score: 3,
			duration: 20,
			title: `${keyword} First`
		});
		const second = await createOwnedGame(userId, {
			score: 5,
			duration: 5,
			title: `${keyword} Second`
		});
		const third = await createOwnedGame(userId, {
			score: 4,
			duration: 40,
			title: uniqueTitle("Unrelated")
		});
		await Queue.bulkCreate([
			{ userId, backlogId: second.backlog.id, position: 2 },
			{ userId, backlogId: first.backlog.id, position: 1 },
			{ userId, backlogId: third.backlog.id, position: 3 }
		]);
		return { keyword, first, second, third };
	}

	void it("exports the queue ordered by position without params", async () => {
		const owner = await createUserWithSession("premium");
		const { first, second, third } = await queueGames(owner.user.id);

		const response = await exportJson(PATH, owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.map((row: { position: number }) => row.position),
			[1, 2, 3]
		);
		assert.deepEqual(titlesOf(response), [
			first.game.title,
			second.game.title,
			third.game.title
		]);
		assert.deepEqual(Object.keys(response.body[0]), [
			...QUEUE_EXPORT_COLUMNS
		]);
		assert.equal(response.body[0].platform, first.platform.name);
		assert.equal(response.body[0].ratio, 3);
	});

	void it("sorts like the Up Next sort control", async () => {
		const owner = await createUserWithSession("premium");
		const { first, second, third } = await queueGames(owner.user.id);

		const byRatio = await exportJson(PATH, owner.authorization, {
			sort: "ratio"
		});
		const byScore = await exportJson(PATH, owner.authorization, {
			sort: "score"
		});
		const byDuration = await exportJson(PATH, owner.authorization, {
			sort: "duration"
		});

		assert.deepEqual(titlesOf(byRatio), [
			second.game.title,
			first.game.title,
			third.game.title
		]);
		assert.deepEqual(titlesOf(byScore), [
			second.game.title,
			third.game.title,
			first.game.title
		]);
		assert.deepEqual(titlesOf(byDuration), [
			second.game.title,
			first.game.title,
			third.game.title
		]);
	});

	void it("filters by search", async () => {
		const owner = await createUserWithSession("premium");
		const { keyword, first, second } = await queueGames(owner.user.id);

		const response = await exportJson(PATH, owner.authorization, {
			search: keyword
		});

		assert.deepEqual(titlesOf(response), [
			first.game.title,
			second.game.title
		]);
	});

	void it("rejects an unknown sort", async () => {
		const { authorization } = await createUserWithSession();

		const response = await exportRequest(PATH, {
			authorization,
			query: { sort: "title" }
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("GET /users/me/game-shelf/export", () => {
	const PATH = "/users/me/game-shelf/export";

	async function shelfGames(userId: string) {
		const keyword = `sk${randomUUID().slice(0, 6)}`;
		const [platformA, platformB] = await Promise.all([
			createPlatform(),
			createPlatform()
		]);
		const zelda = await createGame({ title: `Zelda ${keyword}` });
		const astro = await createGame({ title: `Astro ${keyword}` });
		const other = await createGame({ title: uniqueTitle("Mario") });
		await GameShelf.create({
			userId,
			gameId: zelda.id,
			platformId: platformA.id
		});
		await GameShelf.create({
			userId,
			gameId: astro.id,
			platformId: platformB.id,
			edition: "Deluxe",
			notes: "Sealed",
			acquiredAt: new Date("2025-12-24T00:00:00.000Z")
		});
		await GameShelf.create({
			userId,
			gameId: other.id,
			platformId: platformA.id
		});
		return { keyword, platformA, platformB, zelda, astro, other };
	}

	void it("exports the shelf ordered by game title without params", async () => {
		const owner = await createUserWithSession();
		const { platformB, zelda, astro } = await shelfGames(owner.user.id);

		const response = await exportRequest(PATH, {
			authorization: owner.authorization
		});
		const lines = csvLines(response.text);

		assert.equal(response.status, 200);
		assert.equal(lines[0], headerLine(GAME_SHELF_EXPORT_COLUMNS));
		assert.equal(lines.length, 4);
		assert.ok(
			lines[1]!.startsWith(
				`${astro.title},${platformB.name},Deluxe,2025-12-24,Sealed,`
			),
			lines[1]!
		);
		assert.ok(lines[3]!.startsWith(`${zelda.title},`));
	});

	void it("filters by platform and search", async () => {
		const owner = await createUserWithSession("premium");
		const { keyword, platformA, zelda, other } = await shelfGames(
			owner.user.id
		);

		const byPlatform = await exportJson(PATH, owner.authorization, {
			platform: platformA.id
		});
		const bySearch = await exportJson(PATH, owner.authorization, {
			search: keyword,
			platform: platformA.id
		});
		const withoutPlatform = await exportJson(PATH, owner.authorization, {
			platform: "any"
		});

		assert.deepEqual(titlesOf(byPlatform), [other.title, zelda.title]);
		assert.deepEqual(titlesOf(bySearch), [zelda.title]);
		assert.deepEqual(withoutPlatform.body, []);
	});

	void it("rejects a platform that is neither a UUID nor any", async () => {
		const { authorization } = await createUserWithSession();

		const response = await exportRequest(PATH, {
			authorization,
			query: { platform: "ps5" }
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("GET /users/me/wishlist/export", () => {
	const PATH = "/users/me/wishlist/export";

	async function wishlistGames(userId: string) {
		const keyword = `wk${randomUUID().slice(0, 6)}`;
		const platform = await createPlatform();
		const first = await createGame({ title: `${keyword} First` });
		const second = await createGame({ title: uniqueTitle("Second") });
		const third = await createGame({ title: `${keyword} Third` });
		await createWishlistEntries(userId, [first.id, second.id]);
		await Wishlist.create({
			userId,
			gameId: third.id,
			platformId: platform.id,
			position: 3
		});
		return { keyword, platform, first, second, third };
	}

	void it("exports the wishlist ordered by position without params", async () => {
		const owner = await createUserWithSession("premium");
		const { platform, first, second, third } = await wishlistGames(
			owner.user.id
		);

		const response = await exportJson(PATH, owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.map(Object.values), [
			[1, first.title, null, response.body[0].addedAt],
			[2, second.title, null, response.body[1].addedAt],
			[3, third.title, platform.name, response.body[2].addedAt]
		]);
		assert.deepEqual(Object.keys(response.body[0]), [
			...WISHLIST_EXPORT_COLUMNS
		]);
	});

	void it("filters by platform, by entries without platform and by search", async () => {
		const owner = await createUserWithSession("premium");
		const { keyword, platform, first, second, third } = await wishlistGames(
			owner.user.id
		);

		const byPlatform = await exportJson(PATH, owner.authorization, {
			platform: platform.id
		});
		const withoutPlatform = await exportJson(PATH, owner.authorization, {
			platform: "any"
		});
		const bySearch = await exportJson(PATH, owner.authorization, {
			search: keyword
		});

		assert.deepEqual(titlesOf(byPlatform), [third.title]);
		assert.deepEqual(titlesOf(withoutPlatform), [
			first.title,
			second.title
		]);
		assert.deepEqual(titlesOf(bySearch), [first.title, third.title]);
	});
});

void describe("GET /users/me/favorites/export", () => {
	const PATH = "/users/me/favorites/export";

	async function favoriteGames(userId: string) {
		const keyword = `fk${randomUUID().slice(0, 6)}`;
		const first = await createGame({ title: `${keyword} First` });
		const second = await createGame({ title: uniqueTitle("Second") });
		await Favorite.bulkCreate([
			{ userId, gameId: second.id, position: 2 },
			{ userId, gameId: first.id, position: 1 }
		]);
		return { keyword, first, second };
	}

	void it("exports the favorites ordered by position without params", async () => {
		const owner = await createUserWithSession("premium");
		const { first, second } = await favoriteGames(owner.user.id);

		const response = await exportJson(PATH, owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(titlesOf(response), [first.title, second.title]);
		assert.deepEqual(Object.keys(response.body[0]), [
			...FAVORITES_EXPORT_COLUMNS
		]);
	});

	void it("filters by search", async () => {
		const owner = await createUserWithSession("premium");
		const { keyword, first } = await favoriteGames(owner.user.id);

		const response = await exportJson(PATH, owner.authorization, {
			search: keyword
		});

		assert.deepEqual(titlesOf(response), [first.title]);
	});
});

void describe("GET /users/me/platinums/export", () => {
	const PATH = "/users/me/platinums/export";

	async function platinumGames(userId: string) {
		const keyword = `pk${randomUUID().slice(0, 6)}`;
		const platform = await createPlatform();
		const older = await createGame({ title: `${keyword} Older` });
		const newer = await createGame({ title: uniqueTitle("Newer") });
		await GamePlatinum.bulkCreate([
			{
				userId,
				gameId: older.id,
				platformId: platform.id,
				platinumedAt: "2025-05-01",
				notes: "Grindy"
			},
			{ userId, gameId: newer.id, platinumedAt: "2026-05-01" }
		]);
		return { keyword, platform, older, newer };
	}

	void it("exports the platinums, latest first, without params", async () => {
		const owner = await createUserWithSession("premium");
		const { platform, older, newer } = await platinumGames(owner.user.id);

		const response = await exportJson(PATH, owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body, [
			{
				gameTitle: newer.title,
				platform: null,
				platinumedAt: "2026-05-01",
				notes: null
			},
			{
				gameTitle: older.title,
				platform: platform.name,
				platinumedAt: "2025-05-01",
				notes: "Grindy"
			}
		]);
	});

	void it("filters by platform, by platinums without platform and by search", async () => {
		const owner = await createUserWithSession("premium");
		const { keyword, platform, older, newer } = await platinumGames(
			owner.user.id
		);

		const byPlatform = await exportJson(PATH, owner.authorization, {
			platform: platform.id
		});
		const withoutPlatform = await exportJson(PATH, owner.authorization, {
			platform: "any"
		});
		const bySearch = await exportJson(PATH, owner.authorization, {
			search: keyword
		});

		assert.deepEqual(titlesOf(byPlatform), [older.title]);
		assert.deepEqual(titlesOf(withoutPlatform), [newer.title]);
		assert.deepEqual(titlesOf(bySearch), [older.title]);
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
		const response = await exportRequest(`/lists/${randomUUID()}/export`, {
			authorization: "Bearer not-a-token"
		});
		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});

	void it("exports an own list as CSV named after its slug when there is no Accept header", async () => {
		const owner = await createUserWithSession();
		const { list, first, second } = await createListWithItems(
			owner.user.id,
			"Mis RPG: Favoritos"
		);

		const response = await api()
			.get(`/lists/${list.id}/export`)
			.set("Authorization", owner.authorization)
			.unset("Accept");
		const lines = csvLines(response.text);

		assert.equal(response.status, 200);
		assert.equal(response.headers["content-type"], CSV_CONTENT_TYPE);
		assert.equal(
			response.headers["content-disposition"],
			`attachment; filename="completr-list-mis-rpg-favoritos-${todayInUtc()}.csv"`
		);
		assert.equal(lines[0], headerLine(LIST_EXPORT_COLUMNS));
		assert.ok(lines[1]!.startsWith(`1,${first.title},4,20,4,`));
		assert.ok(lines[2]!.startsWith(`2,${second.title},,,,`));
	});

	void it("exports an own list as JSON for premium", async () => {
		const owner = await createUserWithSession("premium");
		const { list, first } = await createListWithItems(owner.user.id, "Top");

		const response = await exportJson(
			`/lists/${list.id}/export`,
			owner.authorization
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

		const response = await exportRequest(`/lists/${list.id}/export`, {
			authorization: owner.authorization,
			accept: CSV
		});

		assert.equal(response.status, 200);
		assert.deepEqual(csvLines(response.text), [
			headerLine(LIST_EXPORT_COLUMNS)
		]);
	});

	void it("responds 402 EXPORT_FORMAT_PREMIUM when a free user accepts only JSON", async () => {
		const owner = await createUserWithSession();
		const { list } = await createListWithItems(owner.user.id, "Free");

		const response = await exportJson(
			`/lists/${list.id}/export`,
			owner.authorization
		);

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "EXPORT_FORMAT_PREMIUM");
	});

	void it("responds 406 EXPORT_FORMAT_NOT_ACCEPTABLE when neither CSV nor JSON is accepted", async () => {
		const owner = await createUserWithSession("premium");
		const { list } = await createListWithItems(owner.user.id, "Html");

		const response = await exportRequest(`/lists/${list.id}/export`, {
			authorization: owner.authorization,
			accept: "text/html"
		});

		assert.equal(response.status, 406);
		assert.equal(response.body.type, "EXPORT_FORMAT_NOT_ACCEPTABLE");
	});

	void it("responds 404 LIST_NOT_FOUND for a public list of another user", async () => {
		const owner = await createUserWithSession();
		const viewer = await createUserWithSession("premium");
		const source = await createScoreSource();
		const list = await createList(owner.user.id, source.code, {
			isPublic: true
		});

		const response = await exportRequest(`/lists/${list.id}/export`, {
			authorization: viewer.authorization
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});

	void it("responds 404 LIST_NOT_FOUND for a list that does not exist", async () => {
		const { authorization } = await createUserWithSession();

		const response = await exportRequest(`/lists/${randomUUID()}/export`, {
			authorization
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});
});
