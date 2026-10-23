import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserGameShelf } from "./user-game-shelf";

const entries = [
	{
		id: "s1",
		game: { id: "g1", code: "hades", title: "Hades" },
		platform: { id: "pc", abbreviation: "PC" }
	},
	{
		id: "s2",
		game: { id: "g2", code: "celeste", title: "Celeste" },
		platform: { id: "sw", abbreviation: "NSW" }
	}
];

describe("UserGameShelf", () => {
	const getUserGameShelf = vi.fn();

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
		getUserGameShelf.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage() {
		return render(UserGameShelf, {
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
					useValue: { getUserGameShelf }
				}
			]
		});
	}

	it("requests the first page of ada's shelf and lists the games", async () => {
		getUserGameShelf.mockReturnValue(of({ items: entries, total: 2 }));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Shelf" })
		).toBeInTheDocument();
		expect(getUserGameShelf).toHaveBeenCalledWith("ada", {
			limit: 50,
			offset: 0
		});
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
	});

	it("shows the private state when the owner does not share it", async () => {
		getUserGameShelf.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "This shelf is private"
			})
		).toBeInTheDocument();
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
	});

	it("shows the not-found state when the player does not exist", async () => {
		getUserGameShelf.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
	});

	it("shows the empty state when there are no games", async () => {
		getUserGameShelf.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage();

		expect(
			await screen.findByText("The shelf is empty")
		).toBeInTheDocument();
	});

	it("does not show the games while the page is loading", async () => {
		getUserGameShelf.mockReturnValue(new Subject());
		await renderPage();

		await waitFor(() => expect(getUserGameShelf).toHaveBeenCalled());
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
		expect(
			screen.queryByText("The shelf is empty")
		).not.toBeInTheDocument();
	});
});
