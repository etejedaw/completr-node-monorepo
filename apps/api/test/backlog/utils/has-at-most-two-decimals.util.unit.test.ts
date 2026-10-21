import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasAtMostTwoDecimals } from "../../../src/backlog/utils/has-at-most-two-decimals.util";

void describe("hasAtMostTwoDecimals", () => {
	void it("accepts integers and values with one or two decimals", () => {
		assert.equal(hasAtMostTwoDecimals(4), true);
		assert.equal(hasAtMostTwoDecimals(4.5), true);
		assert.equal(hasAtMostTwoDecimals(4.25), true);
	});

	void it("rejects values with three decimals", () => {
		assert.equal(hasAtMostTwoDecimals(4.255), false);
	});

	void it("tolerates floating point noise such as 0.1 + 0.2", () => {
		assert.equal(hasAtMostTwoDecimals(1.1 * 3), true);
		assert.equal(hasAtMostTwoDecimals(0.1 + 0.2), true);
		assert.equal(hasAtMostTwoDecimals(1.15), true);
	});
});
