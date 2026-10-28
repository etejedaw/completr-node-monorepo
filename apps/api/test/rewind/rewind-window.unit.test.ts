import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRewindYearOpen } from "../../src/rewind/utils/is-rewind-year-open.util";
import { resolveSpotlightYear } from "../../src/rewind/utils/resolve-spotlight-year.util";
import { calendarOn } from "./rewind-run.builder";

function utc(date: string) {
	return new Date(`${date}T00:00:00.000Z`);
}

function utcEndOfDay(date: string) {
	return new Date(`${date}T23:59:59.999Z`);
}

void describe("resolveSpotlightYear", () => {
	void it("is closed on November 30, even at the last millisecond", () => {
		assert.equal(resolveSpotlightYear(utc("2026-11-30")), null);
		assert.equal(resolveSpotlightYear(utcEndOfDay("2026-11-30")), null);
	});

	void it("opens the current year on December 1", () => {
		assert.equal(resolveSpotlightYear(utc("2026-12-01")), 2026);
		assert.equal(resolveSpotlightYear(utcEndOfDay("2026-12-31")), 2026);
	});

	void it("keeps the previous year in the spotlight until January 31", () => {
		assert.equal(resolveSpotlightYear(utc("2027-01-01")), 2026);
		assert.equal(resolveSpotlightYear(utcEndOfDay("2027-01-31")), 2026);
	});

	void it("closes the spotlight on February 1", () => {
		assert.equal(resolveSpotlightYear(utc("2027-02-01")), null);
	});

	void it("reads the date in UTC, not in the server time zone", () => {
		assert.equal(
			resolveSpotlightYear(new Date("2026-12-01T02:00:00-03:00")),
			2026
		);
		assert.equal(
			resolveSpotlightYear(new Date("2026-11-30T22:00:00-03:00")),
			2026
		);
		assert.equal(
			resolveSpotlightYear(new Date("2026-11-30T20:59:59-03:00")),
			null
		);
	});
});

void describe("isRewindYearOpen", () => {
	void it("keeps the current year closed on November 30", () => {
		assert.equal(
			isRewindYearOpen(2026, calendarOn(utcEndOfDay("2026-11-30"))),
			false
		);
	});

	void it("opens the current year on December 1", () => {
		assert.equal(
			isRewindYearOpen(2026, calendarOn(utc("2026-12-01"))),
			true
		);
	});

	void it("keeps a past year open after the spotlight ends", () => {
		assert.equal(
			isRewindYearOpen(2026, calendarOn(utcEndOfDay("2027-01-31"))),
			true
		);
		assert.equal(
			isRewindYearOpen(2026, calendarOn(utc("2027-02-01"))),
			true
		);
		assert.equal(
			isRewindYearOpen(2024, calendarOn(utc("2026-06-15"))),
			true
		);
	});

	void it("never opens a future year", () => {
		assert.equal(
			isRewindYearOpen(2027, calendarOn(utc("2026-12-31"))),
			false
		);
	});

	void it("rejects years outside the supported range", () => {
		assert.equal(
			isRewindYearOpen(1999, calendarOn(utc("2026-06-15"))),
			false
		);
		assert.equal(
			isRewindYearOpen(2000, calendarOn(utc("2026-06-15"))),
			true
		);
	});

	void it("never opens a year before the owner signed up", () => {
		const signedUpIn2025 = (today: Date) => calendarOn(today, 2025);

		assert.equal(
			isRewindYearOpen(2024, signedUpIn2025(utc("2027-03-01"))),
			false
		);
		assert.equal(
			isRewindYearOpen(2025, signedUpIn2025(utc("2027-03-01"))),
			true
		);
		assert.equal(
			isRewindYearOpen(2026, signedUpIn2025(utc("2027-03-01"))),
			true
		);
		assert.equal(
			isRewindYearOpen(2027, signedUpIn2025(utc("2027-03-01"))),
			false
		);
		assert.equal(
			isRewindYearOpen(2027, signedUpIn2025(utc("2027-12-01"))),
			true
		);
	});

	void it("opens the sign-up year itself only from December 1", () => {
		const calendar = (today: Date) => calendarOn(today, 2026);

		assert.equal(
			isRewindYearOpen(2026, calendar(utcEndOfDay("2026-11-30"))),
			false
		);
		assert.equal(isRewindYearOpen(2026, calendar(utc("2026-12-01"))), true);
		assert.equal(
			isRewindYearOpen(2025, calendar(utc("2026-12-01"))),
			false
		);
	});
});
