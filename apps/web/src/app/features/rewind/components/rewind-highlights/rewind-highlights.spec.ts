import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import {
	type RewindHighlights as RewindHighlightsData,
	type RewindTotals
} from "../../../../core/models/rewind.model";
import {
	type HighlightCell,
	type HighlightKey,
	highlightLayout,
	NARROW_COLUMNS,
	RewindHighlights,
	WIDE_COLUMNS
} from "./rewind-highlights";

const game = (code: string, title: string) => ({
	gameId: code,
	code,
	title,
	coverUrl: null,
	backgroundUrl: null,
	finishedAt: "2026-03-04T00:00:00.000Z",
	platformAbbreviation: "PS5"
});

const fullHighlights: RewindHighlightsData = {
	topRated: { ...game("florence", "Florence"), userRating: 5 },
	bestRatio: { ...game("celeste", "Celeste"), personalRatio: 4.2 },
	longest: {
		...game("elden-ring", "Elden Ring"),
		hours: 120,
		isEstimate: false
	},
	fastest: { ...game("gris", "Gris"), hours: 3.5, isEstimate: true },
	favoriteGenre: { code: "survival", name: "Survival", count: 7 },
	topPlatform: { name: "PlayStation 5", abbreviation: "PS5", count: 12 },
	busiestMonth: { month: 3, count: 5 }
};

const totals: RewindTotals = {
	finished: 18,
	abandoned: 4,
	started: 23,
	hoursPlayed: 212.5,
	platinums: null
};

describe("RewindHighlights", () => {
	async function renderHighlights(highlights: RewindHighlightsData) {
		return render(RewindHighlights, {
			inputs: { highlights, totals },
			providers: [provideRouter([])]
		});
	}

	it("shows every highlight and links the ones that name a game", async () => {
		await renderHighlights(fullHighlights);

		expect(
			screen.getByRole("link", { name: /Top rated.*Florence/ })
		).toHaveAttribute("href", "/games/florence");
		expect(screen.getByText("Rated 5 out of 5")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Best value.*Celeste/ })
		).toHaveAttribute("href", "/games/celeste");
		expect(
			screen.getByText("Highest score per hour you played")
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Longest.*Elden Ring/ })
		).toHaveAttribute("href", "/games/elden-ring");
		expect(
			screen.getByRole("link", { name: /Fastest.*3\.5.*h est\..*Gris/ })
		).toHaveAttribute("href", "/games/gris");
		expect(screen.getByText("Survival")).toBeInTheDocument();
		expect(screen.getByText("7 of 18 games")).toBeInTheDocument();
		expect(screen.getByText("PlayStation 5")).toBeInTheDocument();
		expect(screen.getByText("12 runs")).toBeInTheDocument();
		expect(screen.getByText("March")).toBeInTheDocument();
		expect(screen.getByText("5 games finished")).toBeInTheDocument();
	});

	it("omits the highlights that have no data", async () => {
		await renderHighlights({
			...fullHighlights,
			topRated: null,
			fastest: null,
			busiestMonth: null
		});

		expect(screen.queryByText("Top rated")).not.toBeInTheDocument();
		expect(screen.queryByText("Fastest")).not.toBeInTheDocument();
		expect(screen.queryByText("Busiest month")).not.toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(4);
	});

	it("uses singulars for a single run and a single game", async () => {
		await renderHighlights({
			...fullHighlights,
			topPlatform: { name: "Switch", abbreviation: "NS", count: 1 },
			busiestMonth: { month: 1, count: 1 }
		});

		expect(screen.getByText("1 run")).toBeInTheDocument();
		expect(screen.getByText("1 game finished")).toBeInTheDocument();
	});
});

const HIGHLIGHT_KEYS = Object.keys(fullHighlights) as HighlightKey[];

function highlightsWith(present: HighlightKey[]): RewindHighlightsData {
	const highlights = { ...fullHighlights };
	for (const key of HIGHLIGHT_KEYS) {
		if (!present.includes(key)) highlights[key] = null;
	}
	return highlights;
}

function everySubset(): HighlightKey[][] {
	return Array.from({ length: 2 ** HIGHLIGHT_KEYS.length }, (_, mask) =>
		HIGHLIGHT_KEYS.filter((_, bit) => mask & (1 << bit))
	);
}

interface Placement {
	columns: number;
	rows: number;
}

function packedRows(placements: Placement[], columnCount: number) {
	const grid: boolean[][] = [];
	const isFree = (row: number, column: number) => !grid[row]?.[column];
	for (const { columns, rows } of placements) {
		let placed = false;
		for (let row = 0; !placed; row++) {
			for (let column = 0; column + columns <= columnCount; column++) {
				const cells = Array.from({ length: rows * columns }, (_, i) => [
					row + Math.floor(i / columns),
					column + (i % columns)
				]);
				if (!cells.every(([r, c]) => isFree(r, c))) continue;
				for (const [r, c] of cells) {
					grid[r] ??= Array.from(
						{ length: columnCount },
						() => false
					);
					grid[r][c] = true;
				}
				placed = true;
				break;
			}
		}
	}
	return grid;
}

function holes(grid: boolean[][]): number {
	return grid.flat().filter(taken => !taken).length;
}

const wide = (cells: HighlightCell[]) =>
	cells.map(cell => ({ columns: cell.wideColumns, rows: cell.wideRows }));
const narrow = (cells: HighlightCell[]) =>
	cells.map(cell => ({ columns: cell.columns, rows: 1 }));

describe("highlightLayout", () => {
	it.each(
		everySubset().map(present => [present.join(", ") || "none", present])
	)("leaves no gaps with %s", (_, present) => {
		const cells = highlightLayout(
			highlightsWith(present as HighlightKey[])
		);

		expect(cells.map(cell => cell.key)).toEqual(present);
		expect(holes(packedRows(wide(cells), WIDE_COLUMNS))).toBe(0);
		expect(holes(packedRows(narrow(cells), NARROW_COLUMNS))).toBe(0);
	});

	it("keeps the large cards full width and pairs the small ones on mobile", () => {
		const cells = highlightLayout(fullHighlights);

		expect(cells.map(cell => [cell.key, cell.columns])).toEqual([
			["topRated", 2],
			["bestRatio", 2],
			["longest", 1],
			["fastest", 1],
			["favoriteGenre", 1],
			["topPlatform", 1],
			["busiestMonth", 2]
		]);
	});

	it("makes Top rated a 2x2 tile on desktop only when it has neighbours to fill its side", () => {
		const tall = highlightLayout(fullHighlights)[0];
		const alone = highlightLayout(
			highlightsWith(["topRated", "longest"])
		)[0];

		expect([tall.wideColumns, tall.wideRows]).toEqual([2, 2]);
		expect([alone.wideColumns, alone.wideRows]).toEqual([2, 1]);
	});
});

describe("RewindHighlights layout", () => {
	it("stretches the last card so the grid ends on a full row", async () => {
		await render(RewindHighlights, {
			inputs: {
				highlights: highlightsWith([
					"longest",
					"fastest",
					"topPlatform"
				]),
				totals
			},
			providers: [provideRouter([])]
		});

		const [, , platform] = screen.getAllByRole("listitem");

		expect(platform).toHaveClass("col-span-2", "lg:col-span-2");
	});

	it("draws every card with the same solid border", async () => {
		await render(RewindHighlights, {
			inputs: { highlights: fullHighlights, totals },
			providers: [provideRouter([])]
		});

		const month = screen.getByText("Busiest month").closest("li")!;

		expect(month).toHaveClass("border", "border-line", "bg-surface");
		expect(month).not.toHaveClass("border-dashed");
	});
});
