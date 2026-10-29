import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindOwner } from "../../src/rewind/rewind.interface";
import {
	type ClosedRewindRun,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";
import { buildRewind } from "../../src/rewind/utils/build-rewind.util";
import { calculateRewindYearMix } from "../../src/rewind/utils/calculate-rewind-year-mix.util";
import {
	calendarOn,
	finishedRun,
	ownerVisibility,
	storedView
} from "./rewind-run.builder";

const YEAR = 2025;

const OWNER: RewindOwner = {
	username: "ana",
	name: "Ana",
	avatarUrl: null,
	role: "user"
};

let gameSequence = 0;

function finishedWith(overrides: Partial<RewindRun>): ClosedRewindRun {
	gameSequence += 1;
	return finishedRun(
		`game-${gameSequence}`,
		"2025-05-10",
		overrides
	) as ClosedRewindRun;
}

function withRealHours(...hours: (number | null)[]): ClosedRewindRun[] {
	return hours.map(realDuration => finishedWith({ realDuration }));
}

function releasedIn(...years: (number | null)[]): ClosedRewindRun[] {
	return years.map(releaseYear => finishedWith({ releaseYear }));
}

function lengthCounts(runs: ClosedRewindRun[]): number[] {
	return calculateRewindYearMix(runs, YEAR).lengthMix.map(
		bucket => bucket.count
	);
}

void describe("calculateRewindYearMix", () => {
	void describe("lengthMix", () => {
		void it("always returns the four ranges in order, even without games", () => {
			const mix = calculateRewindYearMix([], YEAR);

			assert.deepEqual(mix.lengthMix, [
				{ range: "under-5", count: 0 },
				{ range: "5-15", count: 0 },
				{ range: "15-30", count: 0 },
				{ range: "over-30", count: 0 }
			]);
			assert.deepEqual(mix.releaseDecades, []);
			assert.equal(mix.gamesWithoutHours, 0);
			assert.equal(mix.gamesWithoutRelease, 0);
		});

		void it("puts each upper edge in the next range", () => {
			assert.deepEqual(lengthCounts(withRealHours(4.9, 5)), [1, 1, 0, 0]);
			assert.deepEqual(
				lengthCounts(withRealHours(14.9, 15)),
				[0, 1, 1, 0]
			);
			assert.deepEqual(
				lengthCounts(withRealHours(29.9, 30)),
				[0, 0, 1, 1]
			);
		});

		void it("puts tiny and huge runs in the outer ranges", () => {
			assert.deepEqual(
				lengthCounts(withRealHours(0.1, 900)),
				[1, 0, 0, 1]
			);
		});

		void it("leaves out zero, negative and missing hours and counts them apart", () => {
			const runs = withRealHours(0, -3, null, 8);
			const mix = calculateRewindYearMix(runs, YEAR);

			assert.deepEqual(
				mix.lengthMix.map(bucket => bucket.count),
				[0, 1, 0, 0]
			);
			assert.equal(mix.gamesWithoutHours, 3);
		});

		void it("uses the estimate only when there are no real hours", () => {
			const runs = [
				finishedWith({ realDuration: null, duration: 40 }),
				finishedWith({ realDuration: 0, duration: 3 }),
				finishedWith({ realDuration: 20, duration: 2 }),
				finishedWith({ realDuration: -1, duration: -1 })
			];
			const mix = calculateRewindYearMix(runs, YEAR);

			assert.deepEqual(
				mix.lengthMix.map(bucket => bucket.count),
				[1, 0, 1, 1]
			);
			assert.equal(mix.gamesWithoutHours, 1);
		});
	});

	void describe("releaseDecades", () => {
		void it("splits the decades at the year ending in zero", () => {
			const mix = calculateRewindYearMix(
				releasedIn(1989, 1990, 2009, 2010),
				YEAR
			);

			assert.deepEqual(mix.releaseDecades, [
				{ decade: 1980, count: 1 },
				{ decade: 1990, count: 1 },
				{ decade: 2000, count: 1 },
				{ decade: 2010, count: 1 }
			]);
		});

		void it("orders the decades oldest first and skips empty ones", () => {
			const mix = calculateRewindYearMix(
				releasedIn(2021, 1994, 2023, 1998, 2025),
				YEAR
			);

			assert.deepEqual(mix.releaseDecades, [
				{ decade: 1990, count: 2 },
				{ decade: 2020, count: 3 }
			]);
		});

		void it("leaves out missing, future and absurd release years", () => {
			const mix = calculateRewindYearMix(
				releasedIn(null, YEAR + 1, 9999, 1949, 0, -500, YEAR, 1950),
				YEAR
			);

			assert.deepEqual(mix.releaseDecades, [
				{ decade: 1950, count: 1 },
				{ decade: 2020, count: 1 }
			]);
			assert.equal(mix.gamesWithoutRelease, 6);
		});
	});
});

void describe("buildRewind yearMix", () => {
	function yearMixOf(runs: RewindRun[]) {
		return buildRewind({
			year: YEAR,
			owner: OWNER,
			runs,
			genres: [],
			platinums: 0,
			calendar: calendarOn(new Date("2026-06-15T12:00:00.000Z")),
			visibility: ownerVisibility(),
			stored: storedView()
		}).yearMix;
	}

	void it("counts a replayed game once, with its latest run of the year", () => {
		const mix = yearMixOf([
			finishedRun("hades", "2025-02-01", {
				realDuration: 40,
				releaseYear: 2020
			}),
			finishedRun("hades", "2025-09-01", {
				realDuration: 3,
				releaseYear: 2020
			}),
			finishedRun("celeste", "2025-04-01", {
				realDuration: 10,
				releaseYear: 2018
			})
		]);

		assert.deepEqual(
			mix.lengthMix.map(bucket => bucket.count),
			[1, 1, 0, 0]
		);
		assert.deepEqual(mix.releaseDecades, [
			{ decade: 2010, count: 1 },
			{ decade: 2020, count: 1 }
		]);
	});

	void it("ignores abandoned runs and games finished in other years", () => {
		const mix = yearMixOf([
			finishedRun("a", "2025-03-01", {
				realDuration: 2,
				releaseYear: 1995
			}),
			finishedRun("b", "2025-03-01", {
				status: "abandoned",
				realDuration: 50,
				releaseYear: 2001
			}),
			finishedRun("c", "2024-12-31", {
				realDuration: 50,
				releaseYear: 2001
			})
		]);

		assert.deepEqual(
			mix.lengthMix.map(bucket => bucket.count),
			[1, 0, 0, 0]
		);
		assert.deepEqual(mix.releaseDecades, [{ decade: 1990, count: 1 }]);
		assert.equal(mix.gamesWithoutHours, 0);
		assert.equal(mix.gamesWithoutRelease, 0);
	});
});
