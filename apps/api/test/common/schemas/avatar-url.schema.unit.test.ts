import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	AVATAR_PRESET_COUNT,
	AVATAR_PRESET_PATHS
} from "../../../src/common/constants/avatar.constants";
import { AvatarUrlSchema } from "../../../src/common/schemas/avatar-url.schema";
import { UpdateUserSchema } from "../../../src/users/schemas/update-user.schema";

void describe("AvatarUrlSchema", () => {
	void it("accepts each of the preset avatars", () => {
		assert.equal(AVATAR_PRESET_PATHS.length, AVATAR_PRESET_COUNT);
		for (const value of AVATAR_PRESET_PATHS)
			assert.equal(AvatarUrlSchema.safeParse(value).success, true, value);
	});

	void it("rejects junk input", () => {
		for (const value of [
			"",
			"https://img.example.test/a.png",
			"http://img.example.test/a.png",
			"/avatars/completr_profile_00.png",
			"/avatars/completr_profile_16.png",
			"/avatars/completr_profile_99.png",
			"/AVATARS/COMPLETR_PROFILE_01.PNG",
			" /avatars/completr_profile_01.png",
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
			`https://example.test/${"a".repeat(300)}.png`,
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
		for (const avatarUrl of [
			"../x.png",
			"javascript:x",
			"a".repeat(256),
			"https://img.example.test/a.png"
		])
			assert.equal(
				UpdateUserSchema.safeParse({ avatarUrl }).success,
				false,
				avatarUrl
			);
	});
});
