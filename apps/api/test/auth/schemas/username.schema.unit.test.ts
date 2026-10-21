import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UsernameSchema } from "../../../src/auth/schemas/username.schema";

void describe("UsernameSchema", () => {
	void it("accepts lowercase letters, digits, dots and underscores", () => {
		assert.equal(UsernameSchema.safeParse("a.b_c9").success, true);
	});

	void it("rejects uppercase, spaces and other symbols", () => {
		for (const username of ["Player", "play er", "play-er", "plàyer"]) {
			assert.equal(
				UsernameSchema.safeParse(username).success,
				false,
				username
			);
		}
	});

	void it("enforces the 4-15 character length", () => {
		assert.equal(UsernameSchema.safeParse("abc").success, false);
		assert.equal(UsernameSchema.safeParse("a".repeat(16)).success, false);
		assert.equal(UsernameSchema.safeParse("a".repeat(15)).success, true);
	});
});
