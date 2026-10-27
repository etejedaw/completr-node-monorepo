import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserPlatinums } from "./user-platinums";

const entries = [
	{
		id: "p1",
		backlogId: null,
		platformId: "ps5",
		platinumedAt: "2026-03-12",
		platform: { id: "ps5", name: "PlayStation 5", abbreviation: "PS5" },
		game: { id: "g1", code: "astro-bot", title: "Astro Bot", isDlc: false }
	},
	{
		id: "p2",
		backlogId: null,
		platformId: null,
		platinumedAt: null,
		platform: null,
		game: {
			id: "g2",
			code: "bloodborne",
			title: "Bloodborne",
			isDlc: false
		}
	}
];

describe("UserPlatinums", () => {
	const getUserPlatinums = vi.fn();

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
		getUserPlatinums.mockReset();
		localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage() {
		return render(UserPlatinums, {
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
					useValue: { getUserPlatinums }
				}
			]
		});
	}

	it("requests the first page of ada's platinums and lists them with date and platform", async () => {
		getUserPlatinums.mockReturnValue(of({ items: entries, total: 2 }));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Platinums" })
		).toBeInTheDocument();
		expect(getUserPlatinums).toHaveBeenCalledWith("ada", {
			limit: 100,
			offset: 0
		});
		expect(screen.getAllByText("Astro Bot").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Bloodborne").length).toBeGreaterThan(0);
		expect(screen.getByText("Mar 12, 2026")).toBeInTheDocument();
		expect(screen.getByTitle("PlayStation 5")).toHaveTextContent("PS5");
	});

	it("shows the private state when the owner does not share it", async () => {
		getUserPlatinums.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "These platinums are private"
			})
		).toBeInTheDocument();
		expect(screen.queryAllByText("Astro Bot")).toHaveLength(0);
	});

	it("shows the not-found state when the player does not exist", async () => {
		getUserPlatinums.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
	});

	it("shows the empty state when there are no games", async () => {
		getUserPlatinums.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage();

		expect(await screen.findByText("No platinums yet")).toBeInTheDocument();
	});

	it("does not show the games while the page is loading", async () => {
		getUserPlatinums.mockReturnValue(new Subject());
		await renderPage();

		await waitFor(() => expect(getUserPlatinums).toHaveBeenCalled());
		expect(screen.queryAllByText("Astro Bot")).toHaveLength(0);
		expect(screen.queryByText("No platinums yet")).not.toBeInTheDocument();
	});

	it("switches to the hardcore table without the owner's notes or edit actions", async () => {
		const user = userEvent.setup();
		getUserPlatinums.mockReturnValue(of({ items: entries, total: 2 }));
		await renderPage();

		await user.click(
			await screen.findByRole("button", { name: /Hardcore/ })
		);

		const table = screen.getByRole("table");
		expect(
			within(table).getByRole("columnheader", { name: "Platinumed on" })
		).toBeInTheDocument();
		expect(
			within(table).queryByRole("columnheader", { name: "Notes" })
		).not.toBeInTheDocument();
		expect(
			within(table).queryByRole("button", { name: /Edit platinum/ })
		).not.toBeInTheDocument();
		expect(within(table).getAllByRole("row")).toHaveLength(3);
	});
});
