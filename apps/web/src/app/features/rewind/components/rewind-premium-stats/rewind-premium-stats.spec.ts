import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";

import {
	type RewindCriticGap,
	type RewindLanguage,
	type RewindPremiumStats as RewindPremiumStatsData
} from "../../../../core/models/rewind.model";
import { ToastService } from "../../../../core/services/toast";
import {
	backlogFlowBars,
	criticGapRows,
	genreShareRows,
	hasPremiumCharts,
	monthHoursBars,
	RewindPremiumStats
} from "./rewind-premium-stats";

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
	overrides: Partial<RewindPremiumStatsData> = {}
): RewindPremiumStatsData {
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

const EMPTY_STATS: RewindPremiumStatsData = {
	hoursByMonth: [],
	tasteVsCritics: [],
	backlogFlow: [],
	genreShare: []
};

async function renderStats(
	data: RewindPremiumStatsData = stats(),
	language: RewindLanguage = "en"
) {
	return render(RewindPremiumStats, {
		inputs: { stats: data, language },
		providers: [{ provide: ToastService, useValue: { premium: vi.fn() } }]
	});
}

function figure(name: string) {
	return screen.getByRole("figure", { name });
}

describe("RewindPremiumStats", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: true }))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows the four charts in a gold Premium frame", async () => {
		await renderStats();

		const section = screen.getByRole("region", { name: "Premium stats" });
		expect(section.className).toContain("border-premium");
		expect(within(section).getByLabelText("Premium")).toBeInTheDocument();
		expect(within(section).getAllByRole("figure")).toHaveLength(4);
		expect(figure("Your year's rhythm")).toBeInTheDocument();
		expect(figure("You vs. the critics")).toBeInTheDocument();
		expect(figure("Did your backlog grow or shrink?")).toBeInTheDocument();
		expect(figure("Genre share")).toBeInTheDocument();
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

	it("sums the backlog balance for the year", async () => {
		await renderStats();

		const balance = within(
			figure("Did your backlog grow or shrink?")
		).getByTestId("rewind-backlog-balance");
		expect(balance).toHaveTextContent("+1");
		expect(balance).toHaveTextContent("Your backlog grew by 1 game");
	});

	it("says the backlog shrank or stayed even", async () => {
		const { rerender } = await renderStats(
			stats({ backlogFlow: [{ month: 4, added: 1, finished: 4 }] })
		);
		expect(screen.getByTestId("rewind-backlog-balance")).toHaveTextContent(
			"Your backlog shrank by 3 games"
		);

		await rerender({
			inputs: {
				stats: stats({
					backlogFlow: [{ month: 4, added: 2, finished: 2 }]
				})
			},
			partialUpdate: true
		});
		expect(screen.getByTestId("rewind-backlog-balance")).toHaveTextContent(
			"You finished as many games as you added"
		);
	});

	it("hides each chart that has nothing to show", async () => {
		await renderStats(
			stats({
				hoursByMonth: [{ month: 2, hours: 0 }],
				backlogFlow: [{ month: 2, added: 0, finished: 0 }],
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
				backlogFlow: [{ month: 7, added: 1, finished: 0 }],
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
			within(section).getByTestId("rewind-backlog-balance")
		).toHaveTextContent("Tu backlog creció 1 juego");
		expect(
			within(section).getByRole("figure", { name: "Reparto por género" })
		).toBeInTheDocument();
	});
});

describe("premium stats data", () => {
	it("fills the missing months and marks the peak", () => {
		const bars = monthHoursBars([
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
			monthHoursBars([
				{ month: 13, hours: 99 },
				{ month: 2, hours: Number.NaN },
				{ month: 4, hours: -5 }
			])
		).toEqual([]);
	});

	it("scales the gaps against the largest one in either direction", () => {
		expect(
			criticGapRows([
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
		expect(criticGapRows([critic("A", 0)])).toEqual([
			expect.objectContaining({ direction: "same", widthPercent: 0 })
		]);
	});

	it("drops a backlog flow where nothing happened", () => {
		expect(backlogFlowBars([{ month: 1, added: 0, finished: 0 }])).toEqual(
			[]
		);
	});

	it("splits genres into shares of the total and drops empty ones", () => {
		expect(
			genreShareRows([
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
		expect(hasPremiumCharts(EMPTY_STATS)).toBe(false);
		expect(hasPremiumCharts(stats())).toBe(true);
	});
	it.each([
		[
			"en",
			"Premium perk",
			"These charts show the year in more detail: hours by month, ratings against the critics, the backlog and genres."
		],
		[
			"es",
			"Premium perk",
			"These charts show the year in more detail: hours by month, ratings against the critics, the backlog and genres."
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
});
