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
	["503", rawgFailureHandler(503), 502, "RAWG_REQUEST_ERROR"],
	["network failure", networkFailure, 502, "RAWG_REQUEST_ERROR"],
	["invalid JSON body", invalidJson, 502, "RAWG_PARSE_ERROR"]
];

void describe("RAWG test setup", () => {
	void it("loads the fake API key before the services read the config", () => {
		assert.equal(apiKeysConfig.RAWG_API_KEY, "fake-key");
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
				source: "rawg",
				externalId: "326243",
				title: "Elden Ring",
				description: "Rise, Tarnished, and become an Elden Lord.",
				coverUrl: null,
				backgroundUrl:
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

	for (const [label, handler, httpStatus, type] of RAWG_FAILURES) {
		void it(`maps a RAWG ${label} to ${httpStatus} ${type}`, async () => {
			stubRawgFetch(handler);
			const account = await createUserWithSession("moderator");

			const response = await bySlug(account.authorization, "elden-ring");

			assert.equal(response.status, httpStatus);
			assert.equal(response.body.type, type);
		});
	}
});
