import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";

import {
	type RewindLanguage,
	type RewindYearMix as RewindYearMixData
} from "../../../../core/models/rewind.model";
import {
	hasYearMixCharts,
	lengthMixRows,
	releaseDecadeColumns,
	RewindYearMix
} from "./rewind-year-mix";

function lengthMix(
	under5: number,
	from5: number,
	from15: number,
	over30: number
): RewindYearMixData["lengthMix"] {
	return [
		{ range: "under-5", count: under5 },
		{ range: "5-15", count: from5 },
		{ range: "15-30", count: from15 },
		{ range: "over-30", count: over30 }
	];
}

function mix(overrides: Partial<RewindYearMixData> = {}): RewindYearMixData {
	return {
		lengthMix: lengthMix(2, 5, 2, 1),
		releaseDecades: [
			{ decade: 1990, count: 1 },
			{ decade: 2010, count: 6 },
			{ decade: 2020, count: 3 }
		],
		gamesWithoutHours: 0,
		gamesWithoutRelease: 0,
		...overrides
	};
}

const EMPTY_MIX: RewindYearMixData = {
	lengthMix: lengthMix(0, 0, 0, 0),
	releaseDecades: [],
	gamesWithoutHours: 0,
	gamesWithoutRelease: 0
};

async function renderMix(
	data: RewindYearMixData = mix(),
	language: RewindLanguage = "en"
) {
	return render(RewindYearMix, { inputs: { mix: data, language } });
}

function figure(name: string) {
	return screen.getByRole("figure", { name });
}

function rowHeaders(table: HTMLElement) {
	return within(table)
		.getAllByRole("rowheader")
		.map(header => header.textContent?.trim());
}

describe("lengthMixRows", () => {
	it("keeps the four ranges in order with share and width", () => {
		const rows = lengthMixRows(lengthMix(2, 5, 2, 1));

		expect(rows.map(row => row.range)).toEqual([
			"under-5",
			"5-15",
			"15-30",
			"over-30"
		]);
		expect(rows.map(row => row.sharePercent)).toEqual([20, 50, 20, 10]);
		expect(rows.map(row => row.widthPercent)).toEqual([40, 100, 40, 20]);
	});

	it("fills missing ranges with zero and orders scrambled input", () => {
		const rows = lengthMixRows([
			{ range: "over-30", count: 3 },
			{ range: "under-5", count: 1 }
		]);

		expect(rows.map(row => row.count)).toEqual([1, 0, 0, 3]);
	});

	it("is empty when every range is zero or broken", () => {
		expect(lengthMixRows(lengthMix(0, 0, 0, 0))).toEqual([]);
		expect(lengthMixRows(lengthMix(-2, Number.NaN, 0, 0))).toEqual([]);
		expect(lengthMixRows([])).toEqual([]);
	});
});

describe("releaseDecadeColumns", () => {
	it("orders the decades oldest first and marks the busiest", () => {
		const columns = releaseDecadeColumns([
			{ decade: 2020, count: 3 },
			{ decade: 1990, count: 1 },
			{ decade: 2010, count: 6 }
		]);

		expect(columns.map(column => column.decade)).toEqual([
			1990, 2010, 2020
		]);
		expect(columns.map(column => column.isPeak)).toEqual([
			false,
			true,
			false
		]);
		expect(columns[1].heightPercent).toBe(100);
		expect(columns[2].heightPercent).toBe(50);
	});

	it("drops empty or broken decades", () => {
		expect(
			releaseDecadeColumns([
				{ decade: 2000, count: 0 },
				{ decade: Number.NaN, count: 4 },
				{ decade: 2010, count: -1 }
			])
		).toEqual([]);
	});

	it("marks every tied decade as a peak", () => {
		const columns = releaseDecadeColumns([
			{ decade: 2000, count: 2 },
			{ decade: 2010, count: 2 }
		]);

		expect(columns.every(column => column.isPeak)).toBe(true);
	});
});

describe("hasYearMixCharts", () => {
	it("needs at least one chart with games", () => {
		expect(hasYearMixCharts(EMPTY_MIX)).toBe(false);
		expect(
			hasYearMixCharts({
				...EMPTY_MIX,
				releaseDecades: [{ decade: 2000, count: 1 }]
			})
		).toBe(true);
		expect(
			hasYearMixCharts({ ...EMPTY_MIX, lengthMix: lengthMix(0, 0, 1, 0) })
		).toBe(true);
	});
});

describe("RewindYearMix", () => {
	it("renders both charts in English with an accessible table each", async () => {
		await renderMix();

		expect(
			screen.getByRole("region", { name: "More of your year" })
		).toBeInTheDocument();
		const length = figure("How long were your games?");
		const lengthTable = within(length).getByRole("table", {
			name: "How long were your games?"
		});
		expect(rowHeaders(lengthTable)).toEqual([
			"Under 5 h",
			"5 to 15 h",
			"15 to 30 h",
			"Over 30 h"
		]);
		expect(within(lengthTable).getByText("50%")).toBeInTheDocument();
		expect(
			length.querySelector("[data-chart='game-length']")
		).toHaveAttribute("aria-hidden", "true");

		const decades = figure("Release decades");
		expect(
			within(decades).getByText("Most came from the 2010s")
		).toBeInTheDocument();
		expect(rowHeaders(within(decades).getByRole("table"))).toEqual([
			"1990s",
			"2010s",
			"2020s"
		]);
		const peaks = decades.querySelectorAll("[data-peak='true']");
		expect(peaks).toHaveLength(1);
		expect(peaks[0]).toHaveAttribute("title", "2010s: 6");
		expect(
			screen.queryByTestId("rewind-year-mix-without-hours")
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("rewind-year-mix-without-release")
		).not.toBeInTheDocument();
	});

	it("renders every text and number in Spanish", async () => {
		await renderMix(
			mix({
				lengthMix: lengthMix(1200, 0, 0, 0),
				releaseDecades: [
					{ decade: 1980, count: 1 },
					{ decade: 2000, count: 1200 }
				],
				gamesWithoutHours: 1500,
				gamesWithoutRelease: 1
			}),
			"es"
		);

		expect(
			screen.getByRole("region", { name: "Más de tu año" })
		).toBeInTheDocument();
		const length = figure("¿Cuánto duraron tus juegos?");
		expect(rowHeaders(within(length).getByRole("table"))).toEqual([
			"Menos de 5 h",
			"De 5 a 15 h",
			"De 15 a 30 h",
			"Más de 30 h"
		]);
		expect(within(length).getAllByText("1200").length).toBeGreaterThan(0);
		expect(
			screen.getByTestId("rewind-year-mix-without-hours")
		).toHaveTextContent("1500 sin horas");

		const decades = figure("Décadas de lanzamiento");
		expect(rowHeaders(within(decades).getByRole("table"))).toEqual([
			"Años 80",
			"Años 2000"
		]);
		expect(
			within(decades).getByText("La mayoría salió en los años 2000")
		).toBeInTheDocument();
		expect(
			screen.getByTestId("rewind-year-mix-without-release")
		).toHaveTextContent("1 sin fecha de lanzamiento");
		expect(screen.queryByText(/without|Most came/)).not.toBeInTheDocument();
	});

	it("renders nothing when both charts are empty", async () => {
		const { container } = await renderMix({
			...EMPTY_MIX,
			gamesWithoutHours: 3,
			gamesWithoutRelease: 3
		});

		expect(container.textContent?.trim()).toBe("");
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});

	it("shows a single decade as the highlighted one", async () => {
		await renderMix(mix({ releaseDecades: [{ decade: 2020, count: 4 }] }));

		const decades = figure("Release decades");
		expect(decades.querySelectorAll("[data-peak]")).toHaveLength(1);
		expect(
			within(decades).getByText("Most came from the 2020s")
		).toBeInTheDocument();
	});

	it("keeps every range when only one has games", async () => {
		await renderMix(mix({ lengthMix: lengthMix(0, 0, 0, 7) }));

		const length = figure("How long were your games?");
		const rows = length.querySelectorAll("[data-range]");
		expect(rows).toHaveLength(4);
		expect(within(length).getByText("100%")).toBeInTheDocument();
		expect(within(length).getAllByText("0%")).toHaveLength(3);
	});

	it("hides one chart when it has no data and keeps the other", async () => {
		await renderMix(
			mix({
				lengthMix: lengthMix(0, 0, 0, 0),
				gamesWithoutHours: 2,
				gamesWithoutRelease: 1
			})
		);

		expect(
			screen.queryByRole("figure", { name: "How long were your games?" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("rewind-year-mix-without-hours")
		).not.toBeInTheDocument();
		expect(figure("Release decades")).toBeInTheDocument();
		expect(
			screen.getByTestId("rewind-year-mix-without-release")
		).toHaveTextContent("1 without a release date");
	});

	it("falls back to the hint when two decades tie", async () => {
		await renderMix(
			mix({
				releaseDecades: [
					{ decade: 2000, count: 2 },
					{ decade: 2010, count: 2 }
				],
				gamesWithoutHours: 1
			})
		);

		const decades = figure("Release decades");
		expect(
			within(decades).getByText(
				"Finished games by the year they came out"
			)
		).toBeInTheDocument();
		expect(decades.querySelectorAll("[data-peak='true']")).toHaveLength(2);
		expect(
			screen.getByTestId("rewind-year-mix-without-hours")
		).toHaveTextContent("1 without hours");
	});
});
