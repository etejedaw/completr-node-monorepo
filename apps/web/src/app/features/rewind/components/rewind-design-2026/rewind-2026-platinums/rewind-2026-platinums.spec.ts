import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import {
	type RewindLanguage,
	type RewindPlatinumGame
} from "../../../../../core/models/rewind.model";
import {
	platinumGridLayout,
	platinumMonthsLine,
	Rewind2026Platinums
} from "./rewind-2026-platinums";

function platinum(
	code: string,
	title: string,
	platinumedAt: string,
	art: Partial<RewindPlatinumGame> = {}
): RewindPlatinumGame {
	return {
		gameId: `id-${code}`,
		code,
		title,
		coverUrl: null,
		backgroundUrl: null,
		platinumedAt,
		platformAbbreviation: "PS5",
		...art
	};
}

const RE4 = platinum("re4", "Resident Evil 4", "2026-03-15", {
	backgroundUrl: "https://img.test/re4-bg.jpg",
	coverUrl: "https://img.test/re4.jpg"
});
const INSIDE = platinum("inside", "Inside", "2026-05-25", {
	coverUrl: "https://img.test/inside.jpg"
});
const PARTY_HARD = platinum("party-hard", "Party Hard", "2026-10-26");

function manyPlatinums(count: number): RewindPlatinumGame[] {
	return Array.from({ length: count }, (_, index) =>
		platinum(
			`game-${index + 1}`,
			`Game ${index + 1}`,
			`2026-${String((index % 12) + 1).padStart(2, "0")}-0${(index % 9) + 1}`
		)
	);
}

function spanOf(leadClass: string, prefix: "" | "lg:"): number {
	const span = new RegExp(`(?:^|\\s)${prefix}col-span-(\\d)`).exec(leadClass);
	return Number(span?.[1]);
}

describe("Rewind2026Platinums", () => {
	async function renderPlatinums(
		games: RewindPlatinumGame[],
		language: RewindLanguage = "en"
	) {
		return render(Rewind2026Platinums, {
			inputs: { games, language },
			providers: [provideRouter([])]
		});
	}

	function lead(): HTMLElement {
		const cell = document.querySelector<HTMLElement>(
			"[data-platinum-lead]"
		);
		if (!cell) throw new Error("Missing lead cell");
		return cell;
	}

	it("shows the total, its months and one linked cell per platinum, in English", async () => {
		await renderPlatinums([RE4, INSIDE, PARTY_HARD]);

		expect(within(lead()).getByText("3")).toBeInTheDocument();
		expect(
			within(lead()).getByText("Platinums this year")
		).toBeInTheDocument();
		expect(
			within(lead()).getByText("March, May and October")
		).toBeInTheDocument();
		const links = screen.getAllByRole("link");
		expect(links.map(link => link.getAttribute("aria-label"))).toEqual([
			"Resident Evil 4, platinum on Mar 15",
			"Inside, platinum on May 25",
			"Party Hard, platinum on Oct 26"
		]);
		expect(links[0]).toHaveAttribute("href", "/games/re4");
		expect(within(links[2]).getByText("Platinum")).toBeInTheDocument();
		expect(within(links[2]).getByText("Oct 26")).toBeInTheDocument();
	});

	it("speaks Spanish with the dates and months of the Rewind language", async () => {
		await renderPlatinums([RE4, INSIDE, PARTY_HARD], "es");

		expect(
			within(lead()).getByText("Platinos en el año")
		).toBeInTheDocument();
		expect(
			within(lead()).getByText("Marzo, mayo y octubre")
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Inside, platino el 25 may" })
		).toBeInTheDocument();
		expect(screen.getAllByText("Platino")).toHaveLength(3);
	});

	it("draws one platinum next to its total without leaving a hole", async () => {
		await renderPlatinums([RE4]);

		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(within(lead()).getByText("1")).toBeInTheDocument();
		expect(within(lead()).getByText("March")).toBeInTheDocument();
		expect(lead()).toHaveClass("col-span-1", "lg:col-span-1");
		expect(screen.getByRole("list")).toHaveClass("lg:grid-cols-2");
	});

	it("stretches the total over the empty slots with two platinums", async () => {
		await renderPlatinums([RE4, INSIDE]);

		expect(screen.getAllByRole("link")).toHaveLength(2);
		expect(lead()).toHaveClass("col-span-2", "lg:col-span-1");
		expect(screen.getByRole("list")).toHaveClass("lg:grid-cols-3");
	});

	it("wraps many platinums and sums the months up as a range", async () => {
		const games = manyPlatinums(14);

		await renderPlatinums(games);

		expect(screen.getAllByRole("link")).toHaveLength(14);
		expect(within(lead()).getByText("14")).toBeInTheDocument();
		expect(
			within(lead()).getByText("January to December")
		).toBeInTheDocument();
		expect(screen.getByRole("list")).toHaveClass("lg:grid-cols-4");
	});

	it("keeps the art faint and hidden from assistive tech, and leaves a cell without art plain", async () => {
		await renderPlatinums([RE4, PARTY_HARD]);

		const [withArt, withoutArt] = screen.getAllByRole("link");
		const art = withArt.querySelector("img");
		expect(art).toHaveAttribute("alt", "");
		expect(art).toHaveAttribute("aria-hidden", "true");
		expect(art?.getAttribute("src")).toContain("re4-bg.jpg");
		expect(withoutArt.querySelector("img")).toBeNull();
		expect(within(withoutArt).getByText("Party Hard")).toBeInTheDocument();
	});

	it("uses the cover as art when the game has no landscape image", async () => {
		await renderPlatinums([INSIDE]);

		expect(
			screen.getByRole("link").querySelector("img")?.getAttribute("src")
		).toContain("inside.jpg");
	});

	it("follows the list when it changes many times in a row", async () => {
		const { rerender } = await renderPlatinums([RE4]);

		for (const games of [manyPlatinums(9), [], [PARTY_HARD, RE4], [INSIDE]])
			await rerender({ inputs: { games, language: "en" } });

		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(
			screen.getByRole("link", { name: "Inside, platinum on May 25" })
		).toBeInTheDocument();
		expect(within(lead()).getByText("1")).toBeInTheDocument();
	});
});

describe("platinumGridLayout", () => {
	it.each(Array.from({ length: 24 }, (_, index) => index + 1))(
		"fills every row with %i platinums on phone and desktop",
		platinums => {
			const layout = platinumGridLayout(platinums);

			const desktopCells = spanOf(layout.leadClass, "lg:") + platinums;
			const phoneCells = spanOf(layout.leadClass, "") + platinums;

			expect(desktopCells % layout.columns).toBe(0);
			expect(phoneCells % 2).toBe(0);
			expect(layout.columns).toBeLessThanOrEqual(4);
			expect(spanOf(layout.leadClass, "lg:")).toBeLessThanOrEqual(
				layout.columns
			);
		}
	);
});

describe("platinumMonthsLine", () => {
	it("lists up to three months and sums up more as a range", () => {
		expect(platinumMonthsLine([RE4, RE4], "en")).toBe("March");
		expect(platinumMonthsLine([PARTY_HARD, RE4], "es")).toBe(
			"Marzo y octubre"
		);
		expect(platinumMonthsLine(manyPlatinums(5), "es")).toBe("Enero a mayo");
	});

	it("skips dates it cannot read instead of printing garbage", () => {
		expect(
			platinumMonthsLine(
				[platinum("bad", "Bad", "not-a-date"), INSIDE],
				"en"
			)
		).toBe("May");
		expect(
			platinumMonthsLine([platinum("bad", "Bad", "not-a-date")], "en")
		).toBe("");
	});
});
