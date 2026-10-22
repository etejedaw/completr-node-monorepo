import "./rawg-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { apiKeysConfig } from "../../src/common/config/api-keys.config";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	ELDEN_RING_DETAIL,
	HOLLOW_KNIGHT_DETAIL,
	SEARCH_RESPONSE,
	UNRATED_DETAIL
} from "./fixtures/rawg.fixtures";
import {
	jsonResponse,
	rawgCatalogHandler,
	rawgFailureHandler,
	type RawgHandler,
	stubRawgFetch
} from "./rawg-fetch.helper";
import { seedRawgCatalog } from "./rawg-seed.helper";

useTestDatabase(seedRawgCatalog);

afterEach(() => {
	mock.restoreAll();
});

const ALLOWED_ROLES: UserRole[] = ["moderator", "admin"];
const FORBIDDEN_ROLES: UserRole[] = ["user", "premium"];

const catalog = rawgCatalogHandler({
	search: SEARCH_RESPONSE,
	details: [ELDEN_RING_DETAIL, HOLLOW_KNIGHT_DETAIL, UNRATED_DETAIL]
});

const networkFailure: RawgHandler = () => {
	throw new TypeError("fetch failed");
};

const invalidJson: RawgHandler = () =>
	new Response("<html>bad gateway</html>", { status: 200 });

const RAWG_FAILURES: [string, RawgHandler, number, string][] = [
	[
		"404",
		() => jsonResponse({ detail: "Not found." }, 404),
		404,
		"RAWG_NOT_FOUND"
	],
	[
		"429",
		() => jsonResponse({ detail: "Throttled" }, 429),
		429,
		"RAWG_RATE_LIMITED"
	],
	["500", rawgFailureHandler(500), 502, "RAWG_REQUEST_ERROR"],
	["503", rawgFailureHandler(503), 502, "RAWG_REQUEST_ERROR"]
];

void describe("RAWG test setup", () => {
	void it("loads the fake API key before the services read the config", () => {
		assert.equal(apiKeysConfig.RAWG_API_KEY, "fake-key");
	});
});

void describe("GET /games/rawg-lookup", () => {
	function lookup(authorization: string, query: Record<string, string>) {
		return api()
			.get("/games/rawg-lookup")
			.query(query)
			.set("Authorization", authorization);
	}

	for (const role of ALLOWED_ROLES) {
		void it(`returns the mapped RAWG results to a ${role}`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession(role);

			const response = await lookup(account.authorization, {
				query: "elden ring"
			});

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.results, [
				{
					rawgId: 326243,
					title: "Elden Ring",
					backgroundUrl:
						"https://media.rawg.io/media/games/b29/elden-ring.jpg",
					releaseAt: "2022-02-25",
					metacritic: 96,
					playtime: 55,
					platforms: ["playstation5", "xbox-series-x"],
					genres: ["action", "role-playing-games-rpg"]
				},
				{
					rawgId: 9767,
					title: "Hollow Knight",
					backgroundUrl:
						"https://media.rawg.io/media/games/4cf/hollow-knight.jpg",
					releaseAt: "2017-02-24",
					metacritic: 87,
					playtime: 14,
					platforms: ["nintendo-switch"],
					genres: ["indie", "platformer"]
				}
			]);
			assert.equal(rawgCalls.length, 1);
		});
	}

	void it("asks RAWG for ten results without additions and with the API key", async () => {
		const { rawgCalls } = stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		await lookup(account.authorization, { query: "hollow knight" }).expect(
			200
		);

		const [call] = rawgCalls;
		assert.ok(call);
		assert.equal(call.pathname, "/api/games");
		assert.equal(call.searchParams.get("key"), "fake-key");
		assert.equal(call.searchParams.get("search"), "hollow knight");
		assert.equal(call.searchParams.get("page_size"), "10");
		assert.equal(call.searchParams.get("exclude_additions"), "true");
	});

	void it("keeps the null fields of a result", async () => {
		stubRawgFetch(
			rawgCatalogHandler({
				search: { count: 1, next: null, results: [UNRATED_DETAIL] }
			})
		);
		const account = await createUserWithSession("moderator");

		const response = await lookup(account.authorization, {
			query: "obscure"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			{
				rawgId: 770001,
				title: "Obscure Prototype",
				backgroundUrl: null,
				releaseAt: null,
				metacritic: null,
				playtime: 0,
				platforms: [],
				genres: []
			}
		]);
	});

	void it("returns an empty list when RAWG finds nothing", async () => {
		stubRawgFetch(rawgCatalogHandler({}));
		const account = await createUserWithSession("moderator");

		const response = await lookup(account.authorization, {
			query: "zzzz"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, []);
	});

	const invalidQueries: [string, Record<string, string>][] = [
		["a missing query", {}],
		["an empty query", { query: "" }],
		["a query over 200 characters", { query: "a".repeat(201) }],
		["an unknown param", { query: "zelda", page: "2" }],
		["a non-boolean force_rawg", { query: "zelda", force_rawg: "maybe" }]
	];

	for (const [label, query] of invalidQueries) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID and does not call RAWG`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession("moderator");

			const response = await lookup(account.authorization, query);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			assert.equal(rawgCalls.length, 0);
		});
	}

	for (const role of FORBIDDEN_ROLES) {
		void it(`rejects a ${role} with 403 AUTH_FORBIDDEN and does not call RAWG`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession(role);

			const response = await lookup(account.authorization, {
				query: "zelda"
			});

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "AUTH_FORBIDDEN");
			assert.equal(rawgCalls.length, 0);
		});
	}

	void it("rejects a request without token with 422 AUTH_SCHEMA_INVALID", async () => {
		const { rawgCalls } = stubRawgFetch(catalog);

		const response = await api()
			.get("/games/rawg-lookup")
			.query({ query: "zelda" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
		assert.equal(rawgCalls.length, 0);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const { rawgCalls } = stubRawgFetch(catalog);

		const response = await lookup("Bearer expired.token.value", {
			query: "zelda"
		});

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
		assert.equal(rawgCalls.length, 0);
	});

	for (const [status, handler, httpStatus, type] of RAWG_FAILURES) {
		void it(`maps a RAWG ${status} to ${httpStatus} ${type}`, async () => {
			stubRawgFetch(handler);
			const account = await createUserWithSession("moderator");

			const response = await lookup(account.authorization, {
				query: "zelda"
			});

			assert.equal(response.status, httpStatus);
			assert.equal(response.body.type, type);
		});
	}

	void it("answers 500 INTERNAL_ERROR when the network to RAWG fails", async () => {
		stubRawgFetch(networkFailure);
		const account = await createUserWithSession("moderator");

		const response = await lookup(account.authorization, {
			query: "zelda"
		});

		assert.equal(response.status, 500);
		assert.equal(response.body.type, "INTERNAL_ERROR");
	});

	void it("answers 500 INTERNAL_ERROR when RAWG returns a body that is not JSON", async () => {
		stubRawgFetch(invalidJson);
		const account = await createUserWithSession("moderator");

		const response = await lookup(account.authorization, {
			query: "zelda"
		});

		assert.equal(response.status, 500);
		assert.equal(response.body.type, "INTERNAL_ERROR");
	});
});

void describe("GET /games/rawg-detail/:rawgId", () => {
	function detail(authorization: string, rawgId: string | number) {
		return api()
			.get(`/games/rawg-detail/${rawgId}`)
			.set("Authorization", authorization);
	}

	for (const role of ALLOWED_ROLES) {
		void it(`returns the mapped detail to a ${role}`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession(role);

			const response = await detail(account.authorization, 326243);

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.game, {
				rawgId: 326243,
				title: "Elden Ring",
				description: "Rise, Tarnished, and become an Elden Lord.",
				coverUrl:
					"https://media.rawg.io/media/games/b29/elden-ring.jpg",
				releaseAt: "2022-02-25",
				platforms: ["playstation-5", "xbox-series-xors"],
				genres: ["action", "rpg", "soulslike"],
				scores: [{ source: "metacritic", score: 96 }],
				times: [{ source: "rawg", duration: 55 }]
			});
			assert.equal(rawgCalls.length, 1);
		});
	}

	void it("requests the game by id with the API key", async () => {
		const { rawgCalls } = stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		await detail(account.authorization, 9767).expect(200);

		const [call] = rawgCalls;
		assert.ok(call);
		assert.equal(call.pathname, "/api/games/9767");
		assert.equal(call.searchParams.get("key"), "fake-key");
	});

	void it("drops the scores whose source is not in the catalog", async () => {
		stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		const response = await detail(account.authorization, 9767);

		assert.deepEqual(response.body.data.game.scores, [
			{ source: "metacritic", score: 87 }
		]);
	});

	void it("returns empty collections for a game without platforms, genres, scores or times", async () => {
		stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		const response = await detail(account.authorization, 770001);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.game, {
			rawgId: 770001,
			title: "Obscure Prototype",
			description: null,
			coverUrl: null,
			releaseAt: null,
			platforms: [],
			genres: [],
			scores: [],
			times: []
		});
	});

	for (const rawgId of ["abc", "0", "-3", "1.5"]) {
		void it(`rejects the id "${rawgId}" with 422 COMMON_SCHEMA_INVALID and does not call RAWG`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession("moderator");

			const response = await detail(account.authorization, rawgId);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			assert.equal(rawgCalls.length, 0);
		});
	}

	void it("answers 404 RAWG_NOT_FOUND when RAWG does not know the id", async () => {
		stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		const response = await detail(account.authorization, 999999999);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "RAWG_NOT_FOUND");
	});

	for (const role of FORBIDDEN_ROLES) {
		void it(`rejects a ${role} with 403 AUTH_FORBIDDEN and does not call RAWG`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession(role);

			const response = await detail(account.authorization, 326243);

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "AUTH_FORBIDDEN");
			assert.equal(rawgCalls.length, 0);
		});
	}

	void it("rejects a request without token with 422 AUTH_SCHEMA_INVALID", async () => {
		stubRawgFetch(catalog);

		const response = await api().get("/games/rawg-detail/326243");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	for (const [status, handler, httpStatus, type] of RAWG_FAILURES) {
		void it(`maps a RAWG ${status} to ${httpStatus} ${type}`, async () => {
			stubRawgFetch(handler);
			const account = await createUserWithSession("moderator");

			const response = await detail(account.authorization, 326243);

			assert.equal(response.status, httpStatus);
			assert.equal(response.body.type, type);
		});
	}

	void it("answers 500 INTERNAL_ERROR when the network to RAWG fails", async () => {
		stubRawgFetch(networkFailure);
		const account = await createUserWithSession("moderator");

		const response = await detail(account.authorization, 326243);

		assert.equal(response.status, 500);
		assert.equal(response.body.type, "INTERNAL_ERROR");
	});
});

void describe("GET /game-external/rawg/:slug", () => {
	function bySlug(authorization: string, slug: string) {
		return api()
			.get(`/game-external/rawg/${slug}`)
			.set("Authorization", authorization);
	}

	for (const role of ALLOWED_ROLES) {
		void it(`returns the mapped detail of the slug to a ${role}`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession(role);

			const response = await bySlug(account.authorization, "elden-ring");

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.game, {
				rawgId: 326243,
				title: "Elden Ring",
				description: "Rise, Tarnished, and become an Elden Lord.",
				coverUrl:
					"https://media.rawg.io/media/games/b29/elden-ring.jpg",
				releaseAt: "2022-02-25",
				platforms: ["playstation-5", "xbox-series-xors"],
				genres: ["action", "rpg", "soulslike"],
				scores: [{ source: "metacritic", score: 96 }],
				times: [{ source: "rawg", duration: 55 }]
			});
			assert.equal(rawgCalls.length, 1);
		});
	}

	void it("requests the game by slug with the API key", async () => {
		const { rawgCalls } = stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		await bySlug(account.authorization, "hollow-knight").expect(200);

		const [call] = rawgCalls;
		assert.ok(call);
		assert.equal(call.pathname, "/api/games/hollow-knight");
		assert.equal(call.searchParams.get("key"), "fake-key");
	});

	void it("answers 404 RAWG_NOT_FOUND for a slug RAWG does not have", async () => {
		stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		const response = await bySlug(account.authorization, "no-such-game");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "RAWG_NOT_FOUND");
	});

	void it("rejects a slug over 200 characters with 422 COMMON_SCHEMA_INVALID", async () => {
		const { rawgCalls } = stubRawgFetch(catalog);
		const account = await createUserWithSession("moderator");

		const response = await bySlug(account.authorization, "a".repeat(201));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(rawgCalls.length, 0);
	});

	for (const role of FORBIDDEN_ROLES) {
		void it(`rejects a ${role} with 403 AUTH_FORBIDDEN and does not call RAWG`, async () => {
			const { rawgCalls } = stubRawgFetch(catalog);
			const account = await createUserWithSession(role);

			const response = await bySlug(account.authorization, "elden-ring");

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "AUTH_FORBIDDEN");
			assert.equal(rawgCalls.length, 0);
		});
	}

	void it("rejects a request without token with 422 AUTH_SCHEMA_INVALID", async () => {
		stubRawgFetch(catalog);

		const response = await api().get("/game-external/rawg/elden-ring");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	for (const [status, handler, httpStatus, type] of RAWG_FAILURES) {
		void it(`maps a RAWG ${status} to ${httpStatus} ${type}`, async () => {
			stubRawgFetch(handler);
			const account = await createUserWithSession("moderator");

			const response = await bySlug(account.authorization, "elden-ring");

			assert.equal(response.status, httpStatus);
			assert.equal(response.body.type, type);
		});
	}
});
