import { TestBed } from "@angular/core/testing";

import { type BacklogEntry } from "../../../../core/models";
import { GameLibraryActions } from "./game-library-actions";

const run = {
	id: "run-1",
	status: "playing",
	isPublic: true,
	game: { id: "g1", code: "hades", title: "Hades", isDlc: false },
	platform: { id: "p1", abbreviation: "PC" }
} as BacklogEntry;

describe("GameLibraryActions", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(GameLibraryActions);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const instance = fixture.componentInstance;
		const events = {
			backlog: vi.fn(),
			run: vi.fn(),
			queue: vi.fn(),
			wishlist: vi.fn(),
			shelf: vi.fn(),
			lists: vi.fn(),
			favorite: vi.fn()
		};
		instance.backlogRequested.subscribe(events.backlog);
		instance.runOpened.subscribe(events.run);
		instance.queueRequested.subscribe(events.queue);
		instance.wishlistToggled.subscribe(events.wishlist);
		instance.shelfRequested.subscribe(events.shelf);
		instance.listsRequested.subscribe(events.lists);
		instance.favoriteToggled.subscribe(events.favorite);
		return { fixture, element, events };
	}

	function button(element: HTMLElement, text: string) {
		return Array.from(element.querySelectorAll("button")).find(b =>
			b.textContent?.includes(text)
		) as HTMLButtonElement;
	}

	function secondaryLabels(element: HTMLElement) {
		return Array.from(
			element.querySelectorAll("ul[aria-label] li button")
		).map(b => b.querySelectorAll("span")[1].textContent?.trim());
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [GameLibraryActions] });
	});

	describe("primary action", () => {
		it("offers to add the game when there is no run yet", () => {
			const { element, events } = render();

			button(element, "Add to My Games").click();

			expect(events.backlog).toHaveBeenCalledTimes(1);
			expect(events.run).not.toHaveBeenCalled();
		});

		it("shows the status and platform of the latest run and opens it", () => {
			const { element, events } = render({ latestRun: run });

			const primary = button(element, "Playing");
			expect(primary.textContent).toContain("PC");
			expect(primary.title).toBe("Open your playing run");
			expect(element.textContent).not.toContain("Add to My Games");
			primary.click();
			expect(events.run).toHaveBeenCalledWith(run);
			expect(events.backlog).not.toHaveBeenCalled();
		});
	});

	describe("favorite button", () => {
		it("offers to add a non favorite and emits on click", () => {
			const { element, events } = render();

			const favorite = element.querySelector(
				'button[aria-label="Add to favorites"]'
			) as HTMLButtonElement;
			favorite.click();

			expect(favorite.getAttribute("aria-pressed")).toBe("false");
			expect(events.favorite).toHaveBeenCalledTimes(1);
		});

		it("offers to remove an existing favorite", () => {
			const { element } = render({ favorite: true });

			const favorite = element.querySelector(
				'button[aria-label="Remove from favorites"]'
			) as HTMLButtonElement;
			expect(favorite.getAttribute("aria-pressed")).toBe("true");
		});

		it("is disabled while toggling", () => {
			const { element } = render({ togglingFavorite: true });

			expect(
				(
					element.querySelector(
						'button[aria-label="Add to favorites"]'
					) as HTMLButtonElement
				).disabled
			).toBe(true);
		});

		it("shows the Favorite text only in the full variant", () => {
			expect(render().element.textContent).toContain("Favorite");
			expect(
				render({ variant: "compact" }).element.textContent
			).not.toContain("Favorite");
		});
	});

	describe("secondary actions", () => {
		it("lists the four actions with their inactive labels", () => {
			const { element } = render();

			expect(secondaryLabels(element)).toEqual([
				"Up Next",
				"Want it",
				"Shelf",
				"Lists"
			]);
		});

		it("is hidden in the compact variant", () => {
			const { element } = render({ variant: "compact" });

			expect(element.querySelector("ul[aria-label]")).toBeNull();
		});

		it("shows the active labels when the game is in each collection", () => {
			const { element } = render({
				inQueue: true,
				inWishlist: true,
				inShelf: true,
				listsCount: 3
			});

			expect(secondaryLabels(element)).toEqual([
				"In Up Next",
				"Wanted",
				"On shelf",
				"In 3 lists"
			]);
		});

		it("uses the singular for a single list", () => {
			const { element } = render({ listsCount: 1 });

			expect(secondaryLabels(element)).toContain("In 1 list");
		});

		it("marks active actions as pressed", () => {
			const { element } = render({ inWishlist: true });

			const pressed = Array.from(
				element.querySelectorAll("ul[aria-label] li button")
			).map(b => b.getAttribute("aria-pressed"));
			expect(pressed).toEqual(["false", "true", "false", "false"]);
		});

		it("emits the matching event for each action", () => {
			const { element, events } = render();

			button(element, "Up Next").click();
			button(element, "Want it").click();
			button(element, "Shelf").click();
			button(element, "Lists").click();

			expect(events.queue).toHaveBeenCalledTimes(1);
			expect(events.wishlist).toHaveBeenCalledTimes(1);
			expect(events.shelf).toHaveBeenCalledTimes(1);
			expect(events.lists).toHaveBeenCalledTimes(1);
		});

		it("disables Up Next while queueing and Want it while toggling the wishlist", () => {
			const { element } = render({
				queueing: true,
				togglingWishlist: true
			});

			expect(button(element, "Up Next").disabled).toBe(true);
			expect(button(element, "Want it").disabled).toBe(true);
			expect(button(element, "Shelf").disabled).toBe(false);
			expect(button(element, "Lists").disabled).toBe(false);
		});
	});
});
