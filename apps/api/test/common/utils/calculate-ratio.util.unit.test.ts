/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateRatio } from "../../../src/common/utils/calculate-ratio.util";

describe("calculateRatio", () => {
	it("normalizes a 0-5 score to a 0-100 scale before dividing by duration", () => {
		assert.equal(calculateRatio(4, 20), 4);
	});

	it("rounds the ratio to two decimals", () => {
		assert.equal(calculateRatio(4.5, 7), 12.86);
	});

	it("uses the given source scale to normalize the score", () => {
		assert.equal(calculateRatio(80, 20, 100), 4);
	});

	it("returns undefined when duration is zero", () => {
		assert.equal(calculateRatio(4, 0), undefined);
	});

	it("returns undefined when score is zero", () => {
		assert.equal(calculateRatio(0, 10), undefined);
	});

	it("returns undefined when score or duration is null or undefined", () => {
		assert.equal(calculateRatio(null, 10), undefined);
		assert.equal(calculateRatio(4, null), undefined);
		assert.equal(calculateRatio(undefined, undefined), undefined);
	});
});
