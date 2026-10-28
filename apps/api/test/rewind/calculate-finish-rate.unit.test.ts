import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateFinishRate } from "../../src/rewind/utils/calculate-finish-rate.util";

void describe("calculateFinishRate", () => {
	void it("is null when nothing was finished or abandoned", () => {
		assert.equal(calculateFinishRate(0, 0), null);
	});

	void it("is 100 without abandoned games and 0 without finished ones", () => {
		assert.equal(calculateFinishRate(7, 0), 100);
		assert.equal(calculateFinishRate(0, 4), 0);
	});

	void it("rounds to the nearest whole percentage", () => {
		assert.equal(calculateFinishRate(2, 1), 67);
		assert.equal(calculateFinishRate(1, 2), 33);
		assert.equal(calculateFinishRate(1, 7), 13);
		assert.equal(calculateFinishRate(5, 5), 50);
	});

	void it("stays an integer between 0 and 100 for many games", () => {
		for (let finished = 0; finished <= 30; finished += 1)
			for (let abandoned = 0; abandoned <= 30; abandoned += 1) {
				const rate = calculateFinishRate(finished, abandoned);
				if (finished + abandoned === 0) continue;
				assert.ok(Number.isInteger(rate));
				assert.ok(rate! >= 0 && rate! <= 100);
			}
	});
});
