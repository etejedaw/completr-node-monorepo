/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DisplayNameSchema } from "../../../src/auth/schemas/display-name.schema";

describe("DisplayNameSchema", () => {
	it("enforces the 4-80 character length", () => {
		assert.equal(DisplayNameSchema.safeParse("abc").success, false);
		assert.equal(
			DisplayNameSchema.safeParse("a".repeat(81)).success,
			false
		);
	});

	it("rejects angle brackets", () => {
		assert.equal(
			DisplayNameSchema.safeParse("<b>Player</b>").success,
			false
		);
	});
});
