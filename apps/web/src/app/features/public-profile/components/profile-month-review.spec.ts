import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { type HighlightEntry } from "../services/public-reviews.model";
import { ProfileMonthReview } from "./profile-month-review";

function entry(
	code: string,
	title: string,
	overrides: Partial<HighlightEntry> = {}
): HighlightEntry {
	return {
		id: `b-${code}`,
		status: "completed",
		game: { id: `g-${code}`, code, title },
		platform: { id: "p", abbreviation: "PC" },
		...overrides
	} as HighlightEntry;
}

describe("ProfileMonthReview", () => {
	it("shows the three highlights with the backlog names and their values", async () => {
		await render(ProfileMonthReview, {
			providers: [provideRouter([])],
			inputs: {
				monthLabel: "February 2026",
				completedCount: 3,
				longestPlayed: entry("elden-ring", "Elden Ring", {
					realDuration: 112.5
				}),
				bestPersonalRatio: entry("celeste", "Celeste", {
					personalRatio: 36.4
				}),
				highestRated: entry("hades", "Hades", { userRating: 5 })
			}
		});

		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("Longest played")).toBeInTheDocument();
		expect(screen.getByText("Best personal ratio")).toBeInTheDocument();
		expect(screen.getByText("Highest rated")).toBeInTheDocument();
		expect(screen.getByText("112.5h played")).toBeInTheDocument();
		expect(screen.getByText("36.4 ratio")).toBeInTheDocument();
		expect(screen.getByText("★ 5")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Celeste/ })).toHaveAttribute(
			"href",
			"/games/celeste"
		);
	});

	it("shows an empty card for each highlight without an entry", async () => {
		await render(ProfileMonthReview, {
			providers: [provideRouter([])],
			inputs: { monthLabel: "February 2026" }
		});

		expect(screen.getByText(/No playtime logged/)).toBeInTheDocument();
		expect(screen.getByText(/No ratio this month/)).toBeInTheDocument();
		expect(screen.getByText(/No ratings this month/)).toBeInTheDocument();
		expect(screen.queryAllByRole("link")).toHaveLength(0);
	});
});
