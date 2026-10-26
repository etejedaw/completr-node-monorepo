import {
	derivePrivacyMode,
	effectiveVisibility,
	PRIVACY_PRESETS,
	PRIVACY_SECTION_GROUPS,
	SECTION_KEYS,
	VISIBILITY_OPTIONS,
	visibilityLabel
} from "./privacy-options";

describe("privacy options", () => {
	const allAt = (level: "public" | "friends" | "private") =>
		Object.fromEntries(
			["profileVisibility", ...SECTION_KEYS].map(key => [key, level])
		) as Parameters<typeof derivePrivacyMode>[0];

	it("offers the three visibility levels from most to least open", () => {
		expect(VISIBILITY_OPTIONS.map(option => option.value)).toEqual([
			"public",
			"friends",
			"private"
		]);
		expect(VISIBILITY_OPTIONS.map(option => option.label)).toEqual([
			"Everyone",
			"Friends",
			"Only you"
		]);
	});

	it("offers one preset per level plus Custom", () => {
		expect(PRIVACY_PRESETS.map(preset => preset.value)).toEqual([
			"public",
			"friends",
			"private",
			"custom"
		]);
	});

	it("groups every section key exactly once, each with a title and an icon", () => {
		const sections = PRIVACY_SECTION_GROUPS.flatMap(
			group => group.sections
		);

		expect(sections.map(section => section.key).sort()).toEqual(
			[...SECTION_KEYS].sort()
		);
		expect(new Set(SECTION_KEYS).size).toBe(SECTION_KEYS.length);
		for (const section of sections) {
			expect(section.title).toBeTruthy();
			expect(section.icon).toBeTruthy();
		}
	});

	it("covers the eight profile sections", () => {
		expect([...SECTION_KEYS].sort()).toEqual([
			"backlogVisibility",
			"favoriteVisibility",
			"feedVisibility",
			"listVisibility",
			"platinumVisibility",
			"queueVisibility",
			"shelfVisibility",
			"wishlistVisibility"
		]);
	});

	it("lists Platinums in the Library group with the platinum trophy", () => {
		const library = PRIVACY_SECTION_GROUPS.find(
			group => group.title === "Library"
		)!;
		const platinums = library.sections.find(
			section => section.key === "platinumVisibility"
		);

		expect(platinums).toMatchObject({
			title: "Platinums",
			icon: "emoji_events",
			iconColor: "text-platinum"
		});
	});

	describe("effectiveVisibility", () => {
		it.each([
			["public", "public", "public"],
			["public", "friends", "friends"],
			["public", "private", "private"],
			["friends", "public", "friends"],
			["friends", "friends", "friends"],
			["friends", "private", "private"],
			["private", "public", "private"],
			["private", "friends", "private"],
			["private", "private", "private"]
		] as const)(
			"a %s section on a %s profile is effectively %s",
			(section, profile, expected) => {
				expect(effectiveVisibility(section, profile)).toBe(expected);
			}
		);
	});

	describe("derivePrivacyMode", () => {
		it.each(["public", "friends", "private"] as const)(
			"is %s when the profile and every section share that level",
			level => {
				expect(derivePrivacyMode(allAt(level))).toBe(level);
			}
		);

		it("is custom when a single section differs", () => {
			expect(
				derivePrivacyMode({
					...allAt("public"),
					queueVisibility: "friends"
				})
			).toBe("custom");
		});

		it("is custom when only the profile differs from its sections", () => {
			expect(
				derivePrivacyMode({
					...allAt("public"),
					profileVisibility: "private"
				})
			).toBe("custom");
		});
	});

	describe("visibilityLabel", () => {
		it.each([
			["public", "Everyone"],
			["friends", "Friends"],
			["private", "Only you"]
		] as const)("labels %s as %s", (level, label) => {
			expect(visibilityLabel(level)).toBe(label);
		});
	});
});
