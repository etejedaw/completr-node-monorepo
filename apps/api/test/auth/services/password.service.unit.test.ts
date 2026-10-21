import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	hashPassword,
	verifyPassword
} from "../../../src/auth/services/password.service";

void describe("password service", () => {
	void it("hashes a password into a hash that is not the plain text", async () => {
		const hash = await hashPassword("Abcdef1!");

		assert.notEqual(hash, "Abcdef1!");
		assert.match(hash, /^\$2[aby]\$/);
	});

	void it("produces a different hash on every call because of the salt", async () => {
		assert.notEqual(
			await hashPassword("Abcdef1!"),
			await hashPassword("Abcdef1!")
		);
	});

	void it("verifies the right password and rejects a wrong one", async () => {
		const hash = await hashPassword("Abcdef1!");

		assert.equal(await verifyPassword("Abcdef1!", hash), true);
		assert.equal(await verifyPassword("Abcdef1?", hash), false);
	});
});
