import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ResetPasswordSchema } from "../../../src/auth/schemas/reset-password.schema";

void describe("ResetPasswordSchema", () => {
	void it("applies the password policy to the new password", () => {
		assert.equal(
			ResetPasswordSchema.safeParse({
				token: "a1".repeat(32),
				password: "weak"
			}).success,
			false
		);
	});

	void it("requires a well formed token", () => {
		assert.equal(
			ResetPasswordSchema.safeParse({
				token: "short",
				password: "Abcdef1!"
			}).success,
			false
		);
		assert.equal(
			ResetPasswordSchema.safeParse({
				token: "a1".repeat(32),
				password: "Abcdef1!"
			}).success,
			true
		);
	});
});
