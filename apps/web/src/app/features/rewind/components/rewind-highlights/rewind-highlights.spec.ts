import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import { type RewindHighlights as RewindHighlightsData } from "../../../../core/models/rewind.model";
import {
	HIGHLIGHT_ORDER,
	HIGHLIGHT_TONE,
	type HighlightCell,
	type HighlightKey,
	highlightLayout,
	highlightLayoutOf,
	NARROW_COLUMNS,
	presentHighlightKeys,
	RewindHighlights,
	WIDE_COLUMNS
} from "./rewind-highlights";

const game = (code: string, title: string, finishedAt = "2026-03-04") => ({
	gameId: code,
	code,
	title,
	coverUrl: null,
	backgroundUrl: null,
	finishedAt: `${finishedAt}T00:00:00.000Z`,
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
	busiestMonth: { month: 3, count: 5 },
	firstFinished: game("hades", "Hades", "2026-01-04"),
	lastFinished: game("tunic", "Tunic", "2026-12-28"),
	topGenres: [
		{ code: "survival", name: "Survival", count: 7 },
		{ code: "platformer", name: "Platformer", count: 4 },
		{ code: "puzzle", name: "Puzzle", count: 1 }
	],
	topPlatforms: [
		{ name: "PlayStation 5", abbreviation: "PS5", count: 12 },
		{ name: "Switch", abbreviation: "NS", count: 1 }
	],
	longestStreak: { months: 5, fromMonth: 3, toMonth: 7 }
};

describe("RewindHighlights", () => {
	async function renderHighlights(highlights: RewindHighlightsData) {
		return render(RewindHighlights, {
			inputs: { highlights },
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
		expect(
			screen.getByRole("link", {
				name: /First of the year.*Hades.*Jan 4/
			})
		).toHaveAttribute("href", "/games/hades");
		expect(
			screen.getByRole("link", {
				name: /Last of the year.*Tunic.*Dec 28/
			})
		).toHaveAttribute("href", "/games/tunic");
		expect(screen.getByText("March")).toBeInTheDocument();
		expect(screen.getByText("5 games finished")).toBeInTheDocument();
	});

	it("tells the longest streak in months with its range spelled out for screen readers", async () => {
		await renderHighlights(fullHighlights);

		const streak = screen.getByText("Longest streak").closest("li")!;
		expect(streak).toHaveTextContent("5 months in a row");
		expect(within(streak).getByText("Mar–Jul")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(within(streak).getByText("March to July")).toHaveClass(
			"sr-only"
		);
	});

	it("ranks the top genres and platforms with their counts", async () => {
		await renderHighlights(fullHighlights);

		const genres = screen.getByRole("list", { name: "Top genres" });
		expect(
			within(genres)
				.getAllByRole("listitem")
				.map(item => item.textContent?.replace(/\s+/g, " ").trim())
		).toEqual([
			"1 Survival 7 games",
			"2 Platformer 4 games",
			"3 Puzzle 1 game"
		]);
		const platforms = screen.getByRole("list", { name: "Platforms" });
		expect(within(platforms).getByText("12 runs")).toBeInTheDocument();
		expect(within(platforms).getByText("1 run")).toBeInTheDocument();
	});

	it("shows a single First of the year when only one game was finished", async () => {
		const only = game("hades", "Hades");
		await renderHighlights({
			...fullHighlights,
			firstFinished: only,
			lastFinished: only
		});

		expect(screen.getByText("First of the year")).toBeInTheDocument();
		expect(screen.queryByText("Last of the year")).not.toBeInTheDocument();
	});

	it("omits the highlights that have no data", async () => {
		await renderHighlights({
			...fullHighlights,
			topRated: null,
			fastest: null,
			busiestMonth: null,
			longestStreak: null,
			topPlatforms: []
		});

		expect(screen.queryByText("Top rated")).not.toBeInTheDocument();
		expect(screen.queryByText("Fastest")).not.toBeInTheDocument();
		expect(screen.queryByText("Busiest month")).not.toBeInTheDocument();
		expect(screen.queryByText("Longest streak")).not.toBeInTheDocument();
		expect(screen.queryByText("Platforms")).not.toBeInTheDocument();
		expect(
			screen
				.getAllByRole("listitem")
				.filter(item => item.closest("ol") === null)
		).toHaveLength(5);
	});

	it("uses singulars for a single game", async () => {
		await renderHighlights({
			...fullHighlights,
			busiestMonth: { month: 1, count: 1 }
		});

		expect(screen.getByText("1 game finished")).toBeInTheDocument();
	});

	it("gives each card its identity colour", async () => {
		const { container } = await renderHighlights(fullHighlights);

		const cardTones = [
			...container.querySelectorAll<HTMLElement>("li[data-reveal]")
		].map(card => card.style.getPropertyValue("--tone"));

		expect(cardTones).toEqual([
			"var(--color-brand)",
			"var(--color-nav-lists)",
			"var(--color-nav-tags)",
			"var(--color-nav-tags)",
			"var(--color-nav-sagas)",
			"var(--color-playing)",
			"var(--color-nav-shelf)",
			"var(--color-success)",
			"var(--color-nav-queue)",
			"var(--color-platinum)"
		]);
		expect(HIGHLIGHT_TONE.topRated).toBe("brand");
	});
});

const HIGHLIGHT_KEYS = HIGHLIGHT_ORDER;

function highlightsWith(present: HighlightKey[]): RewindHighlightsData {
	const has = (key: HighlightKey) => present.includes(key);
	return {
		...fullHighlights,
		topRated: has("topRated") ? fullHighlights.topRated : null,
		bestRatio: has("bestRatio") ? fullHighlights.bestRatio : null,
		firstFinished: has("firstFinished")
			? fullHighlights.firstFinished
			: null,
		lastFinished: has("lastFinished") ? fullHighlights.lastFinished : null,
		longest: has("longest") ? fullHighlights.longest : null,
		fastest: has("fastest") ? fullHighlights.fastest : null,
		longestStreak: has("longestStreak")
			? fullHighlights.longestStreak
			: null,
		busiestMonth: has("busiestMonth") ? fullHighlights.busiestMonth : null,
		topGenres: has("topGenres") ? fullHighlights.topGenres : [],
		topPlatforms: has("topPlatforms") ? fullHighlights.topPlatforms : []
	};
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
		const cells = highlightLayoutOf(present as HighlightKey[]);

		expect(cells.map(cell => cell.key)).toEqual(present);
		expect(
			cells.every(
				cell =>
					cell.columns <= NARROW_COLUMNS &&
					cell.wideColumns <= WIDE_COLUMNS
			)
		).toBe(true);
		expect(holes(packedRows(wide(cells), WIDE_COLUMNS))).toBe(0);
		expect(holes(packedRows(narrow(cells), NARROW_COLUMNS))).toBe(0);
	});

	it("keeps the large cards full width and pairs the small ones on mobile", () => {
		const cells = highlightLayout(fullHighlights);

		expect(cells.map(cell => [cell.key, cell.columns])).toEqual([
			["topRated", 2],
			["bestRatio", 2],
			["firstFinished", 2],
			["lastFinished", 2],
			["longest", 1],
			["fastest", 1],
			["longestStreak", 1],
			["busiestMonth", 1],
			["topGenres", 2],
			["topPlatforms", 2]
		]);
	});

	it("reads which highlights are present from the API shape", () => {
		expect(presentHighlightKeys(fullHighlights)).toEqual(HIGHLIGHT_ORDER);
		expect(
			presentHighlightKeys({
				...highlightsWith([]),
				favoriteGenre: fullHighlights.favoriteGenre,
				topPlatform: fullHighlights.topPlatform
			})
		).toEqual([]);
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
					"busiestMonth"
				])
			},
			providers: [provideRouter([])]
		});

		const [, , month] = screen.getAllByRole("listitem");

		expect(month).toHaveClass("col-span-2", "lg:col-span-2");
	});

	it("draws stat cards in solid colour with canvas text and list cards tinted", async () => {
		await render(RewindHighlights, {
			inputs: { highlights: fullHighlights },
			providers: [provideRouter([])]
		});

		const month = screen.getByText("Busiest month").closest("li")!;
		const genres = screen.getByText("Top genres").closest("li")!;

		expect(month).toHaveClass("bg-(--tone)", "text-canvas");
		expect(genres).not.toHaveClass("text-canvas");
		expect(genres.className).toContain("var(--tone)_22%");
	});
});
