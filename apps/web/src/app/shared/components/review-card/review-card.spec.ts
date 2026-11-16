import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { ReviewCard } from "./review-card";
import { type ReviewCardReview } from "./review-card.model";

const COVER =
	"https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg";
const BACKGROUND = "https://media.rawg.io/media/games/celeste/background.jpg";

const review: ReviewCardReview = {
	content: "Great run",
	rating: 4.5,
	playthroughDuration: 30,
	createdAt: "2026-03-05T12:00:00.000Z",
	game: {
		code: "hades",
		title: "Hades",
		coverUrl: "https://example.com/hades.jpg",
		backgroundUrl: "https://example.com/hades-bg.jpg"
	},
	user: { username: "esteban", name: "Esteban T", role: "premium" }
};

@Component({
	imports: [ReviewCard],
	template: `<app-review-card [review]="review"
		><button reviewActions type="button">Edit</button></app-review-card
	>`
})
class Host {
	review = review;
}

describe("ReviewCard", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				disconnect = vi.fn();
			}
		);
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(ReviewCard);
		fixture.componentRef.setInput("review", review);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	describe("game subject", () => {
		it("links the title to the game and shows the cover", () => {
			const element = render();

			const title = element.querySelector("h3 a") as HTMLAnchorElement;
			expect(title.textContent).toContain("Hades");
			expect(title.getAttribute("href")).toBe("/games/hades");
			expect(
				element
					.querySelector("app-game-poster img")
					?.getAttribute("src")
			).toBe("https://example.com/hades.jpg");
		});

		it("falls back to the background when there is no cover", () => {
			const element = render({
				review: { ...review, game: { ...review.game!, coverUrl: null } }
			});

			expect(
				element
					.querySelector("app-game-poster img")
					?.getAttribute("src")
			).toBe("https://example.com/hades-bg.jpg");
		});

		it("renders the decorative backdrop from the background, falls back to the cover and skips it without art", () => {
			const backdropOf = (
				game: Partial<NonNullable<typeof review.game>>
			) =>
				render({
					review: { ...review, game: { ...review.game!, ...game } }
				})
					.querySelector('img[aria-hidden="true"]')
					?.getAttribute("src") ?? null;

			expect(
				backdropOf({ coverUrl: COVER, backgroundUrl: BACKGROUND })
			).toContain("games/celeste/background.jpg");
			expect(backdropOf({ coverUrl: COVER, backgroundUrl: null })).toBe(
				COVER
			);
			expect(
				backdropOf({ coverUrl: null, backgroundUrl: null })
			).toBeNull();
			expect(backdropOf({ coverUrl: "", backgroundUrl: " " })).toBeNull();
		});

		it("shows the cover as poster and keeps the background for the backdrop", () => {
			const element = render({
				review: {
					...review,
					game: {
						...review.game!,
						coverUrl: COVER,
						backgroundUrl: BACKGROUND
					}
				}
			});

			expect(
				element
					.querySelector("app-game-poster img")
					?.getAttribute("src")
			).toBe(COVER);
		});

		it("shows the rating, its label, the duration, the date and the content", () => {
			const text = render().textContent ?? "";

			expect(text).toContain("4.5");
			expect(text).toContain("Peak");
			expect(text).toContain("After 30h");
			expect(text).toContain("Mar 5, 2026");
			expect(text).toContain("Great run");
		});

		it("omits optional parts when the review lacks them", () => {
			const element = render({
				review: {
					createdAt: review.createdAt,
					game: review.game
				}
			});

			expect(element.textContent).not.toContain("After");
			expect(element.querySelector("app-star-rating")).toBeNull();
			expect(element.querySelector("blockquote")).toBeNull();
		});
	});

	describe("author subject", () => {
		it("shows the author name linked to their profile", () => {
			const element = render({ subject: "author" });

			const name = element.querySelector("h3 a") as HTMLAnchorElement;
			expect(name.textContent).toContain("Esteban T");
			expect(name.getAttribute("href")).toBe("/user/esteban");
		});

		it("falls back to the username when there is no name", () => {
			const element = render({
				subject: "author",
				review: { ...review, user: { username: "esteban" } }
			});

			expect(element.querySelector("h3 a")?.textContent).toContain(
				"esteban"
			);
		});

		it("does not render the game poster or the backdrop", () => {
			const element = render({ subject: "author" });

			expect(element.querySelector("app-game-poster")).toBeNull();
			expect(element.querySelector('img[aria-hidden="true"]')).toBeNull();
		});

		it("shows the You badge only when highlighted", () => {
			expect(render({ subject: "author" }).textContent).not.toContain(
				"You"
			);
			expect(
				render({ subject: "author", highlighted: true }).textContent
			).toContain("You");
		});

		it("highlights the surface", () => {
			const article = render({
				subject: "author",
				highlighted: true
			}).querySelector("article");

			expect(article?.className).toContain("bg-brand-subtle/60");
		});
	});

	it("projects the review actions into the header", () => {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();

		expect(
			(fixture.nativeElement as HTMLElement).querySelector(
				"header button"
			)?.textContent
		).toBe("Edit");
	});
});
