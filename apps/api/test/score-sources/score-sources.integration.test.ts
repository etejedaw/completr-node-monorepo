import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ScoreSource } from "../../src/score-sources/score-source.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

useTestDatabase();

function createNamedSource(
	code: string,
	name: string,
	scale: number,
	priority: number
) {
	return ScoreSource.create({ code, name, scale, priority });
}

void describe("GET /score-sources", () => {
	void it("returns an empty catalog when no source exists", async () => {
		const reader = await createUserWithSession();

		const response = await api()
			.get("/score-sources")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { sources: [] });
	});

	void it("lists every source ordered by priority and then by name", async () => {
		const reader = await createUserWithSession();
		await createNamedSource("metacritic-t", "Metacritic", 100, 100);
		await createNamedSource("completr", "Completr", 5, 5);
		await createNamedSource("opencritic-t", "OpenCritic", 100, 100);
		await createNamedSource("rawg-t", "RAWG", 5, 50);

		const response = await api()
			.get("/score-sources")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.sources.map(
				(source: { code: string }) => source.code
			),
			["completr", "rawg-t", "metacritic-t", "opencritic-t"]
		);
	});

	void it("exposes only code, name, scale and priority of each source", async () => {
		const reader = await createUserWithSession();

		const response = await api()
			.get("/score-sources")
			.set("Authorization", reader.authorization);

		assert.deepEqual(response.body.data.sources[0], {
			code: "completr",
			name: "Completr",
			scale: 5,
			priority: 5
		});
	});

	void it("reflects a source added after a previous read", async () => {
		const reader = await createUserWithSession();
		await createNamedSource("steam-t", "Steam", 100, 10);

		const response = await api()
			.get("/score-sources")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.sources.length, 5);
		assert.equal(response.body.data.sources[1].code, "steam-t");
	});

	void it("serves every role", async () => {
		const accounts = await Promise.all([
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await api()
				.get("/score-sources")
				.set("Authorization", account.authorization);
			assert.equal(response.status, 200);
		}
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/score-sources");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/score-sources")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
