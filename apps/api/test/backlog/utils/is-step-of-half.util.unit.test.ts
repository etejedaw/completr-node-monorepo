import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isStepOfHalf } from "../../../src/backlog/utils/is-step-of-half.util";

void describe("isStepOfHalf", () => {
	void it("accepts whole and half values", () => {
		for (const value of [0.5, 1, 2.5, 4, 5]) {
			assert.equal(isStepOfHalf(value), true, String(value));
		}
	});

	void it("rejects values that are not multiples of 0.5", () => {
		for (const value of [0.3, 1.25, 2.7, 4.9]) {
			assert.equal(isStepOfHalf(value), false, String(value));
		}
	});
});
