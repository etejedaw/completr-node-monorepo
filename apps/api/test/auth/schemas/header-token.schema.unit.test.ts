/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HeaderTokenSchema } from "../../../src/auth/schemas/header-token.schema";

describe("HeaderTokenSchema", () => {
	it("accepts a Bearer authorization header", () => {
		assert.equal(
			HeaderTokenSchema.safeParse({ authorization: "Bearer abc.def.ghi" })
				.success,
			true
		);
	});

	it("rejects other schemes, missing token and extra whitespace", () => {
		for (const authorization of [
			"Basic abc",
			"Bearer",
			"Bearer a b",
			"bearer abc"
		]) {
			assert.equal(
				HeaderTokenSchema.safeParse({ authorization }).success,
				false,
				authorization
			);
		}
	});
});
