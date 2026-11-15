import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter
} from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../../core/services/auth";
import { BacklogService } from "../../../backlog/backlog";
import { ReviewsService } from "../../reviews";
import { type Review } from "../../reviews.model";
import { GameReviews } from "./game-reviews";

const review = (id: string, content: string, userId: string): Review => ({
	id,
	content,
	rating: 4,
	user: { id: userId, username: `user-${userId}`, name: `User ${userId}` },
	createdAt: "2024-05-01T00:00:00.000Z",
	updatedAt: "2024-05-01T00:00:00.000Z"
});

const mine = review("mine", "My thoughts", "u1");

describe("GameReviews errors and ordering", () => {
	const getReviews = vi.fn();
	const createReview = vi.fn();
	const updateReview = vi.fn();
	const deleteReview = vi.fn();

	function renderReviews(gameId = "g1") {
		return render(GameReviews, {
			providers: [
				provideRouter([]),
				{
					provide: AuthService,
					useValue: { user: signal({ id: "u1" }) }
				},
				{
					provide: BacklogService,
					useValue: {
						getMyBacklog: vi
							.fn()
							.mockReturnValue(of({ data: { backlog: [] } }))
					}
				},
				{
					provide: ReviewsService,
					useValue: {
						getReviews,
						createReview,
						updateReview,
						deleteReview
					}
				},
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { queryParamMap: convertToParamMap({}) }
					}
				}
			],
			inputs: { gameId }
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
		getReviews.mockReset().mockReturnValue(of([]));
		createReview.mockReset().mockReturnValue(of({}));
		updateReview.mockReset().mockReturnValue(of({}));
		deleteReview.mockReset().mockReturnValue(of({}));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("keeps the reviews of the current game when the previous game answers late", async () => {
		const slow = new Subject<Review[]>();
		getReviews.mockImplementation((gameId: string) =>
			gameId === "g1"
				? slow
				: of([review("r2", "Review of the second game", "u9")])
		);
		const { fixture } = await renderReviews("g1");

		fixture.componentRef.setInput("gameId", "g2");
		fixture.detectChanges();
		await fixture.whenStable();
		slow.next([review("r1", "Review of the first game", "u8")]);

		expect(
			screen.getByText("Review of the second game")
		).toBeInTheDocument();
		expect(
			screen.queryByText("Review of the first game")
		).not.toBeInTheDocument();
	});

	it("sends one request when Post review is clicked repeatedly", async () => {
		const pending = new Subject<unknown>();
		createReview.mockReturnValue(pending);
		await renderReviews();

		await userEvent.click(
			screen.getByRole("button", { name: /Played it\? Write a review/ })
		);
		await userEvent.type(screen.getByLabelText("Your review"), "Loved it");
		await userEvent.tripleClick(
			screen.getByRole("button", { name: "Post review" })
		);

		expect(createReview).toHaveBeenCalledTimes(1);
	});

	it("reloads the list when deleting a review that no longer exists", async () => {
		getReviews.mockReturnValueOnce(of([mine])).mockReturnValue(of([]));
		deleteReview.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderReviews();
		await userEvent.click(screen.getByRole("button", { name: "Edit" }));

		await userEvent.click(screen.getByRole("button", { name: /Delete/ }));

		expect(getReviews).toHaveBeenCalledTimes(2);
		expect(screen.queryByText("My thoughts")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Your review")).not.toBeInTheDocument();
	});

	it("reloads the list when updating a review that no longer exists", async () => {
		getReviews.mockReturnValueOnce(of([mine])).mockReturnValue(of([]));
		updateReview.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderReviews();
		await userEvent.click(screen.getByRole("button", { name: "Edit" }));

		await userEvent.click(
			screen.getByRole("button", { name: "Update review" })
		);

		expect(getReviews).toHaveBeenCalledTimes(2);
		expect(screen.queryByText("My thoughts")).not.toBeInTheDocument();
	});

	it("lets the user retry after a server error", async () => {
		createReview
			.mockReturnValueOnce(throwError(() => ({ status: 500 })))
			.mockReturnValue(of({}));
		await renderReviews();
		await userEvent.click(
			screen.getByRole("button", { name: /Played it\? Write a review/ })
		);
		await userEvent.type(screen.getByLabelText("Your review"), "Loved it");

		await userEvent.click(
			screen.getByRole("button", { name: "Post review" })
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Post review" })
		);

		expect(createReview).toHaveBeenCalledTimes(2);
	});
});
