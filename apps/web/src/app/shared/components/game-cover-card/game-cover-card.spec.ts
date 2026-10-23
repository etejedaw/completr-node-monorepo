import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { GameCoverCard } from "./game-cover-card";

describe("GameCoverCard", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
	});

	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(GameCoverCard);
		fixture.componentRef.setInput("game", {
			code: "hades",
			title: "Hades",
			coverUrl: "https://example.com/hades.jpg"
		});
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function root(fixture: ReturnType<typeof render>) {
		return fixture.nativeElement as HTMLElement;
	}

	function actionButtons(fixture: ReturnType<typeof render>) {
		return Array.from(
			root(fixture).querySelectorAll<HTMLButtonElement>(
				"button[aria-label]"
			)
		).filter(button => button.getAttribute("aria-label") !== "Remove");
	}

	function actionLabels(fixture: ReturnType<typeof render>) {
		return actionButtons(fixture).map(button =>
			button.getAttribute("aria-label")
		);
	}

	describe("cover", () => {
		it("links the cover and the title to the game page", () => {
			const fixture = render();
			const links = Array.from(root(fixture).querySelectorAll("a"));

			expect(links.map(link => link.getAttribute("href"))).toEqual([
				"/games/hades",
				"/games/hades"
			]);
			expect(links[1].textContent).toContain("Hades");
			expect(
				root(fixture).querySelector("img")?.getAttribute("src")
			).toBe("https://example.com/hades.jpg");
		});

		it("falls back to the background image", () => {
			const fixture = render({
				game: {
					code: "hades",
					title: "Hades",
					backgroundUrl: "https://example.com/bg.jpg"
				}
			});

			expect(
				root(fixture).querySelector("img")?.getAttribute("src")
			).toBe("https://example.com/bg.jpg");
		});

		it("renders a button that emits cardClick when clickable", () => {
			const fixture = render({ clickable: true });
			const clicked = vi.fn();
			fixture.componentInstance.cardClick.subscribe(clicked);

			const cover = root(fixture).querySelector(
				"button.block"
			) as HTMLButtonElement;
			cover.click();

			expect(clicked).toHaveBeenCalledOnce();
			expect(root(fixture).querySelectorAll("a")).toHaveLength(1);
		});
	});

	describe("overlays", () => {
		it("shows badge, ratio, duration, acquired date and subtitle", () => {
			const fixture = render({
				topLeftBadge: "#1",
				ratio: 4.2,
				duration: 12,
				acquiredAt: "2026-03-05T12:00:00.000Z",
				subtitle: "Switch"
			});
			const text = root(fixture).textContent ?? "";

			expect(text).toContain("#1");
			expect(text).toContain("4.2");
			expect(text).toContain("12h");
			expect(text).toContain("Mar 5, 2026");
			expect(text).toContain("Switch");
		});

		it("shows a zero ratio and a zero duration", () => {
			const fixture = render({ ratio: 0, duration: 0 });
			const badges = Array.from(
				root(fixture).querySelectorAll(
					"span.tabular-nums, span.rounded-full"
				)
			).map(badge => badge.textContent?.trim());

			expect(badges).toEqual(["0", "0h"]);
		});

		it("omits ratio, duration and acquired date when missing", () => {
			const fixture = render({ ratio: null });

			expect(root(fixture).querySelector("span.tabular-nums")).toBeNull();
			expect(root(fixture).textContent).not.toContain("event");
			expect(root(fixture).textContent).not.toMatch(/\dh/);
		});

		it("renders the mood tags", () => {
			expect(
				render({ moodTags: ["cozy"] }).nativeElement.textContent
			).toContain("cozy");
		});
	});

	describe("remove", () => {
		it("hides the remove button by default", () => {
			expect(
				root(render()).querySelector('[aria-label="Remove"]')
			).toBeNull();
		});

		it("emits remove from the remove button", () => {
			const fixture = render({ showRemove: true });
			const removed = vi.fn();
			fixture.componentInstance.remove.subscribe(removed);

			(
				root(fixture).querySelector(
					'[aria-label="Remove"]'
				) as HTMLButtonElement
			).click();

			expect(removed).toHaveBeenCalledOnce();
		});
	});

	describe("actions", () => {
		it("renders no action buttons by default", () => {
			expect(actionButtons(render())).toEqual([]);
		});

		it("labels the actions after the game and its state", () => {
			const fixture = render({
				showFavorite: true,
				showWishlistToggle: true,
				showAddToBacklog: true
			});

			expect(new Set(actionLabels(fixture))).toEqual(
				new Set([
					"Add Hades to favorites",
					"Add Hades to Want to Get",
					"Add Hades to My Games"
				])
			);
		});

		it("reflects the active state in labels and pressed flags", () => {
			const fixture = render({
				showFavorite: true,
				isFavorite: true,
				showWishlistToggle: true,
				inWishlist: true,
				showAddToBacklog: true,
				inBacklog: true
			});

			expect(new Set(actionLabels(fixture))).toEqual(
				new Set([
					"Remove Hades from favorites",
					"Remove Hades from Want to Get",
					"Edit Hades in My Games"
				])
			);
			const favorite = actionButtons(fixture).find(b =>
				b.getAttribute("aria-label")?.includes("favorites")
			);
			const backlog = actionButtons(fixture).find(b =>
				b.getAttribute("aria-label")?.includes("My Games")
			);
			expect(favorite?.getAttribute("aria-pressed")).toBe("true");
			expect(backlog?.hasAttribute("aria-pressed")).toBe(false);
		});

		it("emits the matching output from each action", () => {
			const fixture = render({
				showFavorite: true,
				showWishlistToggle: true,
				showAddToBacklog: true
			});
			const favorite = vi.fn();
			const wishlist = vi.fn();
			const backlog = vi.fn();
			fixture.componentInstance.favoriteToggle.subscribe(favorite);
			fixture.componentInstance.wishlistToggle.subscribe(wishlist);
			fixture.componentInstance.addToBacklog.subscribe(backlog);

			for (const button of actionButtons(fixture)) button.click();

			expect(favorite).toHaveBeenCalledTimes(2);
			expect(wishlist).toHaveBeenCalledTimes(2);
			expect(backlog).toHaveBeenCalledTimes(2);
		});
	});
});
