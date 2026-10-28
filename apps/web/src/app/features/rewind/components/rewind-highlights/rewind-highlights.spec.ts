import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import {
	type RewindHighlights as RewindHighlightsData,
	type RewindTotals
} from "../../../../core/models/rewind.model";
import { RewindHighlights } from "./rewind-highlights";

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
