import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserBacklog } from "./user-backlog";

function entry(id: string, title: string, status = "completed") {
	return {
		id,
		status,
		isPublic: true,
		game: { id: `g-${id}`, code: id, title, isDlc: false },
		platform: { id: "pc", abbreviation: "PC" }
	};
}

describe("UserBacklog", () => {
	const getUserBacklog = vi.fn();

	beforeEach(() => {
		localStorage.clear();
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
		getUserBacklog.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage(query: Record<string, string> = {}) {
		return render(UserBacklog, {
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: { get: () => "ada" },
							queryParamMap: {
								get: (key: string) => query[key] ?? null
							}
						}
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
				{ provide: PublicLibraryService, useValue: { getUserBacklog } }
			]
		});
	}

	it("loads the first page of the public library, newest first", async () => {
		getUserBacklog.mockReturnValue(
			of({ items: [entry("hades", "Hades")], total: 1 })
		);
		await renderPage();

		expect(await screen.findAllByText("Hades")).not.toHaveLength(0);
		expect(getUserBacklog).toHaveBeenCalledWith("ada", {
			limit: 50,
			offset: 0,
			sort_by: "createdAt",
			sort_order: "desc"
		});
		expect(
			screen.getByRole("link", { name: /@ada's library/ })
		).toHaveAttribute("href", "/user/ada");
		expect(screen.getByText("game")).toHaveTextContent(/1\s*game/);
	});

	it("applies the status from the link and sorts by the date that matters for it", async () => {
		getUserBacklog.mockReturnValue(
			of({ items: [entry("hades", "Hades")], total: 1 })
		);
		await renderPage({ status: "completed" });

		await screen.findAllByText("Hades");
		expect(getUserBacklog).toHaveBeenCalledWith(
			"ada",
			expect.objectContaining({
				status: "completed",
				sort_by: "finishedAt",
				sort_order: "desc"
			})
		);
		expect(screen.getByText(/· completed/)).toBeInTheDocument();
	});

	it("forwards the shareable filters from the link and ignores unknown ones", async () => {
		getUserBacklog.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage({ platform_id: "pc", min_rating: "8", secret: "x" });

		await waitFor(() => expect(getUserBacklog).toHaveBeenCalled());
		const filters = getUserBacklog.mock.calls[0][1];
		expect(filters).toMatchObject({ platform_id: "pc", min_rating: "8" });
		expect(filters).not.toHaveProperty("secret");
	});

	it("shows the title and description of a shared view", async () => {
		getUserBacklog.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage({
			view_name: "Metroidvanias",
			view_desc: "Everything with a map"
		});

		expect(
			await screen.findByRole("heading", { name: "Metroidvanias" })
		).toBeInTheDocument();
		expect(screen.getByText("Everything with a map")).toBeInTheDocument();
	});

	it("shows the private state when the owner does not share the library", async () => {
		getUserBacklog.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "This library is private"
			})
		).toBeInTheDocument();
		expect(screen.queryByPlaceholderText(/Search/)).not.toBeInTheDocument();
	});

	it("shows the not-found state when the player does not exist", async () => {
		getUserBacklog.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
	});

	it("explains an empty library", async () => {
		getUserBacklog.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage();

		expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
		expect(
			screen.getByText("This library has no public games yet.")
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Show all games" })
		).not.toBeInTheDocument();
	});

	it("explains an empty status and offers to show all games again", async () => {
		const user = userEvent.setup();
		getUserBacklog.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage({ status: "playing" });

		expect(
			await screen.findByText("No playing games to show.")
		).toBeInTheDocument();

		getUserBacklog.mockClear();
		await user.click(
			screen.getByRole("button", { name: "Show all games" })
		);

		expect(getUserBacklog).toHaveBeenCalledWith(
			"ada",
			expect.not.objectContaining({ status: expect.anything() })
		);
	});

	it("searches the library after the visitor stops typing", async () => {
		const user = userEvent.setup();
		getUserBacklog.mockReturnValue(
			of({ items: [entry("hades", "Hades")], total: 1 })
		);
		await renderPage();
		await screen.findAllByText("Hades");
		getUserBacklog.mockClear();
		getUserBacklog.mockReturnValue(of({ items: [], total: 0 }));

		await user.type(
			screen.getByPlaceholderText("Search ada's games..."),
			"zelda"
		);

		await waitFor(() =>
			expect(getUserBacklog).toHaveBeenCalledWith(
				"ada",
				expect.objectContaining({ search: "zelda", offset: 0 })
			)
		);
		expect(
			await screen.findByText('No games match "zelda".')
		).toBeInTheDocument();
	});

	it("does not show the games while the library is loading", async () => {
		getUserBacklog.mockReturnValue(new Subject());
		await renderPage();

		expect(screen.getByLabelText("Loading")).toBeInTheDocument();
		expect(screen.queryByText("Nothing here yet")).not.toBeInTheDocument();
	});

	it("remembers the chosen view mode", async () => {
		const user = userEvent.setup();
		getUserBacklog.mockReturnValue(
			of({ items: [entry("hades", "Hades")], total: 1 })
		);
		await renderPage();
		await screen.findAllByText("Hades");

		await user.click(screen.getByRole("button", { name: /Hardcore/ }));

		expect(localStorage.getItem("completr.publicBacklog.viewMode")).toBe(
			"hardcore"
		);
	});
});
