import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

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
	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function renderActions(inputs: Record<string, unknown> = {}) {
		const events = {
			backlog: vi.fn(),
			run: vi.fn(),
			queue: vi.fn(),
			wishlist: vi.fn(),
			shelf: vi.fn(),
			lists: vi.fn(),
			favorite: vi.fn()
		};
		const { container } = await render(GameLibraryActions, {
			inputs,
			on: {
				backlogRequested: events.backlog,
				runOpened: events.run,
				queueRequested: events.queue,
				wishlistToggled: events.wishlist,
				shelfRequested: events.shelf,
				listsRequested: events.lists,
				favoriteToggled: events.favorite
			}
		});
		return { container, events };
	}

	async function openLibraryMenu() {
		await waitFor(() =>
			expect(
				screen.queryByRole("menu", { name: "Your library" })
			).not.toBeInTheDocument()
		);
		await userEvent.click(
			screen.getByRole("button", { name: "More library actions" })
		);
		return screen.findByRole("menu", { name: "Your library" });
	}

	async function menuLabels() {
		const menu = await openLibraryMenu();
		const labels = within(menu)
			.getAllByRole("menuitem")
			.map(item => item.getAttribute("aria-label"));
		await userEvent.keyboard("{Escape}");
		return labels;
	}

	describe("primary action", () => {
		it("offers to add the game when there is no run yet", async () => {
			const { events } = await renderActions();

			await userEvent.click(
				screen.getByRole("button", { name: /Add to My Games/ })
			);

			expect(events.backlog).toHaveBeenCalledTimes(1);
			expect(events.run).not.toHaveBeenCalled();
		});

		it("shows the status and platform of the latest run and opens it", async () => {
			const { events } = await renderActions({ latestRun: run });

			const primary = screen.getByRole("button", { name: /Playing/ });
			expect(primary).toHaveTextContent("PC");
			expect(primary).toHaveAttribute("title", "Open your playing run");
			expect(
				screen.queryByRole("button", { name: /Add to My Games/ })
			).not.toBeInTheDocument();
			await userEvent.click(primary);
			expect(events.run).toHaveBeenCalledWith(run);
			expect(events.backlog).not.toHaveBeenCalled();
		});
	});

	describe("favorite button", () => {
		it("offers to add a non favorite and emits on click", async () => {
			const { events } = await renderActions();

			const favorite = screen.getByRole("button", {
				name: "Add to favorites"
			});
			await userEvent.click(favorite);

			expect(favorite).toHaveAttribute("aria-pressed", "false");
			expect(events.favorite).toHaveBeenCalledTimes(1);
		});

		it("offers to remove an existing favorite", async () => {
			await renderActions({ favorite: true });

			expect(
				screen.getByRole("button", { name: "Remove from favorites" })
			).toHaveAttribute("aria-pressed", "true");
		});

		it("is disabled while toggling", async () => {
			await renderActions({ togglingFavorite: true });

			expect(
				screen.getByRole("button", { name: "Add to favorites" })
			).toBeDisabled();
		});

		it("shows the Favorite text only in the full variant", async () => {
			const full = await renderActions();
			expect(full.container).toHaveTextContent("Favorite");
		});

		it("hides the Favorite text in the compact variant", async () => {
			const compact = await renderActions({ variant: "compact" });
			expect(compact.container).not.toHaveTextContent("Favorite");
		});
	});

	describe("library menu", () => {
		it("groups the four library actions behind a single more button", async () => {
			await renderActions();

			expect(screen.getAllByRole("button")).toHaveLength(3);
			expect(await menuLabels()).toEqual([
				"Add to Up Next",
				"Add to Want to Get",
				"Add to My Shelf",
				"Add to a list"
			]);
		});

		it("is hidden in the compact variant", async () => {
			await renderActions({ variant: "compact" });

			expect(
				screen.queryByRole("button", { name: "More library actions" })
			).not.toBeInTheDocument();
		});

		it("shows where the game already is", async () => {
			await renderActions({
				inQueue: true,
				inWishlist: true,
				inShelf: true,
				listsCount: 3
			});

			expect(await menuLabels()).toEqual([
				"In Up Next",
				"Remove from Want to Get",
				"On My Shelf",
				"In 3 lists"
			]);
		});

		it("uses the singular for a single list", async () => {
			await renderActions({ listsCount: 1 });

			expect(await menuLabels()).toContain("In 1 list");
		});

		it("explains each active state", async () => {
			await renderActions({
				inQueue: true,
				inWishlist: true,
				inShelf: true,
				listsCount: 2
			});
			const menu = await openLibraryMenu();

			expect(
				within(menu).getByRole("menuitem", { name: "In Up Next" })
			).toHaveAccessibleDescription("Already in your queue");
			expect(
				within(menu).getByRole("menuitem", {
					name: "Remove from Want to Get"
				})
			).toHaveAccessibleDescription("It's in your Want to Get");
			expect(
				within(menu).getByRole("menuitem", { name: "On My Shelf" })
			).toHaveAccessibleDescription("Add another copy");
			expect(
				within(menu).getByRole("menuitem", { name: "In 2 lists" })
			).toHaveAccessibleDescription("Add to or remove from lists");
		});

		it.each([
			["Add to Up Next", "queue"],
			["Add to Want to Get", "wishlist"],
			["Add to My Shelf", "shelf"],
			["Add to a list", "lists"]
		] as const)("emits the matching event for %s", async (name, event) => {
			const { events } = await renderActions();
			const menu = await openLibraryMenu();

			await userEvent.click(within(menu).getByRole("menuitem", { name }));

			expect(events[event]).toHaveBeenCalledTimes(1);
			const others = Object.entries(events).filter(
				([key]) => key !== event
			);
			for (const [, handler] of others)
				expect(handler).not.toHaveBeenCalled();
		});

		it("does not queue a game that is already in Up Next", async () => {
			const { events } = await renderActions({ inQueue: true });
			const menu = await openLibraryMenu();

			const queued = within(menu).getByRole("menuitem", {
				name: "In Up Next"
			});
			expect(queued).toBeDisabled();
			await userEvent.click(queued);

			expect(events.queue).not.toHaveBeenCalled();
		});

		it("blocks Up Next while queueing and Want to Get while toggling, even on a double click", async () => {
			const { events } = await renderActions({
				queueing: true,
				togglingWishlist: true
			});
			const menu = await openLibraryMenu();

			const queue = within(menu).getByRole("menuitem", {
				name: "Add to Up Next"
			});
			const wishlist = within(menu).getByRole("menuitem", {
				name: "Add to Want to Get"
			});
			expect(queue).toBeDisabled();
			expect(wishlist).toBeDisabled();
			expect(
				within(menu).getByRole("menuitem", { name: "Add to My Shelf" })
			).toBeEnabled();
			expect(
				within(menu).getByRole("menuitem", { name: "Add to a list" })
			).toBeEnabled();

			await userEvent.dblClick(queue);
			await userEvent.dblClick(wishlist);
			expect(events.queue).not.toHaveBeenCalled();
			expect(events.wishlist).not.toHaveBeenCalled();
		});
	});
});
