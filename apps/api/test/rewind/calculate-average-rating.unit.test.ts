import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ClosedRewindRun } from "../../src/rewind/rewind-run.interface";
import { calculateAverageRating } from "../../src/rewind/utils/calculate-average-rating.util";
import { finishedRun } from "./rewind-run.builder";

function rated(gameCode: string, userRating: number | null) {
	return finishedRun(gameCode, "2025-05-05", {
		userRating
	}) as ClosedRewindRun;
}

void describe("calculateAverageRating", () => {
	void it("is null without finished runs or without any rating", () => {
		assert.equal(calculateAverageRating([]), null);
		assert.equal(
			calculateAverageRating([rated("a", null), rated("b", null)]),
			null
		);
	});

	void it("averages only the rated runs, rounded to one decimal", () => {
		const runs = [
			rated("a", 5),
			rated("b", 4),
			rated("c", 4),
			rated("d", null)
		];

		assert.equal(calculateAverageRating(runs), 4.3);
	});

	void it("counts each finished run, including a game finished twice", () => {
		const runs = [rated("a", 5), rated("a", 2), rated("b", 2)];

		assert.equal(calculateAverageRating(runs), 3);
	});

	void it("keeps half stars and a single rating as they are", () => {
		assert.equal(calculateAverageRating([rated("a", 3.5)]), 3.5);
		assert.equal(
			calculateAverageRating([rated("a", 0.5), rated("b", 1)]),
			0.8
		);
	});
});
