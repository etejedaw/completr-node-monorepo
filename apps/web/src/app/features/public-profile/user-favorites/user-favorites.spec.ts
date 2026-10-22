import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserFavorites } from "./user-favorites";

const entries = [
	{
		id: "f1",
		position: 1,
		game: { id: "g1", code: "hades", title: "Hades" }
	},
	{
		id: "f2",
		position: 2,
		game: { id: "g2", code: "celeste", title: "Celeste" }
	}
];

describe("UserFavorites", () => {
	const getUserFavorites = vi.fn();

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
		getUserFavorites.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage() {
		return render(UserFavorites, {
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
					useValue: { getUserFavorites }
				}
			]
		});
	}

	it("requests the first page of ada's favorites and lists the games", async () => {
		getUserFavorites.mockReturnValue(of({ items: entries, total: 2 }));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Favorites" })
		).toBeInTheDocument();
		expect(getUserFavorites).toHaveBeenCalledWith("ada", {
			limit: 50,
			offset: 0
		});
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
	});

	it("shows the private state when the owner does not share it", async () => {
		getUserFavorites.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "These favorites are private"
			})
		).toBeInTheDocument();
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
	});

	it("shows the not-found state when the player does not exist", async () => {
		getUserFavorites.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
	});

	it("shows the empty state when there are no games", async () => {
		getUserFavorites.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage();

		expect(await screen.findByText("No favorites yet")).toBeInTheDocument();
	});

	it("does not show the games while the page is loading", async () => {
		getUserFavorites.mockReturnValue(new Subject());
		await renderPage();

		await waitFor(() => expect(getUserFavorites).toHaveBeenCalled());
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
		expect(screen.queryByText("No favorites yet")).not.toBeInTheDocument();
	});
});
