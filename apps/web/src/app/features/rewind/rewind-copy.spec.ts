import {
	formatHours,
	monthName,
	monthRange,
	parseRewindYear,
	rewindImageFileName,
	rewindSummarySentence,
	shortDate,
	spokenMonthRange
} from "./rewind-copy";

const totals = (finished: number, abandoned: number, started: number) => ({
	finished,
	abandoned,
	started,
	hoursPlayed: 0,
	platinums: null,
	finishRate: null,
	averageRating: null,
	genresPlayed: 0,
	platformsPlayed: 0
});

describe("rewind copy", () => {
	describe("rewindSummarySentence", () => {
		it.each([
			[
				totals(18, 4, 23),
				"18 games finished, 4 left behind and 23 started."
			],
			[totals(1, 1, 1), "1 game finished, 1 left behind and 1 started."],
			[totals(5, 0, 2), "5 games finished and 2 started."],
			[totals(0, 3, 0), "3 games left behind."],
			[totals(0, 0, 23), "23 games started."],
			[totals(0, 0, 1), "1 game started."],
			[totals(0, 0, 0), "No games this year."]
		])("describes %o as %s", (value, sentence) => {
			expect(rewindSummarySentence(value)).toBe(sentence);
		});
	});

	describe("parseRewindYear", () => {
		it.each([
			["2026", 2026],
			["2000", 2000],
			["2100", 2100],
			["1999", null],
			["2101", null],
			["20x6", null],
			["2026.5", null],
			["-2026", null],
			[" 2026", null],
			["", null],
			[null, null]
		])("reads %s as %s", (raw, year) => {
			expect(parseRewindYear(raw)).toBe(year);
		});
	});

	it("names months in English and returns nothing out of range", () => {
		expect(monthName(1)).toBe("January");
		expect(monthName(12)).toBe("December");
		expect(monthName(13)).toBe("");
	});

	it("formats dates in UTC so late-night finishes keep their day", () => {
		expect(shortDate("2026-03-04T23:30:00.000Z")).toBe("Mar 4");
	});

	it("shows whole hours without decimals and keeps one decimal otherwise", () => {
		expect(formatHours(212)).toBe("212");
		expect(formatHours(212.5)).toBe("212.5");
		expect(formatHours(0)).toBe("0");
	});

	it("names the downloaded image after the user and the year", () => {
		expect(rewindImageFileName("ada", 2026)).toBe(
			"completr-rewind-ada-2026.png"
		);
	});

	it("writes a streak as a short month range and spells it out for screen readers", () => {
		expect(monthRange(3, 7)).toBe("Mar–Jul");
		expect(spokenMonthRange(3, 7)).toBe("March to July");
		expect(monthRange(11, 12)).toBe("Nov–Dec");
	});
});
