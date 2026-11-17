import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";

import {
	type RewindCriticGap,
	type RewindLanguage,
	type RewindPremiumAccessKind,
	type RewindPremiumStats
} from "../../../../../core/models/rewind.model";
import { ToastService } from "../../../../../core/services/toast";
import {
	hasRewind2025PremiumCharts,
	rewind2025CriticGapRows,
	rewind2025GenreRows,
	rewind2025HoursBars,
	Rewind2025PremiumStats
} from "./rewind-2025-premium-stats";

function critic(
	title: string,
	gap: number,
	overrides: Partial<RewindCriticGap> = {}
): RewindCriticGap {
	return {
		gameId: `id-${title}`,
		code: title.toLowerCase(),
		title,
		coverUrl: null,
		backgroundUrl: null,
		userRating: 4.5,
		criticScore: 4,
		gap,
		...overrides
	};
}

function stats(
	overrides: Partial<RewindPremiumStats> = {}
): RewindPremiumStats {
	return {
		hoursByMonth: [
			{ month: 1, hours: 10 },
			{ month: 3, hours: 40.5 },
			{ month: 12, hours: 20 }
		],
		tasteVsCritics: [
			critic("Hades", 1.5),
			critic("Starfield", -2),
			critic("Celeste", 0)
		],
		backlogFlow: [
			{ month: 1, added: 5, finished: 2 },
			{ month: 2, added: 1, finished: 3 }
		],
		genreShare: [
			{ code: "roguelike", name: "Roguelike", count: 6 },
			{ code: "platformer", name: "Platformer", count: 2 }
		],
		...overrides
	};
}

const EMPTY_STATS: RewindPremiumStats = {
	hoursByMonth: [],
	tasteVsCritics: [],
	backlogFlow: [],
	genreShare: []
};

async function renderStats(
	data: RewindPremiumStats = stats(),
	language: RewindLanguage = "en",
	premiumAccessKind: RewindPremiumAccessKind | null = "premium"
) {
	return render(Rewind2025PremiumStats, {
		inputs: {
			stats: data,
			language,
			premiumAccessKind
		},
		providers: [{ provide: ToastService, useValue: { premium: vi.fn() } }]
	});
}

function figure(name: string) {
	return screen.getByRole("figure", { name });
}

describe("Rewind2025PremiumStats", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: true }))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows three charts in a gold Premium frame with the hours one across the full width", async () => {
		await renderStats();

		const section = screen.getByRole("region", { name: "Premium stats" });
		expect(section.className).toContain("border-premium");
		expect(within(section).getByLabelText("Premium")).toBeInTheDocument();
		const figures = within(section).getAllByRole("figure");
		expect(figures).toEqual([
			figure("Your year's rhythm"),
			figure("You vs. the critics"),
			figure("Genre share")
		]);
		expect(figures[0].className).toContain("lg:col-span-2");
		expect(figures[1].className).not.toContain("lg:col-span-2");
		expect(figures[2].className).not.toContain("lg:col-span-2");
	});

	it("never draws the backlog chart even when the stats carry backlog data", async () => {
		const { container } = await renderStats(
			stats({ backlogFlow: [{ month: 5, added: 30, finished: 1 }] })
		);

		expect(
			screen.queryByRole("figure", { name: /backlog/i })
		).not.toBeInTheDocument();
		expect(
			container.querySelector("[data-chart='backlog-flow']")
		).toBeNull();
		expect(screen.queryByText(/net balance/i)).not.toBeInTheDocument();
	});

	it("shows nothing when the backlog is the only thing with data", async () => {
		const { fixture } = await renderStats({
			...EMPTY_STATS,
			backlogFlow: [{ month: 3, added: 4, finished: 1 }]
		});

		expect(screen.queryByRole("region")).not.toBeInTheDocument();
		expect((fixture.nativeElement as HTMLElement).children).toHaveLength(0);
	});

	it("follows stats that change many times in a row and lands on the last ones", async () => {
		const { rerender } = await renderStats();

		for (const next of [
			EMPTY_STATS,
			stats({ tasteVsCritics: [] }),
			{
				...EMPTY_STATS,
				backlogFlow: [{ month: 1, added: 1, finished: 0 }]
			},
			stats({ hoursByMonth: [], genreShare: [] })
		]) {
			await rerender({ inputs: { stats: next }, partialUpdate: true });
		}

		expect(screen.getAllByRole("figure")).toEqual([
			figure("You vs. the critics")
		]);
	});

	it("labels stats generated with a gift as Gift", async () => {
		await renderStats(stats(), "en", "gift");

		expect(screen.getByLabelText("Gift")).toBeInTheDocument();
		expect(screen.queryByLabelText("Premium")).toBeNull();
	});

	it("labels Spanish stats generated with a gift as Regalo", async () => {
		await renderStats(stats(), "es", "gift");

		expect(screen.getByLabelText("Regalo")).toBeInTheDocument();
		expect(screen.queryByLabelText("Premium")).toBeNull();
	});

	it("shows the charts without a badge when the Rewind does not say how they were generated", async () => {
		await renderStats(stats(), "en", null);

		const section = screen.getByRole("region", { name: "Premium stats" });
		expect(within(section).getAllByRole("figure")).toHaveLength(3);
		expect(within(section).queryByLabelText("Premium")).toBeNull();
		expect(within(section).queryByLabelText("Gift")).toBeNull();
	});

	it("gives screen readers a table for every chart and hides the drawing", async () => {
		await renderStats();

		const hours = figure("Your year's rhythm");
		const table = within(hours).getByRole("table", {
			name: "Your year's rhythm"
		});
		expect(within(table).getAllByRole("row")).toHaveLength(13);
		expect(
			within(table).getByRole("rowheader", { name: "March" })
		).toBeInTheDocument();
		expect(within(table).getByText("40.5 h")).toBeInTheDocument();
		expect(
			hours.querySelector("[data-chart='hours-by-month']")
		).toHaveAttribute("aria-hidden", "true");

		const critics = within(figure("You vs. the critics")).getByRole(
			"table"
		);
		expect(
			within(critics).getByText("+1.5, You liked it more")
		).toBeInTheDocument();
		expect(
			within(critics).getByText("-2, You liked it less")
		).toBeInTheDocument();
		expect(
			within(critics).getByText("0, Same as the critics")
		).toBeInTheDocument();
	});

	it("draws positive gaps right of the line, negative ones left and a dot for a tie", async () => {
		await renderStats();

		const rows = [
			...figure("You vs. the critics").querySelectorAll<HTMLElement>(
				"[data-chart='taste-vs-critics'] > li"
			)
		];
		expect(rows.map(row => row.dataset["direction"])).toEqual([
			"more",
			"less",
			"same"
		]);
		expect(rows[0].querySelector(".left-1\\/2.bg-brand")).not.toBeNull();
		expect(
			rows[1].querySelector(".right-1\\/2.bg-nav-shelf")
		).not.toBeNull();
		expect(rows[2].querySelector(".rounded-full")).not.toBeNull();
	});

	it("hides each chart that has nothing to show", async () => {
		await renderStats(
			stats({
				hoursByMonth: [{ month: 2, hours: 0 }],
				genreShare: [{ code: "rpg", name: "RPG", count: 0 }]
			})
		);

		expect(screen.getAllByRole("figure")).toHaveLength(1);
		expect(figure("You vs. the critics")).toBeInTheDocument();
	});

	it("does not render the section at all when every chart is empty", async () => {
		const { fixture } = await renderStats(EMPTY_STATS);

		expect(screen.queryByRole("region")).not.toBeInTheDocument();
		expect((fixture.nativeElement as HTMLElement).children).toHaveLength(0);
	});

	it("works with a single month and a single game", async () => {
		await renderStats(
			stats({
				hoursByMonth: [{ month: 7, hours: 3 }],
				tasteVsCritics: [critic("Hades", -0.5)],
				genreShare: [{ code: "rpg", name: "RPG", count: 1 }]
			})
		);

		const hoursTable = within(figure("Your year's rhythm")).getByRole(
			"table"
		);
		expect(within(hoursTable).getByText("3 h")).toBeInTheDocument();
		expect(within(hoursTable).getAllByText("0 h")).toHaveLength(11);
		expect(
			within(figure("You vs. the critics")).getAllByRole("row")
		).toHaveLength(2);
		expect(
			within(within(figure("Genre share")).getByRole("table")).getByText(
				"100%"
			)
		).toBeInTheDocument();
	});

	it("keeps very long game and genre names inside their row", async () => {
		const longTitle = `🎮 ${"The Legend of an Extremely Long Title ".repeat(10)}`;
		await renderStats(
			stats({
				tasteVsCritics: [critic(longTitle, 3)],
				genreShare: [{ code: "x", name: longTitle, count: 1 }]
			})
		);

		const titles = screen
			.getAllByText(longTitle.trim(), { selector: "span" })
			.map(node => node.className);
		expect(titles.length).toBeGreaterThan(0);
		for (const className of titles) expect(className).toContain("truncate");
	});

	it("speaks Spanish with Spanish months and decimals", async () => {
		await renderStats(stats(), "es");

		const section = screen.getByRole("region", {
			name: "Estadísticas Premium"
		});
		const hours = within(section).getByRole("figure", {
			name: "El ritmo de tu año"
		});
		expect(
			within(hours).getByRole("rowheader", { name: "Marzo" })
		).toBeInTheDocument();
		expect(within(hours).getByText("40,5 h")).toBeInTheDocument();
		expect(within(hours).getAllByText("Mar").length).toBeGreaterThan(0);
		expect(
			within(section).queryByRole("figure", {
				name: "¿Tu backlog creció o se achicó?"
			})
		).not.toBeInTheDocument();
		expect(
			within(section).getByRole("figure", { name: "Reparto por género" })
		).toBeInTheDocument();
	});
});

describe("2025 premium stats data", () => {
	it("fills the missing months and marks the peak", () => {
		const bars = rewind2025HoursBars([
			{ month: 3, hours: 40 },
			{ month: 1, hours: 10 }
		]);

		expect(bars).toHaveLength(12);
		expect(bars[0]).toMatchObject({
			hours: 10,
			heightPercent: 25,
			isPeak: false
		});
		expect(bars[2]).toMatchObject({
			hours: 40,
			heightPercent: 100,
			isPeak: true
		});
		expect(bars[11]).toMatchObject({ hours: 0, heightPercent: 0 });
	});

	it("ignores junk numbers and months out of range", () => {
		expect(
			rewind2025HoursBars([
				{ month: 13, hours: 99 },
				{ month: 2, hours: Number.NaN },
				{ month: 4, hours: -5 }
			])
		).toEqual([]);
	});

	it("scales the gaps against the largest one in either direction", () => {
		expect(
			rewind2025CriticGapRows([
				critic("A", 2),
				critic("B", -4),
				critic("C", 0)
			]).map(row => [row.direction, row.widthPercent])
		).toEqual([
			["more", 25],
			["less", 50],
			["same", 0]
		]);
	});

	it("keeps a single tie without dividing by zero", () => {
		expect(rewind2025CriticGapRows([critic("A", 0)])).toEqual([
			expect.objectContaining({ direction: "same", widthPercent: 0 })
		]);
	});

	it("splits genres into shares of the total and drops empty ones", () => {
		expect(
			rewind2025GenreRows([
				{ code: "a", name: "A", count: 3 },
				{ code: "b", name: "B", count: 1 },
				{ code: "c", name: "C", count: 0 }
			]).map(row => [row.code, row.sharePercent, row.widthPercent])
		).toEqual([
			["a", 75, 100],
			["b", 25, expect.closeTo(33.33, 2)]
		]);
	});

	it("knows when there is no chart to show", () => {
		expect(hasRewind2025PremiumCharts(EMPTY_STATS)).toBe(false);
		expect(hasRewind2025PremiumCharts(stats())).toBe(true);
		expect(
			hasRewind2025PremiumCharts({
				...EMPTY_STATS,
				backlogFlow: [{ month: 1, added: 3, finished: 2 }]
			})
		).toBe(false);
	});

	it.each([
		[
			"en",
			"Premium perk",
			"These charts show the year in more detail: hours by month, ratings against the critics and genres."
		],
		[
			"es",
			"Premium perk",
			"These charts show the year in more detail: hours by month, ratings against the critics and genres."
		]
	] as const)(
		"explains the Premium perk in English even on a %s Rewind, once per press",
		async (language, title, message) => {
			const view = await renderStats(stats(), language);
			const toast = view.fixture.debugElement.injector.get(ToastService);

			const badge = screen.getByRole("button", { name: "Premium" });
			badge.click();
			badge.click();

			expect(toast.premium).toHaveBeenCalledTimes(2);
			expect(toast.premium).toHaveBeenCalledWith(title, message);
		}
	);
	describe("genre share with many genres", () => {
		const manyGenres = (count: number) =>
			Array.from({ length: count }, (_, index) => ({
				code: `genre-${index + 1}`,
				name: `Genre ${index + 1}`,
				count: count - index
			}));

		it("shows every genre when there are at most eight", () => {
			const rows = rewind2025GenreRows(manyGenres(8));

			expect(rows).toHaveLength(8);
			expect(rows.some(row => row.isOthers)).toBe(false);
		});

		it("keeps the top seven and folds the rest into one row that adds up", () => {
			const genres = manyGenres(15);
			const rows = rewind2025GenreRows(
				genres,
				count => `${count} more genres`
			);
			const total = genres.reduce((sum, genre) => sum + genre.count, 0);
			const others = rows.at(-1);

			expect(rows).toHaveLength(8);
			expect(rows.slice(0, 7).map(row => row.name)).toEqual(
				genres.slice(0, 7).map(genre => genre.name)
			);
			expect(others?.isOthers).toBe(true);
			expect(others?.name).toBe("8 more genres");
			expect(others?.count).toBe(
				genres.slice(7).reduce((sum, genre) => sum + genre.count, 0)
			);
			expect(
				rows.reduce((sum, row) => sum + row.sharePercent, 0)
			).toBeCloseTo(100);
			expect(Math.max(...rows.map(row => row.widthPercent))).toBe(100);
			expect(total).toBeGreaterThan(0);
		});

		it("labels the grouped row in Spanish and paints it neutral", async () => {
			await renderStats(stats({ genreShare: manyGenres(12) }), "es");

			const chart = document.querySelector("[data-chart='genre-share']");
			const rows = chart?.querySelectorAll("li") ?? [];
			expect(rows).toHaveLength(8);
			const others = rows[rows.length - 1];
			expect(others).toHaveTextContent("5 géneros más");
			expect(others?.querySelector(".bg-fg-muted")).not.toBeNull();
			expect(others?.querySelector(".bg-nav-sagas")).toBeNull();
		});
	});
});
