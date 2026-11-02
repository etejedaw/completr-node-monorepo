import {
	buildHltbSearchUrl,
	buildMetacriticGameUrl,
	normalizeHltbId,
	normalizeMetacriticSlug
} from "./external-id-input";

describe("normalizeHltbId", () => {
	it.each([
		["10270", "10270"],
		["  10270  ", "10270"],
		["0010270", "10270"],
		["https://howlongtobeat.com/game/10270", "10270"],
		["https://www.howlongtobeat.com/game/10270", "10270"],
		["https://howlongtobeat.com/game/10270/", "10270"],
		["https://howlongtobeat.com/game/10270?ref=search#reviews", "10270"],
		["http://howlongtobeat.com/game/10270", "10270"],
		["howlongtobeat.com/game/10270", "10270"],
		["  HTTPS://WWW.HowLongToBeat.com/Game/10270/  ", "10270"]
	])("turns %j into %j", (raw, expected) => {
		expect(normalizeHltbId(raw)).toBe(expected);
	});

	it.each(["", "   ", "\t\n"])("treats the blank value %j as empty", raw => {
		expect(normalizeHltbId(raw)).toBe("");
	});

	it.each([
		"0",
		"000",
		"-5",
		"12.5",
		"1e3",
		"10 270",
		"abc",
		"10270abc",
		"🎮",
		"https://howlongtobeat.com/game/abc",
		"https://howlongtobeat.com/game/",
		"https://howlongtobeat.com/?q=hades",
		"https://evil.example/howlongtobeat.com/game/10270",
		"https://howlongtobeat.com.evil.example/game/10270",
		"https://www.metacritic.com/game/10270/"
	])("rejects %j", raw => {
		expect(normalizeHltbId(raw)).toBeNull();
	});
});

describe("normalizeMetacriticSlug", () => {
	it.each([
		["the-witcher-3-wild-hunt", "the-witcher-3-wild-hunt"],
		["  the-witcher-3-wild-hunt  ", "the-witcher-3-wild-hunt"],
		["The-Witcher-3-Wild-Hunt", "the-witcher-3-wild-hunt"],
		["hades", "hades"],
		["final-fantasy-vii--remake", "final-fantasy-vii--remake"],
		[
			"https://www.metacritic.com/game/the-witcher-3-wild-hunt/",
			"the-witcher-3-wild-hunt"
		],
		[
			"https://metacritic.com/game/the-witcher-3-wild-hunt",
			"the-witcher-3-wild-hunt"
		],
		[
			"https://www.metacritic.com/game/the-witcher-3-wild-hunt/critic-reviews/?platform=pc",
			"the-witcher-3-wild-hunt"
		],
		[
			"www.metacritic.com/game/the-witcher-3-wild-hunt?ref=x",
			"the-witcher-3-wild-hunt"
		],
		[
			"https://www.metacritic.com/game/pc/the-witcher-3-wild-hunt/",
			"the-witcher-3-wild-hunt"
		],
		[
			"https://www.metacritic.com/game/playstation-4/bloodborne",
			"bloodborne"
		],
		[
			"metacritic.com/game/switch/the-legend-of-zelda-breath-of-the-wild/critic-reviews?sort=date",
			"the-legend-of-zelda-breath-of-the-wild"
		],
		[
			"  HTTPS://WWW.METACRITIC.COM/GAME/PLAYSTATION-4/BLOODBORNE/  ",
			"bloodborne"
		],
		["https://www.metacritic.com/game/switch/", "switch"],
		[
			" HTTPS://WWW.METACRITIC.COM/GAME/THE-WITCHER-3-WILD-HUNT/ ",
			"the-witcher-3-wild-hunt"
		]
	])("turns %j into %j", (raw, expected) => {
		expect(normalizeMetacriticSlug(raw)).toBe(expected);
	});

	it.each(["", "  "])("treats the blank value %j as empty", raw => {
		expect(normalizeMetacriticSlug(raw)).toBe("");
	});

	it.each([
		"the witcher 3",
		"-hades",
		"hades-",
		"hades_2",
		"hadés",
		"hades/2",
		"🎮",
		"https://www.metacritic.com/game/",
		"https://www.metacritic.com/game/the witcher/",
		"https://www.metacritic.com/movie/the-witcher/",
		"https://www.metacritic.com/game/pc/the witcher/",
		"https://evil.example/metacritic.com/game/hades"
	])("rejects %j", raw => {
		expect(normalizeMetacriticSlug(raw)).toBeNull();
	});
});

describe("external links", () => {
	it("encodes the title in the HowLongToBeat search URL", () => {
		expect(buildHltbSearchUrl("  Hades & Co: 100% #1 ")).toBe(
			"https://howlongtobeat.com/?q=Hades%20%26%20Co%3A%20100%25%20%231"
		);
	});

	it("has no search URL for a blank title", () => {
		expect(buildHltbSearchUrl("   ")).toBeNull();
	});

	it("builds the Metacritic game page of a slug", () => {
		expect(buildMetacriticGameUrl("hades")).toBe(
			"https://www.metacritic.com/game/hades/"
		);
	});
});
