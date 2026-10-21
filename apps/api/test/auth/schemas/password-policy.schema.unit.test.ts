import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PasswordPolicySchema } from "../../../src/auth/schemas/password-policy.schema";

void describe("PasswordPolicySchema", () => {
	void it("accepts a password with lowercase, uppercase, digit and symbol", () => {
		assert.equal(PasswordPolicySchema.safeParse("Abcdef1!").success, true);
	});

	void it("rejects passwords shorter than 8 or longer than 15 characters", () => {
		assert.equal(PasswordPolicySchema.safeParse("Abc1!").success, false);
		assert.equal(
			PasswordPolicySchema.safeParse("Abcdefghijklm1!x").success,
			false
		);
	});

	void it("rejects each missing character class", () => {
		for (const password of [
			"ABCDEF1!",
			"abcdef1!",
			"Abcdefg!",
			"Abcdefg1"
		]) {
			assert.equal(
				PasswordPolicySchema.safeParse(password).success,
				false,
				password
			);
		}
	});
});
