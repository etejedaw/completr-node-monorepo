import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { of, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicReviewsService } from "../services/public-reviews.service";
import { UserReviews } from "./user-reviews";

const reviews = [
	{
		id: "r1",
		content: "Great loop",
		rating: 5,
		createdAt: "2026-01-02T00:00:00.000Z",
		game: { id: "g1", code: "hades", title: "Hades" }
	},
	{
		id: "r2",
		content: "Tough but fair",
		rating: 4,
		createdAt: "2026-01-03T00:00:00.000Z",
		game: null
	}
];

describe("UserReviews", () => {
	const getUserReviews = vi.fn();

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		getUserReviews.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage() {
		return render(UserReviews, {
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { paramMap: { get: () => "ada" } }
					}
				},
				{
					provide: AuthService,
					useValue: {
						token: () => null,
						user: signal(null),
						loadUser: vi.fn()
					}
				},
				{
					provide: PublicReviewsService,
					useValue: { getUserReviews }
				}
			]
		});
	}

	it("lists the reviews, including those of a deleted game", async () => {
		getUserReviews.mockReturnValue(of({ reviews, total: 2 }));
		await renderPage();

		expect(await screen.findByText("Great loop")).toBeInTheDocument();
		expect(screen.getByText("Tough but fair")).toBeInTheDocument();
		expect(getUserReviews).toHaveBeenCalledWith("ada", {
			limit: 50,
			offset: 0
		});
		expect(
			screen.getByRole("heading", { name: "Reviews" })
		).toBeInTheDocument();
	});

	it("shows the private state when the owner does not share the reviews", async () => {
		getUserReviews.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "These reviews are private"
			})
		).toBeInTheDocument();
	});

	it("shows the not-found state when the player does not exist", async () => {
		getUserReviews.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
	});

	it("shows the empty state when there are no reviews", async () => {
		getUserReviews.mockReturnValue(of({ reviews: [], total: 0 }));
		await renderPage();

		expect(await screen.findByText("No reviews yet")).toBeInTheDocument();
	});
});
