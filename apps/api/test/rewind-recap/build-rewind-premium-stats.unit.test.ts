import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindRun } from "../../src/rewind/rewind-run.interface";
import { type RewindGameGenre } from "../../src/rewind/rewind-run.interface";
import {
	buildRewindPremiumStats,
	REWIND_TASTE_VS_CRITICS_LIMIT
} from "../../src/rewind-recap/utils/build-rewind-premium-stats.util";
import { buildRun, finishedRun } from "../rewind/rewind-run.builder";
import { genreOf, RECAP_YEAR } from "./rewind-recap.fixtures";

function statsFor(
	runs: RewindRun[],
	genres: RewindGameGenre[] = [],
	addedByMonth: number[] = []
) {
	return buildRewindPremiumStats({
		year: RECAP_YEAR,
		runs,
		genres,
		addedByMonth
	});
}

void describe("buildRewindPremiumStats", () => {
	void it("returns 12 empty months and no games for an empty year", () => {
		const stats = statsFor([]);

		assert.equal(stats.hoursByMonth.length, 12);
		assert.deepEqual(
			stats.hoursByMonth.map(entry => entry.month),
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
		);
		assert.ok(stats.hoursByMonth.every(entry => entry.hours === 0));
		assert.deepEqual(
			stats.backlogFlow,
			Array.from({ length: 12 }, (_, index) => ({
				month: index + 1,
				added: 0,
				finished: 0
			}))
		);
		assert.deepEqual(stats.tasteVsCritics, []);
		assert.deepEqual(stats.genreShare, []);
	});

	void it("sums real or estimated hours of completed runs by finish month, rounded to a tenth", () => {
		const stats = statsFor([
			finishedRun("a", "2026-03-01", {
				realDuration: 10.04,
				duration: 99
			}),
			finishedRun("b", "2026-03-28", { duration: 5.03 }),
			finishedRun("c", "2026-03-30"),
			finishedRun("d", "2026-12-31", { realDuration: 0, duration: 2 }),
			buildRun("dropped", {
				status: "abandoned",
				finishedAt: "2026-03-05",
				realDuration: 50
			}),
			buildRun("playing", {
				status: "playing",
				startedAt: "2026-03-01",
				realDuration: 50
			}),
			finishedRun("last-year", "2025-03-01", { realDuration: 50 })
		]);

		assert.equal(stats.hoursByMonth[2]?.hours, 15.1);
		assert.equal(stats.hoursByMonth[11]?.hours, 2);
		assert.equal(
			stats.hoursByMonth.reduce((sum, entry) => sum + entry.hours, 0),
			17.1
		);
	});

	void it("counts finished runs per month and takes added counts by month index", () => {
		const added = [3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 7];
		const stats = statsFor(
			[
				finishedRun("a", "2026-01-10"),
				finishedRun("a", "2026-01-20"),
				finishedRun("b", "2026-12-01"),
				buildRun("x", { status: "abandoned", finishedAt: "2026-01-02" })
			],
			[],
			added
		);

		assert.deepEqual(stats.backlogFlow[0], {
			month: 1,
			added: 3,
			finished: 2
		});
		assert.deepEqual(stats.backlogFlow[11], {
			month: 12,
			added: 7,
			finished: 1
		});
		assert.deepEqual(stats.backlogFlow[1], {
			month: 2,
			added: 0,
			finished: 0
		});
	});

	void it("defaults missing added months to zero", () => {
		const stats = statsFor([], [], [4]);

		assert.deepEqual(
			stats.backlogFlow.map(entry => entry.added),
			[4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
		);
	});

	void it("compares ratings with critics using the latest run and skipping unrated games", () => {
		const stats = statsFor([
			finishedRun("replayed", "2026-02-01", { userRating: 1, score: 4 }),
			finishedRun("replayed", "2026-08-01", {
				userRating: 4.5,
				score: 4
			}),
			finishedRun("no-rating", "2026-03-01", { score: 4 }),
			finishedRun("no-critics", "2026-03-01", { userRating: 5 }),
			finishedRun("harsh", "2026-04-01", { userRating: 2, score: 4.36 }),
			buildRun("dropped", {
				status: "abandoned",
				finishedAt: "2026-05-01",
				userRating: 1,
				score: 5
			})
		]);

		assert.deepEqual(
			stats.tasteVsCritics.map(
				({ code, userRating, criticScore, gap }) => ({
					code,
					userRating,
					criticScore,
					gap
				})
			),
			[
				{ code: "harsh", userRating: 2, criticScore: 4.36, gap: -2.4 },
				{ code: "replayed", userRating: 4.5, criticScore: 4, gap: 0.5 }
			]
		);
		assert.deepEqual(Object.keys(stats.tasteVsCritics[0] ?? {}).sort(), [
			"backgroundUrl",
			"code",
			"coverUrl",
			"criticScore",
			"gameId",
			"gap",
			"title",
			"userRating"
		]);
	});

	void it("breaks gap ties by title and caps the list at 8", () => {
		const runs = Array.from({ length: 11 }, (_, index) =>
			finishedRun(
				`game-${String.fromCharCode(107 - index)}`,
				"2026-06-01",
				{
					userRating: 3,
					score: index < 6 ? 4 : 2
				}
			)
		);

		const stats = statsFor(runs);

		assert.equal(
			stats.tasteVsCritics.length,
			REWIND_TASTE_VS_CRITICS_LIMIT
		);
		assert.deepEqual(
			stats.tasteVsCritics.map(entry => entry.title),
			[
				"GAME-A",
				"GAME-B",
				"GAME-C",
				"GAME-D",
				"GAME-E",
				"GAME-F",
				"GAME-G",
				"GAME-H"
			]
		);
	});

	void it("shares genres of games finished in the year by count, then name", () => {
		const stats = statsFor(
			[
				finishedRun("a", "2026-01-01"),
				finishedRun("a", "2026-05-01"),
				finishedRun("b", "2026-02-01"),
				buildRun("c", { status: "abandoned", finishedAt: "2026-02-01" })
			],
			[
				genreOf("a", "rpg", "RPG"),
				genreOf("b", "rpg", "RPG"),
				genreOf("b", "action", "Action"),
				genreOf("a", "indie", "Indie"),
				genreOf("c", "horror", "Horror")
			]
		);

		assert.deepEqual(stats.genreShare, [
			{ code: "rpg", name: "RPG", count: 2 },
			{ code: "action", name: "Action", count: 1 },
			{ code: "indie", name: "Indie", count: 1 }
		]);
	});
});
