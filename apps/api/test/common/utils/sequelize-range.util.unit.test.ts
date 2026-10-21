import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Op } from "sequelize";

import {
	buildDateRangeWhere,
	buildRangeWhere
} from "../../../src/common/utils/sequelize-range.util";

void describe("buildRangeWhere", () => {
	void it("returns undefined when neither bound is given", () => {
		assert.equal(buildRangeWhere(undefined, undefined), undefined);
	});

	void it("builds only the lower bound when max is missing", () => {
		assert.deepEqual(buildRangeWhere(1, undefined), { [Op.gte]: 1 });
	});

	void it("builds only the upper bound when min is missing", () => {
		assert.deepEqual(buildRangeWhere(undefined, 9), { [Op.lte]: 9 });
	});

	void it("keeps zero as a valid bound", () => {
		assert.deepEqual(buildRangeWhere(0, 0), { [Op.gte]: 0, [Op.lte]: 0 });
	});
});

void describe("buildDateRangeWhere", () => {
	void it("converts ISO date strings into Date bounds", () => {
		const range = buildDateRangeWhere("2024-01-01", "2024-12-31");

		assert.deepEqual(range, {
			[Op.gte]: new Date("2024-01-01"),
			[Op.lte]: new Date("2024-12-31")
		});
	});

	void it("returns undefined when both dates are missing or empty", () => {
		assert.equal(buildDateRangeWhere(undefined, ""), undefined);
	});
});
