import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ServiceError } from "../../../src/common/errors/service-error";
import { classifyExternalDataError } from "../../../src/games/utils/classify-external-data-error.util";
import { isMetacriticYearMismatch } from "../../../src/games/utils/is-metacritic-year-mismatch.util";
import { pickMetacriticScore } from "../../../src/games/utils/pick-metacritic-score.util";

function providerError(code: string) {
	return new ServiceError(code, { service: "Fake Provider", raw: undefined });
}

void describe("pickMetacriticScore", () => {
	void it("keeps the metascore when it beats the user score times ten", () => {
		assert.equal(pickMetacriticScore(92, 8.1), 92);
	});

	void it("keeps the user score times ten when it beats the metascore", () => {
		assert.equal(pickMetacriticScore(75, 9.1), 91);
	});

	void it("returns the shared value on a tie", () => {
		assert.equal(pickMetacriticScore(80, 8), 80);
	});

	void it("uses the only score available", () => {
		assert.equal(pickMetacriticScore(null, 7.3), 73);
		assert.equal(pickMetacriticScore(64, null), 64);
	});

	void it("accepts zero as a real score", () => {
		assert.equal(pickMetacriticScore(0, null), 0);
		assert.equal(pickMetacriticScore(null, 0), 0);
	});

	void it("rounds user scores without floating point noise", () => {
		assert.equal(pickMetacriticScore(null, 0.7), 7);
		assert.equal(pickMetacriticScore(null, 8.65), 87);
	});

	void it("returns null when neither score is available", () => {
		assert.equal(pickMetacriticScore(null, null), null);
	});

	void it("ignores scores outside their scale or not finite", () => {
		assert.equal(pickMetacriticScore(101, null), null);
		assert.equal(pickMetacriticScore(-1, 11), null);
		assert.equal(pickMetacriticScore(Number.NaN, 8), 80);
		assert.equal(pickMetacriticScore(90, Number.POSITIVE_INFINITY), 90);
	});
});

void describe("classifyExternalDataError", () => {
	void it("maps a NOT_FOUND code to not_found without error code", () => {
		assert.deepEqual(
			classifyExternalDataError(providerError("HLTB_NOT_FOUND")),
			{
				status: "not_found",
				errorCode: null
			}
		);
	});

	for (const suffix of [
		"RATE_LIMITED",
		"BLOCKED",
		"PARSE_ERROR",
		"TIMEOUT",
		"REQUEST_ERROR",
		"SOMETHING_NEW"
	]) {
		void it(`maps ${suffix} to failed keeping the code`, () => {
			assert.deepEqual(
				classifyExternalDataError(
					providerError(`METACRITIC_${suffix}`)
				),
				{ status: "failed", errorCode: `METACRITIC_${suffix}` }
			);
		});
	}

	void it("maps an error without code to failed with a null code", () => {
		assert.deepEqual(classifyExternalDataError(new Error("boom")), {
			status: "failed",
			errorCode: null
		});
		assert.deepEqual(classifyExternalDataError("garbage"), {
			status: "failed",
			errorCode: null
		});
	});
});

void describe("isMetacriticYearMismatch", () => {
	void it("tolerates one year of difference", () => {
		assert.equal(isMetacriticYearMismatch("2017-03-03", 2018), false);
		assert.equal(isMetacriticYearMismatch("2017-03-03", 2016), false);
	});

	void it("flags a gap larger than one year", () => {
		assert.equal(isMetacriticYearMismatch("2017-03-03", 2019), true);
		assert.equal(
			isMetacriticYearMismatch(new Date("2004-01-01"), 2020),
			true
		);
	});

	void it("never flags when either year is missing or unreadable", () => {
		assert.equal(isMetacriticYearMismatch(null, 2019), false);
		assert.equal(isMetacriticYearMismatch(undefined, 2019), false);
		assert.equal(isMetacriticYearMismatch("2017-03-03", null), false);
		assert.equal(isMetacriticYearMismatch("not a date", 2019), false);
	});
});
