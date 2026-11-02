import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ClosedRewindRun } from "../../src/rewind/rewind-run.interface";
import { calculateAverageFinishedHours } from "../../src/rewind/utils/calculate-average-finished-hours.util";
import { finishedRun } from "./rewind-run.builder";

function run(
	gameCode: string,
	realDuration: number | null,
	duration: number | null = null
) {
	return finishedRun(gameCode, "2025-05-05", {
		realDuration,
		duration
	}) as ClosedRewindRun;
}

void describe("calculateAverageFinishedHours", () => {
	void it("is null without games that have hours", () => {
		assert.equal(calculateAverageFinishedHours([]), null);
		assert.equal(
			calculateAverageFinishedHours([run("a", null), run("b", 0, 0)]),
			null
		);
	});

	void it("uses real hours and falls back to the estimate", () => {
		const runs = [run("real", 10, 99), run("estimate", 0, 30)];

		assert.equal(calculateAverageFinishedHours(runs), 20);
	});

	void it("leaves games without any hours out of the average", () => {
		const runs = [run("a", 12), run("b", null), run("c", 0, null)];

		assert.equal(calculateAverageFinishedHours(runs), 12);
	});
});
