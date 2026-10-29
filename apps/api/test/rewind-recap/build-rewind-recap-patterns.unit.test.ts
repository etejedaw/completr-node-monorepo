import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildRewindRecapPatterns,
	daysToFinish,
	ratingVsCritics
} from "../../src/rewind-recap/utils/build-rewind-recap-patterns.util";
import { buildRun, finishedRun } from "../rewind/rewind-run.builder";
import { genreOf } from "./rewind-recap.fixtures";

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
