import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

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

	it("moves between months with the keyboard and ignores clicks it does not allow", async () => {
		const previous = vi.fn();
		const next = vi.fn();
		const { rerender } = await render(ProfileMonthReview, {
			providers: [provideRouter([])],
			inputs: { monthLabel: "February 2026", canGoNext: false },
			on: { previousMonth: previous, nextMonth: next }
		});
		const previousButton = screen.getByRole("button", {
			name: "Previous month"
		});
		const nextButton = screen.getByRole("button", { name: "Next month" });

		expect(nextButton).toBeDisabled();
		await userEvent.click(nextButton);
		expect(next).not.toHaveBeenCalled();

		previousButton.focus();
		await userEvent.keyboard("{Enter}");
		expect(previous).toHaveBeenCalledTimes(1);

		await rerender({
			inputs: {
				monthLabel: "January 2026",
				canGoNext: true,
				loading: true
			},
			partialUpdate: true
		});
		await userEvent.dblClick(previousButton);
		await userEvent.click(nextButton);
		expect(previous).toHaveBeenCalledTimes(1);
		expect(next).not.toHaveBeenCalled();
	});
});
