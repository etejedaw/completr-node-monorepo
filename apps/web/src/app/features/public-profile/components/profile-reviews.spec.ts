import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { type ReviewEntry } from "../services/public-reviews.model";
import { ProfileReviews } from "./profile-reviews";

function review(id: string, title: string, content: string): ReviewEntry {
	return {
		id,
		content,
		rating: 4,
		createdAt: "2026-01-02T00:00:00.000Z",
		game: { id: `g-${id}`, code: id, title }
	};
}

describe("ProfileReviews", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});
	it("lists the reviews with the total in the see-all link", async () => {
		await render(ProfileReviews, {
			providers: [provideRouter([])],
			inputs: {
				username: "ada",
				reviews: [
					review("hades", "Hades", "Great loop"),
					review("celeste", "Celeste", "Tough but fair")
				],
				total: 12
			}
		});

		expect(
			screen.getByRole("heading", { name: "Reviews" })
		).toBeInTheDocument();
		expect(screen.getByText("Great loop")).toBeInTheDocument();
		expect(screen.getByText("Tough but fair")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "All 12" })).toHaveAttribute(
			"href",
			"/user/ada/reviews"
		);
	});

	it("renders nothing when there are no reviews", async () => {
		await render(ProfileReviews, {
			providers: [provideRouter([])],
			inputs: { username: "ada", reviews: [] }
		});

		expect(
			screen.queryByRole("heading", { name: "Reviews" })
		).not.toBeInTheDocument();
	});
});
