import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Platform } from "../../src/platforms/platform.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

useTestDatabase();

function createNamedPlatform(name: string, code: string) {
	return Platform.create({
		name,
		code,
		abbreviation: code.slice(0, 10).toUpperCase(),
		description: `${name} console`,
		manufacturer: "Completr Test",
		generation: 8,
		logoUrl: `https://img.completr.test/${code}.png`,
		releaseAt: new Date("2013-11-15")
	});
}

void describe("GET /platforms", () => {
	void it("returns an empty list when no platform exists", async () => {
		const reader = await createUserWithSession();

		const response = await api()
			.get("/platforms")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { platforms: [] });
	});

	void it("lists every platform with its serialized fields", async () => {
		const reader = await createUserWithSession();
		const platform = await createNamedPlatform("PlayStation 4", "ps4-t");
		await createNamedPlatform("Nintendo Switch", "switch-t");

		const response = await api()
			.get("/platforms")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.platforms.length, 2);
		const listed = response.body.data.platforms.find(
			(entry: { id: string }) => entry.id === platform.id
		);
		assert.equal(listed.name, "PlayStation 4");
		assert.equal(listed.code, "ps4-t");
		assert.equal(listed.abbreviation, "PS4-T");
		assert.equal(listed.description, "PlayStation 4 console");
		assert.equal(listed.manufacturer, "Completr Test");
		assert.equal(listed.generation, 8);
		assert.equal(listed.logoUrl, "https://img.completr.test/ps4-t.png");
		assert.equal(listed.releaseAt, "2013-11-15");
		assert.ok(listed.updatedAt);
	});

	void it("serves every role", async () => {
		const accounts = await Promise.all([
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await api()
				.get("/platforms")
				.set("Authorization", account.authorization);
			assert.equal(response.status, 200);
		}
	});

	void it("reflects a platform created after a previous read", async () => {
		const reader = await createUserWithSession();
		await createNamedPlatform("Xbox One", "xbox-one-t");

		const response = await api()
			.get("/platforms")
			.set("Authorization", reader.authorization);

		assert.equal(response.body.data.platforms.length, 3);
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/platforms");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/platforms")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /platforms/:code", () => {
	void it("returns the platform that matches the code", async () => {
		const reader = await createUserWithSession();
		const platform = await createNamedPlatform("Sega Genesis", "genesis-t");

		const response = await api()
			.get("/platforms/genesis-t")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.platform.id, platform.id);
		assert.equal(response.body.data.platform.name, "Sega Genesis");
		assert.equal(response.body.data.platform.code, "genesis-t");
		assert.equal(response.body.data.platform.manufacturer, "Completr Test");
	});

	void it("answers 404 PLATFORM_NOT_FOUND for an unknown code", async () => {
		const reader = await createUserWithSession();

		const response = await api()
			.get("/platforms/does-not-exist")
			.set("Authorization", reader.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "PLATFORM_NOT_FOUND");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/platforms/genesis-t");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/platforms/genesis-t")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
