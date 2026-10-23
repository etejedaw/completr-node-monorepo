import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserWishlist } from "./user-wishlist";

const entries = [
	{
		id: "w1",
		game: { id: "g1", code: "hades", title: "Hades" },
		platform: { id: "pc", abbreviation: "PC" }
	},
	{
		id: "w2",
		game: { id: "g2", code: "celeste", title: "Celeste" },
		platform: { id: "sw", abbreviation: "NSW" }
	}
];

describe("UserWishlist", () => {
	const getUserWishlist = vi.fn();

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
		getUserWishlist.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage() {
		return render(UserWishlist, {
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
					provide: PublicLibraryService,
					useValue: { getUserWishlist }
				}
			]
		});
	}

	it("requests the first page of ada's wishlist and lists the games", async () => {
		getUserWishlist.mockReturnValue(of({ items: entries, total: 2 }));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Wanted" })
		).toBeInTheDocument();
		expect(getUserWishlist).toHaveBeenCalledWith("ada", {
			limit: 50,
			offset: 0
		});
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
	});

	it("shows the private state when the owner does not share it", async () => {
		getUserWishlist.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "This wishlist is private"
			})
		).toBeInTheDocument();
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
	});

	it("shows the not-found state when the player does not exist", async () => {
		getUserWishlist.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
	});

	it("shows the empty state when there are no games", async () => {
		getUserWishlist.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage();

		expect(
			await screen.findByText("Nothing wanted yet")
		).toBeInTheDocument();
	});

	it("does not show the games while the page is loading", async () => {
		getUserWishlist.mockReturnValue(new Subject());
		await renderPage();

		await waitFor(() => expect(getUserWishlist).toHaveBeenCalled());
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
		expect(
			screen.queryByText("Nothing wanted yet")
		).not.toBeInTheDocument();
	});
});
