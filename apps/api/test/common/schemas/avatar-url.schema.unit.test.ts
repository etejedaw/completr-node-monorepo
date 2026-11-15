import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AvatarUrlSchema } from "../../../src/common/schemas/avatar-url.schema";
import { UpdateUserSchema } from "../../../src/users/schemas/update-user.schema";

const MAX_LENGTH = 255;

void describe("AvatarUrlSchema", () => {
	void it("accepts http(s) urls and preset avatar paths", () => {
		for (const value of [
			"https://img.example.test/a.png",
			"http://img.example.test/a.png",
			"/avatars/completr_profile_01.png",
			"/avatars/completr_profile_15.png"
		])
			assert.equal(AvatarUrlSchema.safeParse(value).success, true, value);
	});

	void it("rejects junk input", () => {
		const longUrl = `https://example.test/${"a".repeat(MAX_LENGTH)}`;
		for (const value of [
			"",
			"nope",
			"javascript:alert(1)",
			"data:image/png;base64,AAAA",
			"ftp://example.test/a.png",
			"../avatars/completr_profile_01.png",
			"/avatars/../etc/passwd",
			"/avatars/completr_profile_1.png",
			"/avatars/completr_profile_001.png",
			"/avatars/completr_profile_01.png/extra",
			"/avatars/completr_profile_01.png?x=1",
			"/other/completr_profile_01.png",
			"//evil.test/avatars/completr_profile_01.png",
			longUrl,
			null,
			42
		])
			assert.equal(
				AvatarUrlSchema.safeParse(value).success,
				false,
				String(value)
			);
	});
});

void describe("UpdateUserSchema avatarUrl", () => {
	void it("accepts null to clear the avatar and omits it otherwise", () => {
		assert.equal(
			UpdateUserSchema.safeParse({ avatarUrl: null }).success,
			true
		);
		assert.equal(UpdateUserSchema.safeParse({}).success, true);
	});

	void it("rejects junk avatars", () => {
		for (const avatarUrl of ["../x.png", "javascript:x", "a".repeat(256)])
			assert.equal(
				UpdateUserSchema.safeParse({ avatarUrl }).success,
				false,
				avatarUrl
			);
	});
});
