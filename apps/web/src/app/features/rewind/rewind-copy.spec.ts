import { REWIND_LANGUAGES } from "../../core/models/rewind.model";
import {
	formatHours,
	formatPercent,
	formatRating,
	monthName,
	monthRange,
	parseRewindYear,
	REWIND_COPY,
	rewindCopy,
	rewindImageFileName,
	rewindSummarySentence,
	shortDate,
	shortMonthName,
	spokenMonthRange
} from "./rewind-copy";

function keyPaths(value: unknown, prefix = ""): string[] {
	if (typeof value !== "object" || value === null) return [prefix];
	return Object.entries(value).flatMap(([key, child]) =>
		keyPaths(child, prefix ? `${prefix}.${key}` : key)
	);
}

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

	describe("in Spanish", () => {
		it.each([
			[
				totals(18, 4, 23),
				"18 juegos terminados, 4 abandonados y 23 empezados."
			],
			[totals(1, 1, 1), "1 juego terminado, 1 abandonado y 1 empezado."],
			[totals(5, 0, 2), "5 juegos terminados y 2 empezados."],
			[totals(0, 3, 0), "3 juegos abandonados."],
			[totals(0, 0, 1), "1 juego empezado."],
			[totals(0, 0, 0), "Ningún juego este año."]
		])("describes %o as %s", (value, sentence) => {
			expect(rewindSummarySentence(value, "es")).toBe(sentence);
		});

		it("formats decimals, percentages and ratings with the Spanish separators", () => {
			expect(formatHours(313.3, "es")).toBe("313,3");
			expect(formatHours(212, "es")).toBe("212");
			expect(formatRating(4.25, "es")).toMatch(/^4,[23]$/);
			expect(formatRating(5, "es")).toBe("5,0");
			expect(formatPercent(82, "es")).toBe("82\u00a0%");
		});

		it("names months in Spanish, capitalized when they stand alone", () => {
			expect(monthName(1, "es")).toBe("Enero");
			expect(monthName(12, "es")).toBe("Diciembre");
			expect(monthName(13, "es")).toBe("");
			expect(shortMonthName(3, "es")).toBe("Mar");
			expect(monthRange(3, 7, "es")).toBe("Mar–Jul");
			expect(spokenMonthRange(3, 7, "es")).toBe("Marzo a julio");
		});

		it("writes short dates day first and in UTC", () => {
			expect(shortDate("2026-03-04T23:30:00.000Z", "es")).toBe("4 mar");
		});
	});

	it("keeps English as the default so other screens are unchanged", () => {
		expect(formatHours(1234.5)).toBe("1,234.5");
		expect(formatPercent(82)).toBe("82%");
		expect(formatRating(3.5)).toBe("3.5");
		expect(shortMonthName(9)).toBe("Sep");
	});

	it.each([undefined, null, "fr", "__proto__"])(
		"falls back to English for an unknown language (%s)",
		language => {
			expect(rewindCopy(language as never)).toBe(REWIND_COPY.en);
		}
	);

	it("has the same keys in every language", () => {
		const english = keyPaths(REWIND_COPY.en).sort();
		for (const language of REWIND_LANGUAGES) {
			expect(keyPaths(REWIND_COPY[language]).sort()).toEqual(english);
		}
	});
});
