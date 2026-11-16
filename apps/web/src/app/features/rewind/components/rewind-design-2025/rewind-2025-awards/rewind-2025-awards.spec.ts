import "@testing-library/jest-dom/vitest";

import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { screen } from "@testing-library/angular";

import {
	type RewindFinishedGame,
	type RewindHighlights,
	type RewindLanguage
} from "../../../../../core/models/rewind.model";
import {
	hasRewind2025Awards,
	MAX_AWARD_COLUMNS,
	Rewind2025Awards,
	rewind2025Awards,
	rewind2025Figures
} from "./rewind-2025-awards";

function game(gameId: string, title: string, finishedAt: string) {
	return {
		gameId,
		code: gameId,
		title,
		coverUrl: `https://img/${gameId}.jpg`,
		backgroundUrl: null,
		finishedAt,
		platformAbbreviation: "PC"
	} satisfies RewindFinishedGame;
}

const DEAD_SPACE = game(
	"dead-space-2",
	"Dead Space 2",
	"2025-01-11T10:00:00.000Z"
);
const HORIZON = game(
	"horizon-chase",
	"Horizon Chase Turbo",
	"2025-06-02T10:00:00.000Z"
);
const METRO = game(
	"metro-colonels",
	"Metro Exodus The Two Colonels",
	"2025-03-08T10:00:00.000Z"
);
const CELESTE = game("celeste", "Celeste", "2025-04-20T10:00:00.000Z");
const PARASITE_EVE = game(
	"parasite-eve",
	"Parasite Eve",
	"2025-12-12T10:00:00.000Z"
);
const FIREWATCH = game("firewatch", "Firewatch", "2025-12-22T10:00:00.000Z");
const ZELDA = game("zelda", "The Legend of Zelda", "2025-05-05T10:00:00.000Z");

function emptyHighlights(): RewindHighlights {
	return {
		topRated: null,
		bestRatio: null,
		longest: null,
		fastest: null,
		favoriteGenre: null,
		topPlatform: null,
		busiestMonth: null,
		firstFinished: null,
		lastFinished: null,
		topGenres: [],
		topPlatforms: [],
		longestStreak: null,
		classic: null
	};
}

function fullHighlights(
	overrides: Partial<RewindHighlights> = {}
): RewindHighlights {
	return {
		...emptyHighlights(),
		topRated: { ...ZELDA, userRating: 5 },
		bestRatio: { ...METRO, personalRatio: 39.5 },
		longest: { ...HORIZON, hours: 73.5, isEstimate: false },
		fastest: { ...METRO, hours: 2.1, isEstimate: false },
		firstFinished: DEAD_SPACE,
		lastFinished: FIREWATCH,
		classic: { ...PARASITE_EVE, releaseYear: 1998 },
		longestStreak: { months: 12, fromMonth: 1, toMonth: 12 },
		busiestMonth: { month: 9, count: 4 },
		topGenres: [
			{ code: "action", name: "Action", count: 21 },
			{ code: "adventure", name: "Adventure", count: 9 },
			{ code: "shooter", name: "Shooter", count: 5 },
			{ code: "puzzle", name: "Puzzle", count: 2 }
		],
		topPlatforms: [
			{ name: "Steam", abbreviation: "PC", count: 28 },
			{ name: "PlayStation", abbreviation: "PS", count: 1 }
		],
		...overrides
	};
}

function awardKeys(root: HTMLElement): string[] {
	return [...root.querySelectorAll("[data-award]")].map(
		award => award.getAttribute("data-award") ?? ""
	);
}

function figureKeys(root: HTMLElement): string[] {
	return [...root.querySelectorAll("[data-figure]")].map(
		figure => figure.getAttribute("data-figure") ?? ""
	);
}

function normalized(element: Element | null): string {
	return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("Rewind2025Awards", () => {
	let fixture: ComponentFixture<Rewind2025Awards>;

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
	});

	afterEach(() => vi.unstubAllGlobals());

	async function renderAwards(
		highlights: RewindHighlights,
		language: RewindLanguage = "en"
	) {
		fixture = TestBed.createComponent(Rewind2025Awards);
		fixture.componentRef.setInput("highlights", highlights);
		fixture.componentRef.setInput("language", language);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture.nativeElement as HTMLElement;
	}

	it("hands out the awards from the first to the last game of the year", async () => {
		const root = await renderAwards(
			fullHighlights({
				bestRatio: { ...CELESTE, personalRatio: 12 }
			})
		);

		expect(awardKeys(root)).toEqual([
			"firstFinished",
			"longest",
			"fastest",
			"bestRatio",
			"classic",
			"lastFinished"
		]);
		expect(
			screen
				.getAllByRole("heading", { level: 3 })
				.map(h => h.textContent?.trim())
		).toEqual([
			"Dead Space 2",
			"Horizon Chase Turbo",
			"Metro Exodus The Two Colonels",
			"Celeste",
			"Parasite Eve",
			"Firewatch"
		]);
		expect(
			normalized(root.querySelector('[data-award="bestRatio"] p'))
		).toBe("12ratio");
	});

	it("merges best value into the fastest card when it is the same game", async () => {
		const root = await renderAwards(fullHighlights());

		expect(awardKeys(root)).toEqual([
			"firstFinished",
			"longest",
			"fastestAndBestValue",
			"classic",
			"lastFinished"
		]);
		const merged = root.querySelector('[data-award="fastestAndBestValue"]');
		expect(normalized(merged?.querySelector("p") ?? null)).toBe(
			"2.1h · ratio 39.5"
		);
		expect(merged).toHaveTextContent("Fastest and best value");
		expect(
			screen.getAllByRole("link", {
				name: "Metro Exodus The Two Colonels"
			})
		).toHaveLength(1);
	});

	it("never repeats the cover of the year among the awards", async () => {
		const root = await renderAwards(fullHighlights());

		expect(root).not.toHaveTextContent("The Legend of Zelda");
		expect(root).not.toHaveTextContent("Top rated");
	});

	it("skips the awards and figures that came back empty", async () => {
		const root = await renderAwards({
			...emptyHighlights(),
			topRated: { ...ZELDA, userRating: 5 },
			longest: { ...HORIZON, hours: 40, isEstimate: true },
			busiestMonth: { month: 3, count: 1 },
			topPlatforms: [{ name: "Switch", abbreviation: "NS", count: 3 }]
		});

		expect(awardKeys(root)).toEqual(["longest"]);
		expect(normalized(root.querySelector('[data-award="longest"] p'))).toBe(
			"40h est."
		);
		expect(figureKeys(root)).toEqual(["busiestMonth", "platform"]);
		expect(
			normalized(root.querySelector('[data-figure="platform"]'))
		).toContain("Switch");
		expect(
			normalized(root.querySelector('[data-figure="platform"]'))
		).not.toContain("·");
	});

	it("leaves out the awards row when no game won anything", async () => {
		const root = await renderAwards({
			...emptyHighlights(),
			topRated: { ...ZELDA, userRating: 5 },
			longestStreak: { months: 3, fromMonth: 2, toMonth: 4 }
		});

		expect(root.querySelector("[data-awards]")).toBeNull();
		expect(figureKeys(root)).toEqual(["longestStreak"]);
		expect(
			root.querySelector("[data-figures]")?.classList.contains("mt-8")
		).toBe(false);
	});

	it("draws nothing and reports nothing to show for a cover-only year", async () => {
		const highlights = {
			...emptyHighlights(),
			topRated: { ...ZELDA, userRating: 5 }
		};
		const root = await renderAwards(highlights);

		expect(root.querySelector("[data-awards]")).toBeNull();
		expect(root.querySelector("[data-figures]")).toBeNull();
		expect(hasRewind2025Awards(highlights)).toBe(false);
		expect(hasRewind2025Awards(emptyHighlights())).toBe(false);
		expect(hasRewind2025Awards(fullHighlights())).toBe(true);
	});

	it("does not give the same game the first and last award twice", () => {
		const awards = rewind2025Awards(
			{
				...emptyHighlights(),
				firstFinished: DEAD_SPACE,
				lastFinished: DEAD_SPACE
			},
			"en"
		);

		expect(awards.map(award => award.key)).toEqual(["firstFinished"]);
	});

	it("tells the four figures of the year in English", async () => {
		const root = await renderAwards(fullHighlights());

		expect(figureKeys(root)).toEqual([
			"longestStreak",
			"busiestMonth",
			"favoriteGenre",
			"platform"
		]);
		expect(
			normalized(root.querySelector('[data-figure="longestStreak"]'))
		).toContain("12 months");
		expect(
			normalized(root.querySelector('[data-figure="busiestMonth"]'))
		).toContain("September");
		expect(
			normalized(root.querySelector('[data-figure="favoriteGenre"]'))
		).toContain("Action · then Adventure and Shooter");
		expect(
			normalized(root.querySelector('[data-figure="favoriteGenre"]'))
		).not.toContain("Puzzle");
		expect(
			normalized(root.querySelector('[data-figure="platform"]'))
		).toContain("Steam · 1 on PlayStation");
	});

	it("speaks Spanish with Spanish numbers and dates", async () => {
		const root = await renderAwards(fullHighlights(), "es");

		expect(
			normalized(
				root.querySelector('[data-award="fastestAndBestValue"] p')
			)
		).toBe("2,1h · ratio 39,5");
		expect(
			root.querySelector('[data-award="fastestAndBestValue"]')
		).toHaveTextContent("El más corto y mejor ratio");
		expect(normalized(root.querySelector('[data-award="longest"] p'))).toBe(
			"73,5h"
		);
		expect(
			normalized(root.querySelector('[data-award="firstFinished"] p'))
		).toBe("11 ene");
		expect(normalized(root.querySelector('[data-award="classic"] p'))).toBe(
			"1998"
		);
		expect(
			normalized(root.querySelector('[data-figure="longestStreak"]'))
		).toContain("12 meses");
		expect(
			normalized(root.querySelector('[data-figure="favoriteGenre"]'))
		).toContain("Action · luego Adventure y Shooter");
		expect(
			normalized(root.querySelector('[data-figure="platform"]'))
		).toContain("Steam · 1 en PlayStation");
		expect(root).toHaveTextContent("Septiembre");
		expect(root).not.toHaveTextContent("Fastest");
	});

	it("turns the awards into a swipeable row inside narrow pages", async () => {
		const root = await renderAwards(fullHighlights());
		const row = root.querySelector<HTMLElement>("[data-awards]");

		expect(row?.className).toContain("auto-cols-[62%]");
		expect(row?.className).toContain("grid-flow-col");
		expect(row?.className).toContain("overflow-x-auto");
		expect(row?.className).toContain("@3xl/page:grid-flow-row");
		expect(row?.style.getPropertyValue("--award-columns")).toBe("5");
	});

	it("caps the wide grid at six columns", () => {
		expect(MAX_AWARD_COLUMNS).toBe(6);
	});

	it("keeps up when the highlights and language flip back and forth", async () => {
		const root = await renderAwards(fullHighlights());

		for (const language of ["es", "en", "es", "en"] as const) {
			fixture.componentRef.setInput("language", language);
			fixture.componentRef.setInput(
				"highlights",
				language === "es" ? emptyHighlights() : fullHighlights()
			);
			fixture.detectChanges();
		}
		fixture.componentRef.setInput("language", "es");
		fixture.detectChanges();
		await fixture.whenStable();

		expect(awardKeys(root)).toHaveLength(5);
		expect(root).toHaveTextContent("El primero del año");
		expect(root).not.toHaveTextContent("First of the year");
	});

	it("survives garbage counts without breaking the figures", () => {
		const figures = rewind2025Figures(
			{
				...emptyHighlights(),
				topGenres: [],
				favoriteGenre: { code: "rpg", name: "RPG", count: 0 },
				topPlatforms: [],
				topPlatform: null
			},
			"en"
		);

		expect(figures.map(figure => figure.key)).toEqual(["favoriteGenre"]);
		expect(figures[0].detail).toBe("RPG");
		expect(figures[0].unit).toBe("games");
	});

	it("links each award to its game for keyboard users", async () => {
		await renderAwards(fullHighlights());

		const link = screen.getByRole("link", { name: "Dead Space 2" });
		expect(link).toHaveAttribute("href", "/games/dead-space-2");
		expect(
			fixture.nativeElement.querySelectorAll(
				'a[tabindex="-1"][aria-hidden="true"]'
			)
		).toHaveLength(5);
	});
});
