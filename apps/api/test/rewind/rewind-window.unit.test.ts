import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRewindYearOpen } from "../../src/rewind/utils/is-rewind-year-open.util";
import { resolveSpotlightYear } from "../../src/rewind/utils/resolve-spotlight-year.util";
import { calendarOn, editionOf } from "./rewind-run.builder";

function utc(date: string) {
	return new Date(`${date}T00:00:00.000Z`);
}

function utcEndOfDay(date: string) {
	return new Date(`${date}T23:59:59.999Z`);
}

function spotlightOn(today: Date) {
	return resolveSpotlightYear(calendarOn(today));
}

void describe("resolveSpotlightYear", () => {
	void it("is closed on November 30, even at the last millisecond", () => {
		assert.equal(spotlightOn(utc("2026-11-30")), null);
		assert.equal(spotlightOn(utcEndOfDay("2026-11-30")), null);
	});

	void it("opens the edition year on its opening day", () => {
		assert.equal(spotlightOn(utc("2026-12-01")), 2026);
		assert.equal(spotlightOn(utcEndOfDay("2026-12-31")), 2026);
	});

	void it("keeps the edition in the spotlight until its closing day ends", () => {
		assert.equal(spotlightOn(utc("2027-01-01")), 2026);
		assert.equal(spotlightOn(utcEndOfDay("2027-01-31")), 2026);
	});

	void it("closes the spotlight the day after the edition closes", () => {
		assert.equal(spotlightOn(utc("2027-02-01")), null);
	});

	void it("reads the date in UTC, not in the server time zone", () => {
		const edition = editionOf(2026);
		const at = (date: string) =>
			resolveSpotlightYear(calendarOn(new Date(date), 2000, edition));
		assert.equal(at("2026-12-01T02:00:00-03:00"), 2026);
		assert.equal(at("2026-11-30T22:00:00-03:00"), 2026);
		assert.equal(at("2026-11-30T20:59:59-03:00"), null);
		assert.equal(at("2027-01-31T20:59:59-03:00"), 2026);
		assert.equal(at("2027-01-31T21:00:00-03:00"), null);
	});

	void it("follows the dates of the edition instead of the calendar month", () => {
		const early = editionOf(2026, {
			opensAt: "2026-11-15",
			closesAt: "2026-12-20",
			graceStartsAt: "2026-12-15",
			graceEndsAt: "2026-12-20"
		});
		const on = (date: string) =>
			resolveSpotlightYear(calendarOn(utc(date), 2000, early));
		assert.equal(on("2026-11-14"), null);
		assert.equal(on("2026-11-15"), 2026);
		assert.equal(on("2026-12-20"), 2026);
		assert.equal(on("2026-12-21"), null);
	});

	void it("is closed without any edition", () => {
		assert.equal(
			resolveSpotlightYear(calendarOn(utc("2026-12-15"), 2000, null)),
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

	void it("opens the current year when its edition opens, not on a fixed month", () => {
		const early = editionOf(2026, { opensAt: "2026-11-20" });
		assert.equal(
			isRewindYearOpen(2026, calendarOn(utc("2026-11-19"), 2000, null)),
			false
		);
		assert.equal(
			isRewindYearOpen(2026, calendarOn(utc("2026-11-20"), 2000, early)),
			true
		);
	});

	void it("keeps the current year closed in December when no edition opened it", () => {
		assert.equal(
			isRewindYearOpen(2026, calendarOn(utc("2026-12-15"), 2000, null)),
			false
		);
		assert.equal(
			isRewindYearOpen(
				2026,
				calendarOn(utc("2026-12-15"), 2000, editionOf(2025))
			),
			false
		);
		assert.equal(
			isRewindYearOpen(2025, calendarOn(utc("2026-12-15"), 2000, null)),
			true
		);
	});
});
