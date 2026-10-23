import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, throwError } from "rxjs";

import { PublicLibraryService } from "../services/public-library.service";
import { ProfileCollections } from "./profile-collections";

function entry(id: string, title: string, abbreviation?: string) {
	return {
		id,
		game: { id: `g-${id}`, code: id, title },
		platform: abbreviation ? { id: "p", abbreviation } : undefined
	};
}

describe("ProfileCollections", () => {
	const getUserGameShelf = vi.fn();
	const getUserWishlist = vi.fn();

	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		getUserGameShelf
			.mockReset()
			.mockReturnValue(of({ items: [], total: 0 }));
		getUserWishlist
			.mockReset()
			.mockReturnValue(of({ items: [], total: 0 }));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderCollections(inputs: Record<string, unknown>) {
		return render(ProfileCollections, {
			providers: [
				provideRouter([]),
				{
					provide: PublicLibraryService,
					useValue: { getUserGameShelf, getUserWishlist }
				}
			],
			inputs: { username: "ada", ...inputs }
		});
	}

	it("does not request the shelf or the wishlist when both are hidden", async () => {
		await renderCollections({});

		expect(getUserGameShelf).not.toHaveBeenCalled();
		expect(getUserWishlist).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("heading", { name: "Collection" })
		).not.toBeInTheDocument();
	});

	it("only requests the shelf when the wishlist is hidden", async () => {
		getUserGameShelf.mockReturnValue(
			of({ items: [entry("hades", "Hades", "PC")], total: 1 })
		);
		await renderCollections({ showShelf: true });

		expect(
			await screen.findByRole("heading", { name: "Collection" })
		).toBeInTheDocument();
		expect(getUserGameShelf).toHaveBeenCalledWith("ada", { limit: 12 });
		expect(getUserWishlist).not.toHaveBeenCalled();
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getByText("PC")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
			"href",
			"/user/ada/game-shelf"
		);
	});

	it("only requests the wishlist when the shelf is hidden", async () => {
		getUserWishlist.mockReturnValue(
			of({ items: [entry("celeste", "Celeste")], total: 1 })
		);
		await renderCollections({ showWishlist: true });

		await screen.findByRole("heading", { name: "Collection" });
		expect(getUserWishlist).toHaveBeenCalledWith("ada", { limit: 12 });
		expect(getUserGameShelf).not.toHaveBeenCalled();
		expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
			"href",
			"/user/ada/wishlist"
		);
	});

	it("offers Owned and Wanted with counts and switches between them", async () => {
		const user = userEvent.setup();
		getUserGameShelf.mockReturnValue(
			of({ items: [entry("hades", "Hades", "PC")], total: 4 })
		);
		getUserWishlist.mockReturnValue(
			of({ items: [entry("celeste", "Celeste")], total: 2 })
		);
		await renderCollections({ showShelf: true, showWishlist: true });

		const group = await screen.findByRole("radiogroup", {
			name: "Collection"
		});
		expect(
			within(group).getByRole("radio", { name: /Owned/ })
		).toHaveAttribute("aria-checked", "true");
		expect(
			within(group).getByRole("radio", { name: /Wanted/ })
		).toHaveTextContent("2");
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);

		await user.click(within(group).getByRole("radio", { name: /Wanted/ }));

		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
		expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
			"href",
			"/user/ada/wishlist"
		);
	});

	it("hides the switch and shows only the side that has games", async () => {
		getUserGameShelf.mockReturnValue(of({ items: [], total: 0 }));
		getUserWishlist.mockReturnValue(
			of({ items: [entry("celeste", "Celeste")], total: 1 })
		);
		await renderCollections({ showShelf: true, showWishlist: true });

		await screen.findByRole("heading", { name: "Collection" });
		expect(
			screen.queryByRole("radiogroup", { name: "Collection" })
		).not.toBeInTheDocument();
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
	});

	it("renders nothing when both collections are empty or fail", async () => {
		getUserGameShelf.mockReturnValue(throwError(() => ({ status: 403 })));
		getUserWishlist.mockReturnValue(of({ items: [], total: 0 }));
		await renderCollections({ showShelf: true, showWishlist: true });

		await waitFor(() => expect(getUserWishlist).toHaveBeenCalled());
		expect(
			screen.queryByRole("heading", { name: "Collection" })
		).not.toBeInTheDocument();
	});
});
