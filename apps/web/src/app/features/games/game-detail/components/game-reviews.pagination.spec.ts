import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter
} from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { NEVER, of, throwError } from "rxjs";

import { AuthService } from "../../../../core/services/auth";
import {
	REVIEWS_PAGE_SIZE,
	ReviewsService
} from "../../../../core/services/reviews";
import { type Review } from "../../../../core/services/reviews.model";
import { BacklogService } from "../../../backlog/backlog";
import { GameReviews } from "./game-reviews";

const reviewOf = (id: string, userId = `user-${id}`): Review => ({
	id,
	content: `Review ${id}`,
	rating: 4,
	user: { id: userId, username: userId, name: userId },
	createdAt: "2024-05-01T00:00:00.000Z",
	updatedAt: "2024-05-01T00:00:00.000Z"
});

const fullPage = (prefix: string) =>
	Array.from({ length: REVIEWS_PAGE_SIZE }, (_, index) =>
		reviewOf(`${prefix}${index}`)
	);

describe("GameReviews pagination", () => {
	const getReviews = vi.fn();

	function renderReviews() {
		return render(GameReviews, {
			providers: [
				provideRouter([]),
				{
					provide: AuthService,
					useValue: { user: signal({ id: "me" }) }
				},
				{
					provide: BacklogService,
					useValue: { getMyBacklog: vi.fn().mockReturnValue(of({})) }
				},
				{ provide: ReviewsService, useValue: { getReviews } },
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { queryParamMap: convertToParamMap({}) }
					}
				}
			],
			inputs: { gameId: "g1" }
		});
	}

	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		getReviews.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("does not offer more reviews when the page is not full", async () => {
		getReviews.mockReturnValue(of([reviewOf("a")]));

		await renderReviews();

		expect(
			screen.queryByRole("button", { name: "Load more reviews" })
		).not.toBeInTheDocument();
	});

	it("appends the next page using the loaded count as offset", async () => {
		getReviews
			.mockReturnValueOnce(of(fullPage("a")))
			.mockReturnValueOnce(of([reviewOf("last")]));

		await renderReviews();
		await userEvent.click(
			screen.getByRole("button", { name: "Load more reviews" })
		);

		expect(getReviews).toHaveBeenLastCalledWith("g1", REVIEWS_PAGE_SIZE);
		expect(screen.getByText("Review last")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Load more reviews" })
		).not.toBeInTheDocument();
	});

	it("ignores double clicks while a page is loading", async () => {
		getReviews
			.mockReturnValueOnce(of(fullPage("a")))
			.mockReturnValue(NEVER);

		await renderReviews();
		const button = screen.getByRole("button", {
			name: "Load more reviews"
		});
		await userEvent.click(button);
		await userEvent.click(button);

		expect(getReviews).toHaveBeenCalledTimes(2);
	});

	it("keeps the loaded reviews and lets the user retry when the next page fails", async () => {
		getReviews
			.mockReturnValueOnce(of(fullPage("a")))
			.mockReturnValueOnce(throwError(() => new Error("offline")))
			.mockReturnValueOnce(of([reviewOf("late")]));

		await renderReviews();
		await userEvent.click(
			screen.getByRole("button", { name: "Load more reviews" })
		);
		expect(screen.getByText("Review a0")).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Load more reviews" })
		);
		expect(screen.getByText("Review late")).toBeInTheDocument();
	});
});
