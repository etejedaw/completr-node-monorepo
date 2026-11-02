import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RewindYearParamsSchema } from "../../src/rewind/schemas/rewind-year-params.schema";

void describe("RewindYearParamsSchema", () => {
	void it("turns a four digit year into a number", () => {
		assert.deepEqual(
			RewindYearParamsSchema.parse({ username: "ana", year: "2025" }),
			{ username: "ana", year: 2025 }
		);
	});

	void it("accepts both ends of the supported range", () => {
		for (const year of ["2000", "2100"])
			assert.equal(
				RewindYearParamsSchema.safeParse({ username: "ana", year })
					.success,
				true
			);
	});

	void it("rejects garbage, out of range and disguised numbers", () => {
		const garbage = [
			"abc",
			"1999",
			"2101",
			"",
			"20 25",
			"2025.0",
			"-2025",
			"0x7E9",
			"2e3",
			" 2025",
			"2025abc",
			"99999999999999999999"
		];

		for (const year of garbage)
			assert.equal(
				RewindYearParamsSchema.safeParse({ username: "ana", year })
					.success,
				false,
				`year "${year}" should be rejected`
			);
	});

	void it("rejects an empty username and unknown params", () => {
		assert.equal(
			RewindYearParamsSchema.safeParse({ username: "", year: "2025" })
				.success,
			false
		);
		assert.equal(
			RewindYearParamsSchema.safeParse({
				username: "ana",
				year: "2025",
				extra: "1"
			}).success,
			false
		);
	});
});
