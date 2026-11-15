import "./rawg-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { jsonResponse, stubRawgFetch } from "./rawg-fetch.helper";

let authorization: string;

useTestDatabase(async () => {
	authorization = (await createUserWithSession("moderator")).authorization;
});

afterEach(() => {
	mock.restoreAll();
});

const MALFORMED_SLUGS = [
	"..%2Fcreators",
	"..%2F..%2Fusers",
	"UPPER-CASE",
	"with%20space",
	"semi;colon",
	"-leading-dash",
	"%00",
	"a%3Fkey%3Dother"
];

void describe("GET /game-external/rawg/:slug with a malformed slug", () => {
	for (const slug of MALFORMED_SLUGS) {
		void it(`answers 404 without calling RAWG for "${slug}"`, async () => {
			const { rawgCalls } = stubRawgFetch(() =>
				jsonResponse({ id: 1, slug: "x", name: "X" })
			);

			const response = await api()
				.get(`/game-external/rawg/${slug}`)
				.set("Authorization", authorization);

			assert.equal(response.status, 404);
			assert.equal(rawgCalls.length, 0);
		});
	}
});
