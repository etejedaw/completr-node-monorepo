import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	type RewindCalendar,
	type RewindGameGenre,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";
import { buildRewind } from "../../src/rewind/utils/build-rewind.util";
import { buildRewindYears } from "../../src/rewind/utils/build-rewind-years.util";
import { buildRun, calendarOn, finishedRun } from "./rewind-run.builder";

const MID_2026 = new Date("2026-06-15T12:00:00.000Z");
const DECEMBER_2026 = new Date("2026-12-01T00:00:00.000Z");
const JANUARY_2027 = new Date("2027-01-31T23:59:59.999Z");
const FEBRUARY_2027 = new Date("2027-02-01T00:00:00.000Z");

function yearsOf(
	runs: RewindRun[],
	calendar: RewindCalendar,
	options: {
		genres?: RewindGameGenre[];
		platinumsByYear?: Map<number, number | null>;
	} = {}
) {
	return buildRewindYears({
		runs,
		calendar,
		genres: options.genres ?? [],
		platinumsByYear: options.platinumsByYear ?? new Map()
	});
}

void describe("buildRewindYears", () => {
	void it("returns no years and no spotlight without runs", () => {
		assert.deepEqual(yearsOf([], calendarOn(DECEMBER_2026)), {
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

		const result = yearsOf(runs, calendarOn(MID_2026));

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

		const result = yearsOf(runs, calendarOn(DECEMBER_2026));

		assert.deepEqual(
			result.years.map(summary => summary.year),
			[2026, 2025]
		);
		assert.equal(result.spotlightYear, 2026);
	});

	void it("keeps the spotlight until January 31 and drops it on February 1", () => {
		const runs = [finishedRun("tunic", "2026-02-01")];

		assert.equal(
			yearsOf(runs, calendarOn(JANUARY_2027)).spotlightYear,
			2026
		);
		assert.equal(
			yearsOf(runs, calendarOn(FEBRUARY_2027)).spotlightYear,
			null
		);
		assert.deepEqual(
			yearsOf(runs, calendarOn(FEBRUARY_2027)).years.map(
				summary => summary.year
			),
			[2026]
		);
	});

	void it("leaves the spotlight empty when the window year has no data", () => {
		const runs = [finishedRun("hades", "2025-03-01")];

		const result = yearsOf(runs, calendarOn(DECEMBER_2026));

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

		assert.deepEqual(yearsOf(runs, calendarOn(MID_2026)).years, []);
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

		const [summary] = yearsOf(runs, calendarOn(MID_2026)).years;

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

		const [summary] = yearsOf(runs, calendarOn(MID_2026)).years;

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

	void it("prefers games with cover art and skips repeated cover images", () => {
		const sharedCover = "https://img.test/shared.jpg";
		const runs = [
			finishedRun("re4", "2025-03-04", { userRating: 5 }),
			finishedRun("re4-remake", "2025-03-16", { userRating: 5 }),
			finishedRun("re2", "2025-04-01", { userRating: 4 }),
			finishedRun("metro", "2025-05-01", { userRating: 3 })
		];
		runs[0]!.game.coverUrl = sharedCover;
		runs[1]!.game.coverUrl = sharedCover;
		runs[2]!.game.coverUrl = null;

		const [summary] = yearsOf(runs, calendarOn(MID_2026)).years;

		assert.deepEqual(
			summary?.covers.map(cover => cover.code),
			["re4-remake", "metro", "re2"]
		);
	});

	void it("shows a game finished twice once, with its latest rating", () => {
		const runs = [
			finishedRun("hades", "2025-01-01", { userRating: 5 }),
			finishedRun("hades", "2025-06-01", { userRating: 2 }),
			finishedRun("tunic", "2025-03-01", { userRating: 4 })
		];

		const [summary] = yearsOf(runs, calendarOn(MID_2026)).years;

		assert.deepEqual(
			summary?.covers.map(cover => cover.code),
			["tunic", "hades"]
		);
	});

	void it("drops the years before the owner signed up", () => {
		const runs = [
			finishedRun("imported", "2023-03-01"),
			finishedRun("hades", "2025-03-01"),
			finishedRun("tunic", "2026-02-01")
		];

		const inMarch2027 = yearsOf(
			runs,
			calendarOn(new Date("2027-03-01T00:00:00.000Z"), 2025)
		);

		assert.deepEqual(
			inMarch2027.years.map(summary => summary.year),
			[2026, 2025]
		);
		assert.equal(inMarch2027.spotlightYear, null);
	});

	void it("leaves the spotlight empty when the window year is before sign-up", () => {
		const runs = [finishedRun("imported", "2026-03-01")];

		const result = yearsOf(
			runs,
			calendarOn(new Date("2027-01-15T00:00:00.000Z"), 2027)
		);

		assert.deepEqual(result, { spotlightYear: null, years: [] });
	});

	void describe("persona", () => {
		void it("gives each year its own persona with the detail rules", () => {
			const genreCodes = ["a", "b", "c", "d", "e", "f"];
			const runs = [
				...["x", "y", "z"].map(code =>
					finishedRun(code, "2024-02-02", { realDuration: 40 })
				),
				finishedRun("explorer", "2025-03-03"),
				buildRun("q1", {
					status: "abandoned",
					finishedAt: "2023-01-01"
				}),
				buildRun("q2", {
					status: "abandoned",
					finishedAt: "2023-02-01"
				}),
				buildRun("q3", {
					status: "abandoned",
					finishedAt: "2023-03-01"
				}),
				buildRun("p", { status: "playing", startedAt: "2022-04-04" })
			];
			const genres = genreCodes.map(code => ({
				gameId: "id-explorer",
				code,
				name: code
			}));

			const result = yearsOf(runs, calendarOn(MID_2026), { genres });

			assert.deepEqual(
				result.years.map(summary => [summary.year, summary.persona]),
				[
					[2025, "genre-explorer"],
					[2024, "marathoner"],
					[2023, "picky-player"],
					[2022, "steady-player"]
				]
			);
		});

		void it("uses the visible platinums of each year only", () => {
			const runs = [
				finishedRun("a", "2025-01-01"),
				finishedRun("b", "2024-01-01")
			];

			const result = yearsOf(runs, calendarOn(MID_2026), {
				platinumsByYear: new Map([
					[2025, 3],
					[2024, null]
				])
			});

			assert.deepEqual(
				result.years.map(summary => summary.persona),
				["trophy-hunter", "steady-player"]
			);
		});

		void it("matches the persona of the detail for the same data", () => {
			const runs = [
				...["a", "b", "c", "d", "e"].map(code =>
					finishedRun(code, "2025-06-06", { duration: 4 })
				)
			];

			const [summary] = yearsOf(runs, calendarOn(MID_2026)).years;
			const detail = buildRewind({
				year: 2025,
				owner: {
					username: "ana",
					name: "Ana",
					avatarUrl: null,
					role: "user"
				},
				runs,
				genres: [],
				platinums: null,
				calendar: calendarOn(MID_2026)
			});

			assert.equal(summary?.persona, "short-and-sweet");
			assert.equal(summary?.persona, detail.persona);
		});
	});
});
