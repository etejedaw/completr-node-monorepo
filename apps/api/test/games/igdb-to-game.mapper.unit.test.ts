import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IGDB_SCORE_EXTRACTORS } from "../../src/games/mappers/extractors/igdb-score.extractors";
import { extractSourceValues } from "../../src/games/mappers/extractors/source-value-extractor";
import { mapIgdbGenreSlugs } from "../../src/games/mappers/igdb-genre.map";
import { mapIgdbPlatformSlugs } from "../../src/games/mappers/igdb-platform.map";
import { igdbToGameMapper } from "../../src/games/mappers/igdb-to-game.mapper";
import { RegisterGameSchema } from "../../src/games/schemas/register-game.schema";
import { type IgdbGame } from "../../src/igdb/igdb.interface";
import {
	buildIgdbGame,
	COMPLETE_IGDB_GAME,
	igdbRefs
} from "./fixtures/igdb.fixtures";

const PC_CODES = [
	"pc",
	"steam",
	"gog",
	"pc-epic-games",
	"ea-origin",
	"origin",
	"blizzard-battlenet"
];

const SECONDS_PER_DAY = 86400;
const SEPTEMBER_17_2020_UTC = 1600300800;

function extractScore(game: IgdbGame): number | null {
	return extractSourceValues(IGDB_SCORE_EXTRACTORS, game)[0]?.value ?? null;
}

function mapScore(rating: unknown): number | null {
	return extractScore(buildIgdbGame({ rating: rating as number }));
}

function mapReleaseAt(firstReleaseDate: unknown): string | undefined {
	return igdbToGameMapper(
		buildIgdbGame({ first_release_date: firstReleaseDate as number })
	).game.releaseAt;
}

void describe("igdbToGameMapper", () => {
	void describe("complete game", () => {
		const mapped = igdbToGameMapper(COMPLETE_IGDB_GAME);

		void it("maps the base fields", () => {
			assert.equal(mapped.game.title, "Fixture Quest");
			assert.equal(
				mapped.game.description,
				"A rogue-lite dungeon crawler about a fixture."
			);
			assert.equal(mapped.game.releaseAt, "2020-09-17");
			assert.deepEqual(mapped.game.genres, []);
		});

		void it("uses the portrait cover as coverUrl and leaves backgroundUrl empty", () => {
			assert.equal(
				mapped.game.coverUrl,
				"https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1abc.jpg"
			);
			assert.equal(mapped.game.backgroundUrl, undefined);
		});

		void it("maps and expands platforms without duplicates", () => {
			assert.deepEqual(mapped.game.platforms, [
				"xbox-series-xors",
				"playstation-4",
				...PC_CODES,
				"ios",
				"playstation-5",
				"nintendo-switch"
			]);
		});

		void it("maps genres and themes into genre slugs", () => {
			assert.deepEqual(mapped.enrichment.genreSlugs, [
				"rpg",
				"indie",
				"action"
			]);
		});

		void it("keeps the raw user rating rounded to 2 decimals and no times", () => {
			assert.deepEqual(mapped.enrichment.scores, [
				{ source: "igdb", score: 89.43 }
			]);
			assert.deepEqual(mapped.enrichment.times, []);
		});

		void it("produces a game that passes the register schema", () => {
			assert.equal(
				RegisterGameSchema.safeParse(mapped.game).success,
				true
			);
		});
	});

	void describe("missing fields", () => {
		void it("maps a bare game to its title and empty collections", () => {
			const mapped = igdbToGameMapper(buildIgdbGame());

			assert.equal(mapped.game.title, "Fixture Quest");
			assert.equal(mapped.game.description, undefined);
			assert.equal(mapped.game.releaseAt, undefined);
			assert.equal(mapped.game.coverUrl, undefined);
			assert.deepEqual(mapped.game.platforms, []);
			assert.deepEqual(mapped.enrichment.scores, []);
			assert.deepEqual(mapped.enrichment.times, []);
			assert.deepEqual(mapped.enrichment.genreSlugs, []);
			assert.equal(
				RegisterGameSchema.safeParse(mapped.game).success,
				true
			);
		});

		void it("ignores a cover without a usable image id", () => {
			for (const image_id of ["", " ", "a/b", "../x", "a b", "co1?x=1"]) {
				const mapped = igdbToGameMapper(
					buildIgdbGame({ cover: { id: 1, image_id } })
				);
				assert.equal(mapped.game.coverUrl, undefined, image_id);
			}
		});

		void it("ignores empty or blank summaries", () => {
			for (const summary of ["", "   ", "\n\t"]) {
				const mapped = igdbToGameMapper(buildIgdbGame({ summary }));
				assert.equal(mapped.game.description, undefined);
			}
		});

		void it("handles empty relation arrays", () => {
			const mapped = igdbToGameMapper(
				buildIgdbGame({ platforms: [], genres: [], themes: [] })
			);

			assert.deepEqual(mapped.game.platforms, []);
			assert.deepEqual(mapped.enrichment.genreSlugs, []);
		});

		void it("maps a game with only a rating", () => {
			const mapped = igdbToGameMapper(buildIgdbGame({ rating: 70 }));

			assert.deepEqual(mapped.enrichment.scores, [
				{ source: "igdb", score: 70 }
			]);
		});
	});

	void describe("erratic input", () => {
		void it("does not mutate the input", () => {
			const input = structuredClone(COMPLETE_IGDB_GAME);
			const snapshot = structuredClone(input);

			igdbToGameMapper(input);

			assert.deepEqual(input, snapshot);
		});

		void it("does not share state between calls", () => {
			const first = igdbToGameMapper(
				buildIgdbGame({ platforms: igdbRefs("win") })
			);
			first.game.platforms.length = 0;
			first.game.platforms.push("corrupted");

			const second = igdbToGameMapper(
				buildIgdbGame({ platforms: igdbRefs("win") })
			);

			assert.deepEqual(second.game.platforms, PC_CODES);
		});

		void it("returns the same result for the same game on concurrent calls", async () => {
			const results = await Promise.all(
				Array.from({ length: 50 }, (_, index) =>
					Promise.resolve().then(() =>
						igdbToGameMapper(
							index % 2 === 0
								? COMPLETE_IGDB_GAME
								: buildIgdbGame({
										platforms: igdbRefs("switch-2", "win")
									})
						)
					)
				)
			);

			for (const [index, mapped] of results.entries()) {
				const expected = igdbToGameMapper(
					index % 2 === 0
						? COMPLETE_IGDB_GAME
						: buildIgdbGame({
								platforms: igdbRefs("switch-2", "win")
							})
				);
				assert.deepEqual(mapped, expected);
			}
		});

		void it("shuffled relations give the same sets of codes", () => {
			const slugs = ["ps5", "win", "switch", "xboxone", "ios"];
			const reversed = [...slugs].reverse();

			assert.deepEqual(
				new Set(mapIgdbPlatformSlugs(slugs)),
				new Set(mapIgdbPlatformSlugs(reversed))
			);
		});

		void it("keeps titles that are weird but present", () => {
			const title = "  ¿Qué? 🎮 <b>x</b> ".repeat(3);
			assert.equal(
				igdbToGameMapper(buildIgdbGame({ name: title })).game.title,
				title
			);
		});
	});
});

void describe("mapIgdbPlatformSlugs", () => {
	void it("maps the slugs that differ from ours", () => {
		assert.deepEqual(mapIgdbPlatformSlugs(["ps4--1"]), ["playstation-4"]);
		assert.deepEqual(mapIgdbPlatformSlugs(["series-x-s"]), [
			"xbox-series-xors"
		]);
		assert.deepEqual(mapIgdbPlatformSlugs(["psvita", "wiiu", "ngc"]), [
			"playstation-vita",
			"nintendo-wii-u",
			"nintendo-gamecube"
		]);
	});

	void it("keeps Switch and Switch 2 as separate platforms", () => {
		assert.deepEqual(mapIgdbPlatformSlugs(["switch"]), ["nintendo-switch"]);
		assert.deepEqual(mapIgdbPlatformSlugs(["switch-2"]), [
			"nintendo-switch-2"
		]);
		assert.deepEqual(mapIgdbPlatformSlugs(["switch-2", "switch"]), [
			"nintendo-switch-2",
			"nintendo-switch"
		]);
	});

	void it("expands win to every PC platform", () => {
		assert.deepEqual(mapIgdbPlatformSlugs(["win"]), PC_CODES);
	});

	void it("does not repeat PC platforms when win comes twice or with others", () => {
		const codes = mapIgdbPlatformSlugs(["win", "ps5", "win"]);

		assert.deepEqual(codes, [...PC_CODES, "playstation-5"]);
		assert.equal(new Set(codes).size, codes.length);
	});

	void it("collapses regional and revision variants onto one code", () => {
		assert.deepEqual(mapIgdbPlatformSlugs(["nes", "famicom"]), [
			"nintendo-entertainment-system"
		]);
		assert.deepEqual(mapIgdbPlatformSlugs(["snes", "sfam"]), [
			"super-nintendo"
		]);
		assert.deepEqual(mapIgdbPlatformSlugs(["3ds", "new-3ds"]), [
			"nintendo-3ds"
		]);
	});

	void it("ignores unknown, empty and non-slug values", () => {
		const garbage = [
			"",
			" ",
			"WIN",
			"ps4",
			"linux",
			"mac",
			"stadia",
			"constructor",
			"__proto__",
			"toString",
			"hasOwnProperty",
			"win ",
			"\u0000"
		];

		assert.deepEqual(mapIgdbPlatformSlugs(garbage), []);
	});

	void it("keeps the known ones among garbage", () => {
		assert.deepEqual(
			mapIgdbPlatformSlugs(["???", "ps5", "__proto__", "ios", "ps5"]),
			["playstation-5", "ios"]
		);
	});

	void it("returns an empty array for no slugs", () => {
		assert.deepEqual(mapIgdbPlatformSlugs([]), []);
	});

	void it("only emits codes that exist in the catalog", () => {
		const everySlug = [
			"ps",
			"ps2",
			"ps3",
			"ps4--1",
			"ps5",
			"psp",
			"psvita",
			"xbox",
			"xbox360",
			"xboxone",
			"series-x-s",
			"switch",
			"switch-2",
			"wiiu",
			"wii",
			"ngc",
			"n64",
			"3ds",
			"new-3ds",
			"nds",
			"gba",
			"gbc",
			"gb",
			"snes",
			"sfam",
			"nes",
			"famicom",
			"genesis-slash-megadrive",
			"dc",
			"ios",
			"android",
			"win"
		];
		const knownCodes = new Set([
			"android",
			"blizzard-battlenet",
			"ea-origin",
			"game-boy",
			"game-boy-advance",
			"game-boy-color",
			"gog",
			"ios",
			"nintendo-3ds",
			"nintendo-64",
			"nintendo-ds",
			"nintendo-entertainment-system",
			"nintendo-gamecube",
			"nintendo-switch",
			"nintendo-switch-2",
			"nintendo-wii",
			"nintendo-wii-u",
			"origin",
			"pc",
			"pc-epic-games",
			"playstation",
			"playstation-2",
			"playstation-3",
			"playstation-4",
			"playstation-5",
			"playstation-portable",
			"playstation-vita",
			"sega-dreamcast",
			"sega-genesis",
			"steam",
			"super-nintendo",
			"xbox",
			"xbox-360",
			"xbox-one",
			"xbox-series-xors"
		]);

		for (const slug of everySlug) {
			const codes = mapIgdbPlatformSlugs([slug]);
			assert.ok(codes.length > 0, `${slug} has no mapping`);
			for (const code of codes) {
				assert.ok(
					knownCodes.has(code),
					`${slug} -> ${code} is unknown`
				);
			}
		}
	});
});

void describe("mapIgdbGenreSlugs", () => {
	void it("maps genre slugs that differ from ours", () => {
		assert.deepEqual(
			mapIgdbGenreSlugs([
				"role-playing-rpg",
				"platform",
				"simulator",
				"sport",
				"real-time-strategy-rts",
				"turn-based-strategy-tbs",
				"music"
			]),
			[
				"rpg",
				"platformer",
				"simulation",
				"sports",
				"real-time-strategy",
				"turn-based-strategy",
				"rhythm"
			]
		);
	});

	void it("maps clear theme slugs", () => {
		assert.deepEqual(
			mapIgdbGenreSlugs([
				"action",
				"horror",
				"survival",
				"stealth",
				"sandbox",
				"open-world",
				"educational"
			]),
			[
				"action",
				"horror",
				"survival",
				"stealth",
				"sandbox",
				"open-world",
				"educational"
			]
		);
	});

	void it("does not map doubtful or merged genres and themes", () => {
		assert.deepEqual(
			mapIgdbGenreSlugs([
				"hack-and-slash-beat-em-up",
				"card-and-board-game",
				"tactical",
				"quiz-trivia",
				"pinball",
				"moba",
				"fantasy",
				"science-fiction",
				"kids",
				"party",
				"thriller",
				"warfare"
			]),
			[]
		);
	});

	void it("does not repeat a code reached from several slugs", () => {
		assert.deepEqual(
			mapIgdbGenreSlugs([
				"strategy",
				"4x-explore-expand-exploit-and-exterminate",
				"strategy"
			]),
			["strategy"]
		);
	});

	void it("ignores unknown, empty and prototype-like values", () => {
		assert.deepEqual(
			mapIgdbGenreSlugs([
				"",
				" ",
				"Action",
				"rpg",
				"constructor",
				"__proto__",
				"toString",
				"\u0000"
			]),
			[]
		);
	});

	void it("returns an empty array for no slugs", () => {
		assert.deepEqual(mapIgdbGenreSlugs([]), []);
	});
});

void describe("IGDB_SCORE_EXTRACTORS", () => {
	void it("declares a single igdb source", () => {
		assert.deepEqual(
			IGDB_SCORE_EXTRACTORS.map(extractor => extractor.source),
			["igdb"]
		);
	});

	void it("returns the raw rating on the 0 to 100 scale", () => {
		assert.equal(mapScore(75), 75);
		assert.equal(mapScore(100), 100);
		assert.equal(mapScore(0.01), 0.01);
	});

	void it("rounds to 2 decimals", () => {
		assert.equal(mapScore(89.43176758204031), 89.43);
		assert.equal(mapScore(89.435), 89.44);
		assert.equal(mapScore(66.666666), 66.67);
		assert.equal(mapScore(50.0000001), 50);
	});

	void it("returns null for a missing, zero or negative rating", () => {
		assert.equal(mapScore(undefined), null);
		assert.equal(mapScore(0), null);
		assert.equal(mapScore(-0), null);
		assert.equal(mapScore(-1), null);
		assert.equal(mapScore(-89.43), null);
	});

	void it("returns null for a rating that rounds down to zero", () => {
		assert.equal(mapScore(0.004), null);
		assert.equal(mapScore(Number.MIN_VALUE), null);
	});

	void it("returns null for garbage ratings", () => {
		assert.equal(mapScore(Number.NaN), null);
		assert.equal(mapScore(Infinity), null);
		assert.equal(mapScore(-Infinity), null);
		assert.equal(mapScore("85"), null);
		assert.equal(mapScore(null), null);
		assert.equal(mapScore({}), null);
		assert.equal(mapScore(100.01), null);
		assert.equal(mapScore(8500), null);
	});

	void it("ignores aggregated and total ratings and the rating count", () => {
		const game = {
			...buildIgdbGame(),
			aggregated_rating: 90,
			total_rating: 91,
			rating_count: 0
		} as IgdbGame;

		assert.equal(extractScore(game), null);
		assert.equal(extractScore({ ...game, rating: 60 }), 60);
	});

	void it("does not require a minimum rating_count", () => {
		const game = buildIgdbGame({ rating: 80, rating_count: 1 });

		assert.deepEqual(igdbToGameMapper(game).enrichment.scores, [
			{ source: "igdb", score: 80 }
		]);
	});
});

void describe("release date", () => {
	void it("formats the unix seconds as a UTC date", () => {
		assert.equal(mapReleaseAt(SEPTEMBER_17_2020_UTC), "2020-09-17");
	});

	void it("stays on the same UTC day up to the last second", () => {
		assert.equal(mapReleaseAt(SEPTEMBER_17_2020_UTC - 1), "2020-09-16");
		assert.equal(mapReleaseAt(SEPTEMBER_17_2020_UTC), "2020-09-17");
		assert.equal(
			mapReleaseAt(SEPTEMBER_17_2020_UTC + SECONDS_PER_DAY - 1),
			"2020-09-17"
		);
		assert.equal(
			mapReleaseAt(SEPTEMBER_17_2020_UTC + SECONDS_PER_DAY),
			"2020-09-18"
		);
	});

	void it("handles year and leap day boundaries", () => {
		assert.equal(mapReleaseAt(946684799), "1999-12-31");
		assert.equal(mapReleaseAt(946684800), "2000-01-01");
		assert.equal(mapReleaseAt(1709164800), "2024-02-29");
	});

	void it("handles the epoch and dates before it", () => {
		assert.equal(mapReleaseAt(0), "1970-01-01");
		assert.equal(mapReleaseAt(-1), "1969-12-31");
		assert.equal(mapReleaseAt(-SECONDS_PER_DAY * 365 * 8), "1962-01-03");
	});

	void it("does not depend on the process timezone", () => {
		const original = process.env.TZ;
		try {
			for (const timezone of [
				"Pacific/Kiritimati",
				"Pacific/Pago_Pago"
			]) {
				process.env.TZ = timezone;
				assert.equal(
					mapReleaseAt(SEPTEMBER_17_2020_UTC + 3600),
					"2020-09-17"
				);
				assert.equal(
					mapReleaseAt(SEPTEMBER_17_2020_UTC - 3600),
					"2020-09-16"
				);
			}
		} finally {
			if (original === undefined) delete process.env.TZ;
			else process.env.TZ = original;
		}
	});

	void it("returns undefined for values that are not a valid date", () => {
		assert.equal(mapReleaseAt(undefined), undefined);
		assert.equal(mapReleaseAt(Number.NaN), undefined);
		assert.equal(mapReleaseAt(Infinity), undefined);
		assert.equal(mapReleaseAt(-Infinity), undefined);
		assert.equal(mapReleaseAt("1600300800"), undefined);
		assert.equal(mapReleaseAt(null), undefined);
		assert.equal(mapReleaseAt({}), undefined);
		assert.equal(mapReleaseAt(8.64e15), undefined);
	});

	void it("returns undefined for years the register schema would reject", () => {
		assert.equal(mapReleaseAt(253402300800), undefined);
		assert.equal(mapReleaseAt(-62135596800 - SECONDS_PER_DAY), undefined);
		assert.equal(mapReleaseAt(-1e12), undefined);
	});

	void it("accepts the first and last representable four-digit years", () => {
		assert.equal(mapReleaseAt(-62135596800), "0001-01-01");
		assert.equal(mapReleaseAt(253402300799), "9999-12-31");
	});
});
