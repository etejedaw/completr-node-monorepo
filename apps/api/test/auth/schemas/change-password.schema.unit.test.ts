/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChangePasswordSchema } from "../../../src/auth/schemas/change-password.schema";

describe("ChangePasswordSchema", () => {
	it("applies the password policy", () => {
		assert.equal(
			ChangePasswordSchema.safeParse({ password: "weak" }).success,
			false
		);
		assert.equal(
			ChangePasswordSchema.safeParse({ password: "Abcdef1!" }).success,
			true
		);
	});

	it("rejects unknown fields", () => {
		assert.equal(
			ChangePasswordSchema.safeParse({
				password: "Abcdef1!",
				role: "admin"
			}).success,
			false
		);
	});
});
