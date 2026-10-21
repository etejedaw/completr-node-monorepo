import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SafeTextSchema } from "../../../src/common/schemas/safe-text.schema";

void describe("SafeTextSchema", () => {
	void it("accepts plain text, accents and an empty string", () => {
		assert.equal(
			SafeTextSchema.safeParse("Hola, ¿qué tal? & más").success,
			true
		);
		assert.equal(SafeTextSchema.safeParse("").success, true);
	});

	void it("rejects text containing an opening angle bracket", () => {
		assert.equal(SafeTextSchema.safeParse("<script>").success, false);
	});

	void it("rejects text containing only a closing angle bracket", () => {
		assert.equal(SafeTextSchema.safeParse("a > b").success, false);
	});
});
