import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildRewindRecapPatterns,
	daysToFinish,
	ratingVsCritics
} from "../../src/rewind-recap/utils/build-rewind-recap-patterns.util";
import { buildRun, finishedRun } from "../rewind/rewind-run.builder";
import { franchiseOf, genreOf } from "./rewind-recap.fixtures";

const YEAR = 2026;

function abandonedRun(
	gameCode: string,
	finishedAt: string,
	overrides: Parameters<typeof buildRun>[1] = {}
) {
	return buildRun(gameCode, {
		status: "abandoned",
		finishedAt,
		...overrides
	});
}

void describe("buildRewindRecapPatterns", () => {
	void it("returns empty groups for a year without closed games", () => {
		const patterns = buildRewindRecapPatterns(
			[
				buildRun("playing-one", {
					status: "playing",
					startedAt: "2026-05-01"
				})
			],
			[],
			YEAR
		);

		assert.deepEqual(patterns.byGenre, []);
		assert.deepEqual(patterns.byPlatform, []);
		assert.deepEqual(patterns.byLength, []);
		assert.deepEqual(patterns.byQuarter, []);
		assert.deepEqual(patterns.sameDayCloses, []);
		assert.deepEqual(patterns.quickDrops, []);
		assert.deepEqual(patterns.slowestFinishes, []);
		assert.deepEqual(patterns.startedInEarlierYears, []);
		assert.deepEqual(patterns.pace, {
			games: 0,
			medianPace: null,
			slowerThanEstimate: 0,
			fasterThanEstimate: 0
		});
		assert.deepEqual(patterns.franchises, []);
		assert.deepEqual(patterns.overlap, {
			games: 0,
			overlapping: 0,
			solo: 0
		});
		assert.deepEqual(patterns.ratingHabits, {
			rated: 0,
			mostUsedRating: null,
			fives: 0
		});
		assert.equal(patterns.importedCloses, 0);
	});

	void it("leaves imported closes on January 1 out of every aggregate and counts them", () => {
		const patterns = buildRewindRecapPatterns(
			[
				abandonedRun("imported-a", "2026-01-01", { realDuration: 40 }),
				abandonedRun("imported-b", "2026-01-01T00:00:00.000Z"),
				finishedRun("real-close", "2026-01-01", {
					startedAt: "2025-12-20",
					realDuration: 3
				})
			],
			[],
			YEAR
		);

		assert.equal(patterns.importedCloses, 2);
		assert.deepEqual(patterns.sameDayCloses, []);
		assert.deepEqual(
			patterns.byQuarter.map(group => [group.name, group.games]),
			[["January to March", 1]]
		);
		assert.deepEqual(patterns.byLength[0]?.finishedTitles, ["REAL-CLOSE"]);
	});

	void it("splits length ranges in order with their finished and abandoned titles", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("epic", "2026-03-01", { realDuration: 45 }),
				abandonedRun("tiny-drop", "2026-03-02", { realDuration: 2 }),
				finishedRun("tiny-finish", "2026-03-03", { duration: 4.9 }),
				finishedRun("mid", "2026-03-04", { realDuration: 15 }),
				finishedRun("no-hours", "2026-03-05")
			],
			[],
			YEAR
		);

		assert.deepEqual(
			patterns.byLength.map(group => ({
				name: group.name,
				finished: group.finishedTitles,
				abandoned: group.abandonedTitles
			})),
			[
				{
					name: "under 5 hours",
					finished: ["TINY-FINISH"],
					abandoned: ["TINY-DROP"]
				},
				{ name: "15 to 30 hours", finished: ["MID"], abandoned: [] },
				{ name: "over 30 hours", finished: ["EPIC"], abandoned: [] }
			]
		);
	});

	void it("averages ratings and the gap with critics per group, ignoring missing values", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("loved", "2026-02-01", { userRating: 5, score: 4 }),
				finishedRun("meh", "2026-02-02", { userRating: 2, score: 4.4 }),
				finishedRun("unrated", "2026-02-03", { score: 3 })
			],
			[],
			YEAR
		);
		const platform = patterns.byPlatform[0];

		assert.equal(platform?.name, "NSW");
		assert.equal(platform?.games, 3);
		assert.equal(platform?.averageRating, 3.5);
		assert.equal(platform?.averageRatingVsCritics, -0.7);
		assert.equal(platform?.averageHours, null);
	});

	void it("keeps only genres and platforms with at least two closed games", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("horror-a", "2026-04-01"),
				finishedRun("horror-b", "2026-04-02", {
					platform: { name: "PC", abbreviation: "PC" }
				}),
				finishedRun("racing", "2026-04-03")
			],
			[
				genreOf("horror-a", "horror", "Horror"),
				genreOf("horror-b", "horror", "Horror"),
				genreOf("racing", "racing", "Racing")
			],
			YEAR
		);

		assert.deepEqual(
			patterns.byGenre.map(group => group.name),
			["Horror"]
		);
		assert.deepEqual(
			patterns.byPlatform.map(group => group.name),
			["NSW"]
		);
	});

	void it("lists same-day closes, quick drops, slowest finishes and games started in earlier years", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("same-a", "2026-03-03", { userRating: 4.5 }),
				abandonedRun("same-b", "2026-03-03", { userRating: 2.5 }),
				abandonedRun("quick", "2026-06-04", {
					startedAt: "2026-06-01"
				}),
				abandonedRun("slow-drop", "2026-08-30", {
					startedAt: "2026-06-01"
				}),
				finishedRun("slow-1", "2026-09-01", {
					startedAt: "2026-01-02"
				}),
				finishedRun("slow-2", "2026-09-02", {
					startedAt: "2026-05-02"
				}),
				finishedRun("slow-3", "2026-09-03", {
					startedAt: "2026-07-02"
				}),
				finishedRun("slow-4", "2026-09-04", {
					startedAt: "2026-09-01"
				}),
				finishedRun("old-start", "2026-02-10", {
					startedAt: "2024-11-30"
				})
			],
			[],
			YEAR
		);

		assert.deepEqual(patterns.sameDayCloses, [
			{
				date: "2026-03-03",
				games: [
					{ title: "SAME-A", status: "completed", userRating: 4.5 },
					{ title: "SAME-B", status: "abandoned", userRating: 2.5 }
				]
			}
		]);
		assert.deepEqual(
			patterns.quickDrops.map(game => [game.title, game.days]),
			[["QUICK", 3]]
		);
		assert.deepEqual(
			patterns.slowestFinishes.map(game => game.title),
			["OLD-START", "SLOW-1", "SLOW-2"]
		);
		assert.deepEqual(
			patterns.startedInEarlierYears.map(game => game.title),
			["OLD-START"]
		);
	});

	void it("ignores games still in progress and closes from other years", () => {
		const patterns = buildRewindRecapPatterns(
			[
				buildRun("playing", {
					status: "playing",
					startedAt: "2026-02-01"
				}),
				finishedRun("last-year", "2025-12-31"),
				finishedRun("next-year", "2027-01-02")
			],
			[],
			YEAR
		);

		assert.deepEqual(patterns.byQuarter, []);
		assert.equal(patterns.importedCloses, 0);
	});

	void it("keeps hostile titles as plain values", () => {
		const title = '<script>alert("x")</script> 🎮 "quoted"';
		const run = finishedRun("hostile", "2026-05-05", { realDuration: 2 });
		run.game.title = title;

		const patterns = buildRewindRecapPatterns([run], [], YEAR);

		assert.deepEqual(patterns.byLength[0]?.finishedTitles, [title]);
	});
});

void describe("daysToFinish and ratingVsCritics", () => {
	void it("counts whole days between start and finish", () => {
		assert.equal(
			daysToFinish(
				finishedRun("a", "2026-03-10", { startedAt: "2026-02-01" })
			),
			37
		);
		assert.equal(
			daysToFinish(
				finishedRun("b", "2026-03-10T23:00:00.000Z", {
					startedAt: "2026-03-10T01:00:00.000Z"
				})
			),
			0
		);
		assert.equal(daysToFinish(finishedRun("c", "2026-03-10")), null);
	});

	void it("rounds the gap with critics to a tenth and needs both values", () => {
		assert.equal(
			ratingVsCritics(
				finishedRun("a", "2026-01-05", { userRating: 4.5, score: 4.65 })
			),
			-0.2
		);
		assert.equal(
			ratingVsCritics(finishedRun("b", "2026-01-05", { userRating: 4 })),
			null
		);
	});
});

void describe("buildRewindRecapPatterns pace", () => {
	void it("takes the median pace over closed games with both hours", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("slow", "2026-02-01", {
					realDuration: 30,
					duration: 10
				}),
				finishedRun("fast", "2026-02-02", {
					realDuration: 5,
					duration: 10
				}),
				abandonedRun("dropped", "2026-02-03", {
					realDuration: 12,
					duration: 10
				}),
				finishedRun("exact", "2026-02-04", {
					realDuration: 10,
					duration: 10
				}),
				finishedRun("zero-estimate", "2026-02-05", {
					realDuration: 10,
					duration: 0
				}),
				finishedRun("only-estimate", "2026-02-06", { duration: 10 }),
				buildRun("still-playing", {
					status: "playing",
					startedAt: "2026-02-01",
					realDuration: 90,
					duration: 10
				}),
				abandonedRun("imported", "2026-01-01", {
					realDuration: 100,
					duration: 1
				})
			],
			[],
			YEAR
		);

		assert.deepEqual(patterns.pace, {
			games: 4,
			medianPace: 1.1,
			slowerThanEstimate: 2,
			fasterThanEstimate: 1
		});
	});

	void it("rounds the median of an odd count to two decimals", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("a", "2026-02-01", {
					realDuration: 10,
					duration: 3
				}),
				finishedRun("b", "2026-02-02", {
					realDuration: 1,
					duration: 3
				}),
				finishedRun("c", "2026-02-03", {
					realDuration: 20,
					duration: 3
				})
			],
			[],
			YEAR
		);

		assert.equal(patterns.pace.medianPace, 3.33);
	});
});

void describe("buildRewindRecapPatterns franchises", () => {
	void it("lists series with two or more different games closed in the year in finish order", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("zelda-2", "2026-09-01"),
				abandonedRun("zelda-1", "2026-03-01"),
				finishedRun("zelda-1", "2026-11-01"),
				finishedRun("mario", "2026-05-01"),
				finishedRun("mario-again", "2025-12-30"),
				buildRun("zelda-3", {
					status: "playing",
					startedAt: "2026-10-01"
				}),
				abandonedRun("imported-zelda", "2026-01-01"),
				finishedRun("replayed", "2026-02-01"),
				finishedRun("replayed", "2026-08-01")
			],
			[],
			YEAR,
			[
				franchiseOf("zelda-1", "Zelda"),
				franchiseOf("zelda-2", "Zelda"),
				franchiseOf("zelda-3", "Zelda"),
				franchiseOf("imported-zelda", "Zelda"),
				franchiseOf("mario", "Mario"),
				franchiseOf("mario-again", "Mario"),
				franchiseOf("replayed", "Solo Series")
			]
		);

		assert.deepEqual(patterns.franchises, [
			{
				name: "Zelda",
				games: [
					{
						title: "ZELDA-1",
						status: "abandoned",
						finishedAt: "2026-03-01"
					},
					{
						title: "ZELDA-2",
						status: "completed",
						finishedAt: "2026-09-01"
					},
					{
						title: "ZELDA-1",
						status: "completed",
						finishedAt: "2026-11-01"
					}
				]
			}
		]);
	});

	void it("puts a game of two series in both and sorts the biggest first", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("crossover", "2026-04-01"),
				finishedRun("mario", "2026-05-01"),
				finishedRun("sonic", "2026-06-01"),
				finishedRun("sonic-2", "2026-07-01")
			],
			[],
			YEAR,
			[
				franchiseOf("crossover", "Mario"),
				franchiseOf("crossover", "Sonic"),
				franchiseOf("mario", "Mario"),
				franchiseOf("sonic", "Sonic"),
				franchiseOf("sonic-2", "Sonic")
			]
		);

		assert.deepEqual(
			patterns.franchises.map(group => [
				group.name,
				group.games.map(game => game.title)
			]),
			[
				["Sonic", ["CROSSOVER", "SONIC", "SONIC-2"]],
				["Mario", ["CROSSOVER", "MARIO"]]
			]
		);
	});
});

void describe("buildRewindRecapPatterns overlap", () => {
	void it("counts closed games played alongside another and the ones played alone", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("long-rpg", "2026-03-31", {
					startedAt: "2026-01-10"
				}),
				finishedRun("short-indie", "2026-02-05", {
					startedAt: "2026-02-01"
				}),
				finishedRun("one-day-inside", "2026-03-15", {
					startedAt: "2026-03-15"
				}),
				finishedRun("right-after", "2026-04-20", {
					startedAt: "2026-03-31"
				}),
				abandonedRun("lonely-drop", "2026-06-10", {
					startedAt: "2026-06-01"
				}),
				finishedRun("no-start", "2026-05-01"),
				abandonedRun("imported", "2026-01-01")
			],
			[],
			YEAR
		);

		assert.deepEqual(patterns.overlap, {
			games: 5,
			overlapping: 3,
			solo: 2
		});
	});

	void it("treats two games played on the same single day as overlapping", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("a", "2026-05-01", { startedAt: "2026-05-01" }),
				finishedRun("b", "2026-05-01", { startedAt: "2026-05-01" })
			],
			[],
			YEAR
		);

		assert.deepEqual(patterns.overlap, {
			games: 2,
			overlapping: 2,
			solo: 0
		});
	});

	void it("counts a game started last year and finished this year against this year's games", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("carried", "2026-02-15", {
					startedAt: "2025-11-01"
				}),
				finishedRun("new", "2026-01-20", { startedAt: "2026-01-05" })
			],
			[],
			YEAR
		);

		assert.equal(patterns.overlap.overlapping, 2);
	});
});

void describe("buildRewindRecapPatterns ratingHabits", () => {
	void it("finds the most used rating, the fives and how many games were rated", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("a", "2026-02-01", { userRating: 4 }),
				finishedRun("b", "2026-02-02", { userRating: 5 }),
				finishedRun("c", "2026-02-03", { userRating: 4 }),
				abandonedRun("d", "2026-02-04", { userRating: 1.5 }),
				finishedRun("e", "2026-02-05", { userRating: 5 }),
				finishedRun("f", "2026-02-06", { userRating: 4 }),
				finishedRun("unrated", "2026-02-07"),
				finishedRun("zero", "2026-02-08", { userRating: 0 }),
				abandonedRun("imported", "2026-01-01", { userRating: 5 }),
				buildRun("playing", {
					status: "playing",
					startedAt: "2026-02-01",
					userRating: 5
				})
			],
			[],
			YEAR
		);

		assert.deepEqual(patterns.ratingHabits, {
			rated: 7,
			mostUsedRating: 4,
			fives: 2
		});
	});

	void it("breaks a tie toward the higher rating", () => {
		const patterns = buildRewindRecapPatterns(
			[
				finishedRun("a", "2026-02-01", { userRating: 3 }),
				finishedRun("b", "2026-02-02", { userRating: 4.5 }),
				finishedRun("c", "2026-02-03", { userRating: 3 }),
				finishedRun("d", "2026-02-04", { userRating: 4.5 })
			],
			[],
			YEAR
		);

		assert.equal(patterns.ratingHabits.mostUsedRating, 4.5);
		assert.equal(patterns.ratingHabits.fives, 0);
	});
});
