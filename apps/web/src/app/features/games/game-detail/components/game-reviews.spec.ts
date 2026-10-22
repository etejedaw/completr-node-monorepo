import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter
} from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, throwError } from "rxjs";

import { AuthService } from "../../../../core/services/auth";
import { BacklogService } from "../../../backlog/backlog";
import { type Review, ReviewsService } from "../../reviews";
import { GameReviews } from "./game-reviews";

const review = (overrides: Partial<Review>): Review => ({
	id: "rv1",
	content: "Great game",
	rating: 4,
	user: { id: "u2", username: "grace", name: "Grace Hopper" },
	createdAt: "2024-05-01T00:00:00.000Z",
	updatedAt: "2024-05-01T00:00:00.000Z",
	...overrides
});

const mine = review({
	id: "mine",
	content: "My thoughts",
	rating: 5,
	user: { id: "u1", username: "ada", name: "Ada Lovelace" }
});

describe("GameReviews", () => {
	const user = signal<{ id: string } | null>({ id: "u1" });
	const queryParams = signal<Record<string, string>>({});
	const getReviews = vi.fn();
	const createReview = vi.fn();
	const updateReview = vi.fn();
	const deleteReview = vi.fn();
	const getMyBacklog = vi.fn();

	function renderReviews(gameId = "g1") {
		return render(GameReviews, {
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: { user } },
				{ provide: BacklogService, useValue: { getMyBacklog } },
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
						snapshot: {
							queryParamMap: convertToParamMap(queryParams())
						}
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
		user.set({ id: "u1" });
		queryParams.set({});
		getReviews.mockReset().mockReturnValue(of([]));
		createReview.mockReset().mockReturnValue(of({}));
		updateReview.mockReset().mockReturnValue(of({}));
		deleteReview.mockReset().mockReturnValue(of({}));
		getMyBacklog.mockReset().mockReturnValue(of({ data: { backlog: [] } }));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("summary", () => {
		it("explains there are no reviews yet", async () => {
			await renderReviews();

			expect(getReviews).toHaveBeenCalledWith("g1");
			expect(screen.getByText("Not rated yet")).toBeInTheDocument();
			expect(screen.getByText("0 reviews")).toBeInTheDocument();
			expect(
				screen.getByText(/No reviews yet. Be the first/)
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: /Played it\? Write a review/
				})
			).toBeInTheDocument();
		});

		it("averages only the rated reviews and rounds to one decimal", async () => {
			getReviews.mockReturnValue(
				of([
					review({ id: "a", rating: 5 }),
					review({ id: "b", rating: 4 }),
					review({ id: "c", rating: 4 }),
					review({ id: "d", rating: undefined, content: "No stars" })
				])
			);

			await renderReviews();

			expect(screen.getByText("4.3")).toBeInTheDocument();
			expect(screen.getByText("4 reviews")).toBeInTheDocument();
		});

		it("uses the singular for a single review", async () => {
			getReviews.mockReturnValue(of([review({})]));

			await renderReviews();

			expect(screen.getByText("1 review")).toBeInTheDocument();
		});

		it("buckets the distribution by rounded-up stars", async () => {
			getReviews.mockReturnValue(
				of([
					review({ id: "a", rating: 4.5 }),
					review({ id: "b", rating: 5 }),
					review({ id: "c", rating: 1 })
				])
			);

			await renderReviews();

			const rows = document.querySelectorAll(
				"app-rating-distribution li"
			);
			const countOf = (row: Element) =>
				row.querySelector("span.text-right")?.firstChild?.textContent;
			expect(rows).toHaveLength(5);
			expect(countOf(rows[0])).toBe("2");
			expect(countOf(rows[1])).toBe("0");
			expect(countOf(rows[4])).toBe("1");
		});
	});

	describe("community and own review", () => {
		it("lists other people's reviews under From the community", async () => {
			getReviews.mockReturnValue(of([review({})]));

			await renderReviews();

			expect(
				screen.getByRole("heading", { name: "From the community" })
			).toBeInTheDocument();
			expect(screen.getByText("Great game")).toBeInTheDocument();
			expect(
				screen.queryByText(/No reviews yet/)
			).not.toBeInTheDocument();
		});

		it("highlights the user's own review separately and offers to edit it", async () => {
			getReviews.mockReturnValue(of([mine, review({})]));

			await renderReviews();

			expect(screen.getByText("My thoughts")).toBeInTheDocument();
			expect(screen.getByText("You")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Edit" })
			).toBeInTheDocument();
			const community = screen
				.getByRole("heading", { name: "From the community" })
				.closest("section") as HTMLElement;
			expect(within(community).queryByText("My thoughts")).toBeNull();
			expect(
				screen.queryByRole("button", {
					name: /Played it\? Write a review/
				})
			).not.toBeInTheDocument();
		});

		it("does not detect an own review for guests", async () => {
			user.set(null);
			getReviews.mockReturnValue(of([mine]));

			await renderReviews();

			expect(screen.queryByText("You")).not.toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "From the community" })
			).toBeInTheDocument();
		});
	});

	describe("writing a review", () => {
		it("keeps Post review disabled until there is a rating or text", async () => {
			await renderReviews();

			await userEvent.click(
				screen.getByRole("button", {
					name: /Played it\? Write a review/
				})
			);

			expect(
				screen.getByRole("heading", { name: "Write a review" })
			).toBeInTheDocument();
			const post = screen.getByRole("button", { name: "Post review" });
			expect(post).toBeDisabled();
			await userEvent.type(
				screen.getByLabelText("Your review"),
				"Loved it"
			);
			expect(post).toBeEnabled();
		});

		it("creates the review with trimmed content and reloads", async () => {
			getReviews.mockReturnValueOnce(of([])).mockReturnValue(of([mine]));
			await renderReviews();

			await userEvent.click(
				screen.getByRole("button", {
					name: /Played it\? Write a review/
				})
			);
			await userEvent.type(
				screen.getByLabelText("Your review"),
				"  Loved it  "
			);
			await userEvent.click(
				screen.getByRole("button", { name: "Post review" })
			);

			expect(createReview).toHaveBeenCalledWith("g1", {
				content: "Loved it",
				rating: undefined
			});
			expect(updateReview).not.toHaveBeenCalled();
			expect(getReviews).toHaveBeenCalledTimes(2);
			expect(
				screen.queryByLabelText("Your review")
			).not.toBeInTheDocument();
			expect(screen.getByText("My thoughts")).toBeInTheDocument();
		});

		it("sends only the rating when the text is blank", async () => {
			await renderReviews();
			await userEvent.click(
				screen.getByRole("button", {
					name: /Played it\? Write a review/
				})
			);

			await userEvent.click(
				screen.getByRole("slider", { name: "Rating" })
			);
			await userEvent.keyboard("{Home}");
			await userEvent.type(screen.getByLabelText("Your review"), "   ");
			await userEvent.click(
				screen.getByRole("button", { name: "Post review" })
			);

			expect(createReview).toHaveBeenCalledWith("g1", {
				content: undefined,
				rating: 0.5
			});
		});

		it("closes the form without saving on Cancel", async () => {
			await renderReviews();
			await userEvent.click(
				screen.getByRole("button", {
					name: /Played it\? Write a review/
				})
			);

			await userEvent.click(
				screen.getByRole("button", { name: "Cancel" })
			);

			expect(createReview).not.toHaveBeenCalled();
			expect(
				screen.queryByLabelText("Your review")
			).not.toBeInTheDocument();
		});

		it("stays open and re-enables submit when saving fails", async () => {
			createReview.mockReturnValue(throwError(() => new Error("boom")));
			await renderReviews();
			await userEvent.click(
				screen.getByRole("button", {
					name: /Played it\? Write a review/
				})
			);
			await userEvent.type(
				screen.getByLabelText("Your review"),
				"Loved it"
			);

			await userEvent.click(
				screen.getByRole("button", { name: "Post review" })
			);

			expect(screen.getByLabelText("Your review")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Post review" })
			).toBeEnabled();
		});
	});

	describe("editing and deleting", () => {
		it("prefills the form with the existing review and updates it", async () => {
			getReviews.mockReturnValue(of([mine]));
			await renderReviews();

			await userEvent.click(screen.getByRole("button", { name: "Edit" }));

			expect(
				screen.getByRole("heading", { name: "Edit your review" })
			).toBeInTheDocument();
			const textbox = screen.getByLabelText("Your review");
			expect(textbox).toHaveValue("My thoughts");
			await userEvent.clear(textbox);
			await userEvent.type(textbox, "Changed my mind");
			await userEvent.click(
				screen.getByRole("button", { name: "Update review" })
			);

			expect(updateReview).toHaveBeenCalledWith("g1", {
				content: "Changed my mind",
				rating: 5
			});
			expect(createReview).not.toHaveBeenCalled();
		});

		it("deletes the review and reloads the list", async () => {
			getReviews.mockReturnValueOnce(of([mine])).mockReturnValue(of([]));
			await renderReviews();
			await userEvent.click(screen.getByRole("button", { name: "Edit" }));

			await userEvent.click(
				screen.getByRole("button", { name: /Delete/ })
			);

			expect(deleteReview).toHaveBeenCalledWith("g1");
			expect(getReviews).toHaveBeenCalledTimes(2);
			expect(screen.queryByText("My thoughts")).not.toBeInTheDocument();
		});

		it("does not offer Delete when writing a first review", async () => {
			await renderReviews();

			await userEvent.click(
				screen.getByRole("button", {
					name: /Played it\? Write a review/
				})
			);

			expect(
				screen.queryByRole("button", { name: /Delete/ })
			).not.toBeInTheDocument();
		});
	});

	describe("review=open query param", () => {
		beforeEach(() => {
			queryParams.set({ review: "open" });
		});

		it("opens the form straight away when the user already has a review", async () => {
			getReviews.mockReturnValue(of([mine]));

			await renderReviews();

			expect(screen.getByLabelText("Your review")).toHaveValue(
				"My thoughts"
			);
			expect(getMyBacklog).not.toHaveBeenCalled();
		});

		it("prefills the form from the backlog entry notes and rating", async () => {
			getMyBacklog.mockReturnValue(
				of({
					data: {
						backlog: [{ notes: "From my diary", userRating: 3.5 }]
					}
				})
			);

			await renderReviews();

			expect(getMyBacklog).toHaveBeenCalledWith({ game_id: "g1" });
			expect(screen.getByLabelText("Your review")).toHaveValue(
				"From my diary"
			);
			expect(screen.getAllByText("Fun").length).toBeGreaterThan(0);
		});

		it("opens an empty form when the user has no backlog entry", async () => {
			await renderReviews();

			expect(screen.getByLabelText("Your review")).toHaveValue("");
		});

		it("opens an empty form when the backlog request fails", async () => {
			getMyBacklog.mockReturnValue(throwError(() => new Error("boom")));

			await renderReviews();

			expect(screen.getByLabelText("Your review")).toHaveValue("");
		});
	});

	it("reloads the reviews and closes the form when the game changes", async () => {
		const view = await renderReviews("g1");
		await userEvent.click(
			screen.getByRole("button", { name: /Played it\? Write a review/ })
		);

		view.fixture.componentRef.setInput("gameId", "g2");
		view.fixture.detectChanges();

		expect(getReviews).toHaveBeenLastCalledWith("g2");
		expect(screen.queryByLabelText("Your review")).not.toBeInTheDocument();
	});
});
