import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import { type RewindHighlights as RewindHighlightsData } from "../../../../core/models/rewind.model";
import {
	HIGHLIGHT_ORDER,
	HIGHLIGHT_TONE,
	highlightLayout,
	highlightLayoutOf,
	NARROW_COLUMNS,
	presentHighlightKeys,
	RewindHighlights,
	WIDE_COLUMNS
} from "./rewind-highlights";
import {
	type HighlightCell,
	type HighlightKey
} from "./rewind-highlights.model";

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
	longestStreak: { months: 5, fromMonth: 3, toMonth: 7 },
	classic: { ...game("doom", "Doom", "2026-06-10"), releaseYear: 1993 }
};

describe("RewindHighlights", () => {
	async function renderHighlights(highlights: RewindHighlightsData) {
		return render(RewindHighlights, {
			inputs: { highlights },
			providers: [provideRouter([])]
		});
	}

	it("speaks Spanish with Spanish months, dates and decimals", async () => {
		await render(RewindHighlights, {
			inputs: { highlights: fullHighlights, language: "es" },
			providers: [provideRouter([])]
		});

		expect(screen.queryByText("Mejor calificado")).not.toBeInTheDocument();
		expect(screen.queryByText("Florence")).not.toBeInTheDocument();
		expect(screen.getByText("4,2")).toBeInTheDocument();
		expect(screen.getByText("3,5")).toBeInTheDocument();
		expect(screen.getByText("h aprox.")).toBeInTheDocument();
		expect(screen.getByText("Marzo")).toBeInTheDocument();
		expect(screen.getByText("5 juegos terminados")).toBeInTheDocument();
		expect(screen.getByText("Mar–Jul")).toBeInTheDocument();
		expect(screen.getByText("4 ene")).toBeInTheDocument();
		expect(
			screen.getByRole("list", { name: "Géneros favoritos" })
		).toBeInTheDocument();
		expect(screen.getByText("1 partida")).toBeInTheDocument();
		expect(screen.getByText("12 partidas")).toBeInTheDocument();
		expect(
			screen.getByRole("link", {
				name: /El más clásico.*Doom.*Lanzado en 1993/
			})
		).toHaveAttribute("href", "/games/doom");
	});

	it("shows every highlight and links the ones that name a game", async () => {
		await renderHighlights(fullHighlights);

		expect(screen.queryByText("Top rated")).not.toBeInTheDocument();
		expect(screen.queryByText("Florence")).not.toBeInTheDocument();
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
		expect(
			screen.getByRole("link", {
				name: /The classic.*Doom.*Released in 1993/
			})
		).toHaveAttribute("href", "/games/doom");
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
			fastest: null,
			busiestMonth: null,
			longestStreak: null,
			topPlatforms: [],
			classic: null
		});

		expect(screen.queryByText("Fastest")).not.toBeInTheDocument();
		expect(screen.queryByText("Busiest month")).not.toBeInTheDocument();
		expect(screen.queryByText("Longest streak")).not.toBeInTheDocument();
		expect(screen.queryByText("Platforms")).not.toBeInTheDocument();
		expect(screen.queryByText("The classic")).not.toBeInTheDocument();
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
			"var(--color-nav-lists)",
			"var(--color-nav-tags)",
			"var(--color-nav-tags)",
			"var(--color-nav-sagas)",
			"var(--color-playing)",
			"var(--color-nav-shelf)",
			"var(--color-success)",
			"var(--color-nav-queue)",
			"var(--color-platinum)",
			"var(--color-nav-sagas)"
		]);
		expect(Object.keys(HIGHLIGHT_TONE)).not.toContain("topRated");
	});
});

const HIGHLIGHT_KEYS = HIGHLIGHT_ORDER;

function highlightsWith(present: HighlightKey[]): RewindHighlightsData {
	const has = (key: HighlightKey) => present.includes(key);
	return {
		...fullHighlights,
		topRated: null,
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
		topPlatforms: has("topPlatforms") ? fullHighlights.topPlatforms : [],
		classic: has("classic") ? fullHighlights.classic : null
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
	cells.map(cell => ({ columns: cell.wideColumns, rows: 1 }));
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
			["bestRatio", 2],
			["firstFinished", 2],
			["lastFinished", 2],
			["longest", 1],
			["fastest", 1],
			["longestStreak", 1],
			["busiestMonth", 1],
			["topGenres", 2],
			["topPlatforms", 2],
			["classic", 2]
		]);
	});

	it("gives Platforms two columns on desktop and the classic the one left in their row", () => {
		const withClassic = highlightLayout(fullHighlights);
		const withoutClassic = highlightLayout({
			...fullHighlights,
			classic: null
		});
		const lastRow = (cells: HighlightCell[]) =>
			cells.slice(-3).map(cell => [cell.key, cell.wideColumns]);

		expect(lastRow(withClassic)).toEqual([
			["topGenres", 1],
			["topPlatforms", 2],
			["classic", 1]
		]);
		expect(lastRow(withoutClassic)).toEqual([
			["busiestMonth", 1],
			["topGenres", 1],
			["topPlatforms", 3]
		]);
	});

	it("stretches the classic only when no list card can take the gap", () => {
		const cells = highlightLayoutOf(["longest", "fastest", "classic"]);
		const withGenres = highlightLayoutOf([
			"longest",
			"fastest",
			"topGenres",
			"classic"
		]);

		expect(cells.map(cell => cell.wideColumns)).toEqual([1, 1, 2]);
		expect(withGenres.map(cell => cell.wideColumns)).toEqual([1, 1, 1, 1]);
		expect(
			highlightLayoutOf(["longest", "topGenres", "classic"]).map(
				cell => cell.wideColumns
			)
		).toEqual([1, 2, 1]);
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

	it("opens with Best value over two desktop columns, with or without neighbours", () => {
		const crowded = highlightLayout(fullHighlights)[0];
		const alone = highlightLayoutOf(["bestRatio", "longest"])[0];

		expect([crowded.key, crowded.wideColumns]).toEqual(["bestRatio", 2]);
		expect([alone.key, alone.wideColumns]).toEqual(["bestRatio", 2]);
	});

	it("never offers Top rated, which now has its own section", () => {
		expect(HIGHLIGHT_ORDER).not.toContain("topRated");
		expect(presentHighlightKeys(fullHighlights)).not.toContain("topRated");
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

	it("renders Platforms over two desktop columns next to the classic", async () => {
		await render(RewindHighlights, {
			inputs: { highlights: fullHighlights },
			providers: [provideRouter([])]
		});

		const platforms = screen
			.getByRole("list", { name: "Platforms" })
			.closest("li")!;
		const classic = screen.getByText("The classic").closest("li")!;

		expect(platforms).toHaveClass("col-span-2", "lg:col-span-2");
		expect(classic).toHaveClass("col-span-2", "lg:col-span-1");
	});

	it("renders Platforms over three desktop columns without the classic", async () => {
		await render(RewindHighlights, {
			inputs: { highlights: { ...fullHighlights, classic: null } },
			providers: [provideRouter([])]
		});

		const platforms = screen
			.getByRole("list", { name: "Platforms" })
			.closest("li")!;

		expect(platforms).toHaveClass("col-span-2", "lg:col-span-3");
	});

	it("shares one dark surface and keeps the tone for the accent", async () => {
		const { container } = await render(RewindHighlights, {
			inputs: { highlights: fullHighlights },
			providers: [provideRouter([])]
		});

		const month = screen.getByText("Busiest month").closest("li")!;
		const genres = screen.getByText("Top genres").closest("li")!;
		const cards = [
			...container.querySelectorAll<HTMLElement>(
				"li[data-reveal] > a, li[data-reveal].rounded-card"
			)
		];

		expect(cards).toHaveLength(HIGHLIGHT_ORDER.length);
		cards.forEach(card => {
			expect(card).toHaveClass("border-line-hover", "after:h-0.5");
			expect(card).not.toHaveClass("text-canvas");
			expect(card.className).not.toContain("var(--tone)_22%");
		});
		expect(within(month).getByText("March").className).toContain(
			"var(--tone)_80%"
		);
		expect(within(genres).getByText("1").className).toContain(
			"var(--tone)_16%"
		);
	});

	it("draws each card icon in a tone capsule hidden from screen readers", async () => {
		await render(RewindHighlights, {
			inputs: { highlights: fullHighlights },
			providers: [provideRouter([])]
		});

		const label = screen.getByText("Longest streak");
		const icon = label.querySelector(".material-icons")!;

		expect(icon).toHaveTextContent("local_fire_department");
		expect(icon).toHaveAttribute("aria-hidden", "true");
		expect(icon.className).toContain("var(--tone)_16%");
	});

	it("puts the game art behind every game card and none behind data cards", async () => {
		const withArt = (code: string) => ({
			backgroundUrl: `https://img.test/${code}-bg.jpg`,
			coverUrl: `https://img.test/${code}.jpg`
		});
		await render(RewindHighlights, {
			inputs: {
				highlights: {
					...fullHighlights,
					bestRatio: {
						...fullHighlights.bestRatio!,
						...withArt("celeste")
					},
					firstFinished: {
						...fullHighlights.firstFinished!,
						...withArt("hades")
					},
					lastFinished: {
						...fullHighlights.lastFinished!,
						coverUrl: "https://img.test/tunic.jpg"
					},
					longest: {
						...fullHighlights.longest!,
						...withArt("elden-ring")
					},
					fastest: { ...fullHighlights.fastest!, ...withArt("gris") },
					classic: { ...fullHighlights.classic!, ...withArt("doom") }
				}
			},
			providers: [provideRouter([])]
		});

		const artOf = (label: string) =>
			screen
				.getByText(label)
				.closest("li")!
				.querySelector<HTMLImageElement>("img[aria-hidden='true']")
				?.getAttribute("src");

		expect(artOf("Best value")).toBe("https://img.test/celeste-bg.jpg");
		expect(artOf("First of the year")).toBe(
			"https://img.test/hades-bg.jpg"
		);
		expect(artOf("Last of the year")).toBe("https://img.test/tunic.jpg");
		expect(artOf("Longest")).toBe("https://img.test/elden-ring-bg.jpg");
		expect(artOf("Fastest")).toBe("https://img.test/gris-bg.jpg");
		expect(artOf("The classic")).toBe("https://img.test/doom-bg.jpg");
		expect(artOf("Longest streak")).toBeUndefined();
		expect(artOf("Busiest month")).toBeUndefined();
		expect(artOf("Top genres")).toBeUndefined();
		expect(artOf("Platforms")).toBeUndefined();
	});

	it("leaves a game card on its plain surface when the game has no art", async () => {
		await render(RewindHighlights, {
			inputs: { highlights: fullHighlights },
			providers: [provideRouter([])]
		});

		const first = screen.getByText("First of the year").closest("a")!;

		expect(first.querySelector("img")).toBeNull();
		expect(first.querySelector("span.-z-10")).toBeNull();
	});
});
