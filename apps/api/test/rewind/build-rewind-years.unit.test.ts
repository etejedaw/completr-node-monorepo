import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRewindYears } from "../../src/rewind/utils/build-rewind-years.util";
import { buildRun, finishedRun } from "./rewind-run.builder";

const MID_2026 = new Date("2026-06-15T12:00:00.000Z");
const DECEMBER_2026 = new Date("2026-12-01T00:00:00.000Z");
const JANUARY_2027 = new Date("2027-01-31T23:59:59.999Z");
const FEBRUARY_2027 = new Date("2027-02-01T00:00:00.000Z");

void describe("buildRewindYears", () => {
	void it("returns no years and no spotlight without runs", () => {
		assert.deepEqual(buildRewindYears([], DECEMBER_2026), {
			spotlightYear: null,
			years: []
		});
	});

	void it("lists only open years with data, newest first", () => {
		const runs = [
			finishedRun("hades", "2024-03-01"),
			buildRun("celeste", { status: "playing", startedAt: "2025-05-01" }),
			finishedRun("tunic", "2026-02-01")
		];

		const result = buildRewindYears(runs, MID_2026);

		assert.deepEqual(
			result.years.map(summary => summary.year),
			[2025, 2024]
		);
		assert.equal(result.spotlightYear, null);
	});

	void it("opens the current year and spotlights it from December 1", () => {
		const runs = [
			finishedRun("hades", "2025-03-01"),
			finishedRun("tunic", "2026-02-01")
		];

		const result = buildRewindYears(runs, DECEMBER_2026);

		assert.deepEqual(
			result.years.map(summary => summary.year),
			[2026, 2025]
		);
		assert.equal(result.spotlightYear, 2026);
	});

	void it("keeps the spotlight until January 31 and drops it on February 1", () => {
		const runs = [finishedRun("tunic", "2026-02-01")];

		assert.equal(buildRewindYears(runs, JANUARY_2027).spotlightYear, 2026);
		assert.equal(buildRewindYears(runs, FEBRUARY_2027).spotlightYear, null);
		assert.deepEqual(
			buildRewindYears(runs, FEBRUARY_2027).years.map(
				summary => summary.year
			),
			[2026]
		);
	});

	void it("leaves the spotlight empty when the window year has no data", () => {
		const runs = [finishedRun("hades", "2025-03-01")];

		const result = buildRewindYears(runs, DECEMBER_2026);

		assert.equal(result.spotlightYear, null);
		assert.deepEqual(
			result.years.map(summary => summary.year),
			[2025]
		);
	});

	void it("ignores undated runs, unfinished dates and years out of range", () => {
		const runs = [
			buildRun("undated", { status: "completed" }),
			buildRun("wishful", {
				status: "playing",
				finishedAt: "2024-01-01"
			}),
			finishedRun("ancient", "1998-05-05")
		];

		assert.deepEqual(buildRewindYears(runs, MID_2026).years, []);
	});

	void it("summarizes counts and hours per year", () => {
		const runs = [
			finishedRun("hades", "2025-03-01", {
				startedAt: "2025-01-10",
				realDuration: 20.26
			}),
			finishedRun("hades", "2025-09-01", { realDuration: 10 }),
			buildRun("celeste", {
				status: "abandoned",
				finishedAt: "2025-04-01",
				realDuration: 3.3
			}),
			buildRun("tunic", { status: "playing", startedAt: "2025-12-31" })
		];

		const [summary] = buildRewindYears(runs, MID_2026).years;

		assert.equal(summary?.finishedCount, 1);
		assert.equal(summary?.startedCount, 2);
		assert.equal(summary?.hoursPlayed, 33.6);
	});

	void it("picks up to five covers, best rated first and then most recent", () => {
		const runs = [
			finishedRun("a", "2025-01-01", { userRating: 3 }),
			finishedRun("b", "2025-02-01"),
			finishedRun("c", "2025-03-01", { userRating: 5 }),
			finishedRun("d", "2025-04-01", { userRating: 3 }),
			finishedRun("e", "2025-05-01"),
			finishedRun("f", "2025-06-01", { userRating: 4 }),
			finishedRun("g", "2025-07-01", { userRating: 1 })
		];

		const [summary] = buildRewindYears(runs, MID_2026).years;

		assert.deepEqual(
			summary?.covers.map(cover => cover.code),
			["c", "f", "d", "a", "g"]
		);
		assert.deepEqual(summary?.covers[0], {
			gameId: "id-c",
			code: "c",
			title: "C",
			coverUrl: "https://img.test/c.jpg",
			backgroundUrl: "https://img.test/c-bg.jpg"
		});
	});

	void it("shows a game finished twice once, with its latest rating", () => {
		const runs = [
			finishedRun("hades", "2025-01-01", { userRating: 5 }),
			finishedRun("hades", "2025-06-01", { userRating: 2 }),
			finishedRun("tunic", "2025-03-01", { userRating: 4 })
		];

		const [summary] = buildRewindYears(runs, MID_2026).years;

		assert.deepEqual(
			summary?.covers.map(cover => cover.code),
			["tunic", "hades"]
		);
	});
});
