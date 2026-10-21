import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RegisterSchema } from "../../../src/auth/schemas/register.schema";

const validRegistration = {
	username: "player_one",
	email: "Player@Example.COM",
	password: "Abcdef1!",
	name: "Player One"
};

void describe("RegisterSchema", () => {
	void it("lowercases the email", () => {
		assert.equal(
			RegisterSchema.parse(validRegistration).email,
			"player@example.com"
		);
	});

	void it("rejects unknown fields such as role", () => {
		assert.equal(
			RegisterSchema.safeParse({ ...validRegistration, role: "admin" })
				.success,
			false
		);
	});

	void it("rejects angle brackets in the bio and bios over 250 characters", () => {
		assert.equal(
			RegisterSchema.safeParse({ ...validRegistration, bio: "<i>" })
				.success,
			false
		);
		assert.equal(
			RegisterSchema.safeParse({
				...validRegistration,
				bio: "a".repeat(251)
			}).success,
			false
		);
	});

	void it("rejects malformed emails and avatar urls", () => {
		assert.equal(
			RegisterSchema.safeParse({ ...validRegistration, email: "nope" })
				.success,
			false
		);
		assert.equal(
			RegisterSchema.safeParse({
				...validRegistration,
				avatarUrl: "nope"
			}).success,
			false
		);
	});
});
