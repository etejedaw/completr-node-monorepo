import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ClosedRewindRun } from "../../src/rewind/rewind-run.interface";
import { findLongestStreak } from "../../src/rewind/utils/find-longest-streak.util";
import { finishedRun } from "./rewind-run.builder";

function finishedIn(...months: number[]): ClosedRewindRun[] {
	return months.map(
		(month, index) =>
			finishedRun(
				`game-${index}`,
				`2025-${String(month).padStart(2, "0")}-15`
			) as ClosedRewindRun
	);
}

void describe("findLongestStreak", () => {
	void it("is null without finished games", () => {
		assert.equal(findLongestStreak([]), null);
	});

	void it("is null when the longest streak is a single month", () => {
		assert.equal(findLongestStreak(finishedIn(3)), null);
		assert.equal(findLongestStreak(finishedIn(1, 3, 5, 7, 9, 11)), null);
		assert.equal(findLongestStreak(finishedIn(6, 6, 6, 6)), null);
	});

	void it("counts two consecutive months as a streak", () => {
		assert.deepEqual(findLongestStreak(finishedIn(4, 5)), {
			months: 2,
			fromMonth: 4,
			toMonth: 5
		});
	});

	void it("picks the longest streak regardless of input order", () => {
		assert.deepEqual(findLongestStreak(finishedIn(9, 1, 7, 2, 8, 3, 7)), {
			months: 3,
			fromMonth: 1,
			toMonth: 3
		});
		assert.deepEqual(findLongestStreak(finishedIn(1, 2, 5, 6, 7, 8)), {
			months: 4,
			fromMonth: 5,
			toMonth: 8
		});
	});

	void it("breaks ties by the earliest streak", () => {
		assert.deepEqual(findLongestStreak(finishedIn(10, 11, 2, 3)), {
			months: 2,
			fromMonth: 2,
			toMonth: 3
		});
	});

	void it("covers the whole year without wrapping December into January", () => {
		const everyMonth = Array.from({ length: 12 }, (_, index) => index + 1);

		assert.deepEqual(findLongestStreak(finishedIn(...everyMonth)), {
			months: 12,
			fromMonth: 1,
			toMonth: 12
		});
		assert.deepEqual(findLongestStreak(finishedIn(12, 1, 2)), {
			months: 2,
			fromMonth: 1,
			toMonth: 2
		});
	});
});
