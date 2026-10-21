import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OneTimeTokenSchema } from "../../../src/common/schemas/one-time-token.schema";

void describe("OneTimeTokenSchema", () => {
	void it("accepts a 64 character lowercase hex token", () => {
		assert.equal(
			OneTimeTokenSchema.safeParse("a1".repeat(32)).success,
			true
		);
	});

	void it("rejects tokens with the wrong length", () => {
		assert.equal(
			OneTimeTokenSchema.safeParse("a1".repeat(31)).success,
			false
		);
		assert.equal(
			OneTimeTokenSchema.safeParse("a1".repeat(33)).success,
			false
		);
	});

	void it("rejects uppercase and non hex characters", () => {
		assert.equal(
			OneTimeTokenSchema.safeParse("A1".repeat(32)).success,
			false
		);
		assert.equal(
			OneTimeTokenSchema.safeParse("g1".repeat(32)).success,
			false
		);
	});
});
