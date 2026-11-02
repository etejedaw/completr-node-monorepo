import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

void describe("request body parsing errors", () => {
	useTestDatabase();

	void it("answers 400 COMMON_INVALID_JSON for a truncated JSON body on any route", async () => {
		const account = await createUserWithSession();

		const response = await api()
			.post("/lists")
			.set("Authorization", account.authorization)
			.set("Content-Type", "application/json")
			.send('{"name": "Backlog"');

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "COMMON_INVALID_JSON");
		assert.equal(response.body.status, 400);
	});

	void it("answers 400 COMMON_INVALID_JSON before authentication runs", async () => {
		const response = await api()
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send("{email:");

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "COMMON_INVALID_JSON");
	});

	void it("answers 413 COMMON_PAYLOAD_TOO_LARGE for a body over the parser limit", async () => {
		const response = await api()
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ email: "a".repeat(200_000) }));

		assert.equal(response.status, 413);
		assert.equal(response.body.type, "COMMON_PAYLOAD_TOO_LARGE");
	});

	void it("still validates a well-formed body against the route schema", async () => {
		const response = await api()
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send({ email: 42 });

		assert.equal(response.status, 422);
	});
});
