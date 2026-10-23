import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type BacklogEntry, type Platform } from "../../../core/models";
import { type SavedFilter } from "../saved-filters";
import { BacklogList } from "./backlog-list";

const api = environment.apiUrl;
const backlogUrl = `${api}/users/me/backlog`;

function entry(overrides: Partial<BacklogEntry>): BacklogEntry {
	return {
		id: "b0",
		status: "not_started",
		isPublic: true,
		score: 4.5,
		duration: 20,
		ratio: 0.23,
		game: { id: "g0", code: "game", title: "Game", isDlc: false },
		platform: { id: "p1", abbreviation: "PC" },
		...overrides
	};
}

const platformCatalog: Platform[] = [
	{ id: "p1", name: "PC", code: "pc", abbreviation: "PC" },
	{ id: "p2", name: "PlayStation 2", code: "ps2", abbreviation: "PS2" },
	{ id: "p3", name: "PlayStation 3", code: "ps3", abbreviation: "PS3" },
	{ id: "p4", name: "Nintendo Switch", code: "switch", abbreviation: "NSW" }
];

function savedView(overrides: Partial<SavedFilter>): SavedFilter {
	return {
		id: "v1",
		name: "Consoles",
		filters: {},
		showInBacklog: true,
		isDefault: false,
		enabledStats: null,
		icon: null,
		color: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		...overrides
	};
}

function initialLibrary(): BacklogEntry[] {
	return [
		entry({
			id: "b1",
			status: "playing",
			game: { id: "g1", code: "hades", title: "Hades", isDlc: false }
		}),
		entry({
			id: "b2",
			status: "not_started",
			game: {
				id: "g2",
				code: "hollow-knight",
				title: "Hollow Knight",
				isDlc: false
			}
		}),
		entry({
			id: "b3",
			status: "not_started",
			game: { id: "g3", code: "celeste", title: "Celeste", isDlc: false }
		})
	];
}

describe("BacklogList interaction", () => {
	let httpTesting: HttpTestingController;
	let library: BacklogEntry[];
	let savedViews: SavedFilter[];
	const savedViewWrites: { method: string; url: string; body: unknown }[] =
		[];
	const backlogQueries: URLSearchParams[] = [];
	const backlogPatches: { id: string; body: unknown }[] = [];
	const deletedIds: string[] = [];

	function listBacklog(req: TestRequest) {
		const params = req.request.params;
		backlogQueries.push(new URLSearchParams(params.toString()));
		const statuses = params.get("status")?.split(",");
		const search = params.get("search")?.toLowerCase();
		const backlog = library.filter(
			item =>
				(!statuses || statuses.includes(item.status)) &&
				(!search || item.game.title.toLowerCase().includes(search))
		);
		req.flush({ data: { backlog, total: backlog.length } });
	}

	function patchBacklog(req: TestRequest, id: string) {
		backlogPatches.push({ id, body: req.request.body });
		const current = library.find(item => item.id === id)!;
		const updated = { ...current, ...req.request.body } as BacklogEntry;
		library = library.map(item => (item.id === id ? updated : item));
		req.flush({ data: { backlog: updated, queueRemoved: false } });
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		const entryMatch = url.match(/\/users\/me\/backlog\/([^/]+)$/);
		if (method === "GET" && url === backlogUrl) return listBacklog(req);
		if (method === "PATCH" && entryMatch)
			return patchBacklog(req, entryMatch[1]);
		if (method === "DELETE" && entryMatch) {
			deletedIds.push(entryMatch[1]);
			library = library.filter(item => item.id !== entryMatch[1]);
			return req.flush(null);
		}
		if (url.endsWith("/progress") || url.endsWith("/coop"))
			return req.flush({ data: { progress: [], members: [] } });
		if (url.endsWith("/stats"))
			return req.flush({}, { status: 500, statusText: "Server Error" });
		if (url.endsWith("/mood-tags"))
			return req.flush({ data: { tags: [] } });
		if (url === `${api}/users/me/queue/backlog-ids`)
			return req.flush({ data: { backlogIds: [] } });
		if (url === `${api}/users/me/queue`)
			return req.flush({ data: { queue: [], total: 0 } });
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (url === `${api}/users/me/saved-filters` && method === "GET")
			return req.flush({ data: { savedFilters: savedViews } });
		if (
			url.startsWith(`${api}/users/me/saved-filters`) &&
			method !== "GET"
		) {
			savedViewWrites.push({ method, url, body: req.request.body });
			return req.flush({
				data: { savedFilter: savedView(req.request.body as object) }
			});
		}
		if (url === `${api}/platforms`)
			return req.flush({ data: { platforms: platformCatalog } });
		if (url === `${api}/genres`) return req.flush({ data: { genres: [] } });
		if (url === `${api}/score-sources`)
			return req.flush({ data: { sources: [] } });
		const gameMatch = url.match(/\/games\/([^/]+)$/);
		if (method === "GET" && gameMatch) {
			const game = library.find(item => item.game.code === gameMatch[1])!;
			return req.flush({
				data: { game: { ...game.game, platforms: [game.platform] } }
			});
		}
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function visibleTitles() {
		const names = screen
			.queryAllByRole("link")
			.filter(link => link.getAttribute("href")?.startsWith("/games/"))
			.map(link => link.getAttribute("aria-label"))
			.filter(Boolean);
		return [...new Set(names)];
	}

	function card(title: string) {
		const [poster] = screen.getAllByRole("link", { name: title });
		return poster.closest("article") as HTMLElement;
	}

	function searchBox() {
		return screen.getByRole("textbox", { name: "Search your library" });
	}

	function statusPills() {
		return within(
			screen.getByRole("navigation", { name: "Filter by status" })
		);
	}

	async function renderBacklog(initialRoute = "/") {
		const result = await render(BacklogList, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "**", component: BacklogList }],
			initialRoute
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(visibleTitles()).toEqual([
				"Hades",
				"Hollow Knight",
				"Celeste"
			])
		);
		return result;
	}

	beforeEach(() => {
		localStorage.clear();
		library = initialLibrary();
		savedViews = [];
		savedViewWrites.length = 0;
		backlogQueries.length = 0;
		backlogPatches.length = 0;
		deletedIds.length = 0;
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
	});

	afterEach(() => {
		answerPending();
		httpTesting.verify();
		vi.unstubAllGlobals();
	});

	it("loads the library and shows the total", async () => {
		await renderBacklog();

		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText(/games in your library/)).toBeInTheDocument();
	});

	it("gives each card a short accessible name and describes it with its details", async () => {
		await renderBacklog();

		const hollowKnight = screen.getByRole("button", {
			name: "Hollow Knight, Not Started"
		});
		expect(screen.getByRole("button", { name: "Hades, Playing" })).toBe(
			card("Hades")
		);
		const details = document.getElementById(
			hollowKnight.getAttribute("aria-describedby")!
		);
		expect(details).toContainElement(
			within(hollowKnight).getAllByRole("link", {
				name: "Hollow Knight"
			})[0]
		);
	});

	it("filters by status, then narrows the list with a title search", async () => {
		const user = userEvent.setup();
		await renderBacklog();

		await user.click(
			statusPills().getByRole("button", { name: /Not Started/ })
		);

		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
		);
		expect(
			statusPills().getByRole("button", { name: /Not Started/ })
		).toHaveAttribute("aria-pressed", "true");
		expect(backlogQueries.at(-1)?.get("status")).toBe("not_started");

		await user.type(searchBox(), "hollow");

		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hollow Knight"])
		);
		expect(backlogQueries.at(-1)?.get("search")).toBe("hollow");
		expect(backlogQueries.at(-1)?.get("status")).toBe("not_started");

		await user.click(screen.getByRole("button", { name: "Clear search" }));

		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
		);
	});

	it("shows a no-matches state that clears search and filters", async () => {
		const user = userEvent.setup();
		await renderBacklog();

		await user.type(searchBox(), "zelda");

		await untilVisible(() =>
			expect(
				screen.getByText(
					"No games match your current search or filters."
				)
			).toBeInTheDocument()
		);

		await user.click(
			screen.getByRole("button", { name: "Clear search & filters" })
		);

		await untilVisible(() =>
			expect(visibleTitles()).toEqual([
				"Hades",
				"Hollow Knight",
				"Celeste"
			])
		);
	});

	it("changes the status from the quick menu and asks for notes when completing", async () => {
		const user = userEvent.setup();
		await renderBacklog();

		const hades = within(card("Hades"));
		await user.click(hades.getByRole("button", { name: /Playing/ }));
		const menu = screen.getByRole("menu", { name: "Change status" });
		expect(
			within(menu).getByRole("menuitem", { name: /Playing/ })
		).toBeDisabled();

		await user.click(
			within(menu).getByRole("menuitem", { name: /Completed/ })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Completed?"
		});
		expect(within(dialog).getByLabelText(/Finished/)).toBeInTheDocument();
		expect(
			within(dialog).getByLabelText("Real duration (hours)")
		).toBeInTheDocument();
		const notes = within(dialog).getByLabelText("Notes");
		await user.type(notes, "Escaped at last");
		await user.type(
			within(dialog).getByLabelText("Real duration (hours)"),
			"32"
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Confirm" })
		);

		await untilVisible(() =>
			expect(
				within(card("Hades")).getByText(/Completed/)
			).toBeInTheDocument()
		);
		expect(
			within(card("Hades")).queryByRole("button", { name: /Playing/ })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(backlogPatches).toEqual([
			{
				id: "b1",
				body: expect.objectContaining({
					status: "completed",
					notes: "Escaped at last",
					realDuration: 32
				})
			}
		]);
	});

	it("asks for notes when abandoning but not when starting to play", async () => {
		const user = userEvent.setup();
		await renderBacklog();

		await user.click(
			within(card("Celeste")).getByRole("button", {
				name: "Start playing"
			})
		);
		const playing = await screen.findByRole("dialog", { name: "Playing?" });
		expect(
			within(playing).getByLabelText("Started on")
		).toBeInTheDocument();
		expect(
			within(playing).queryByLabelText("Notes")
		).not.toBeInTheDocument();
		await user.click(
			within(playing).getByRole("button", { name: "Cancel" })
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await user.click(
			within(card("Celeste")).getByRole("button", { name: /Not Started/ })
		);
		await user.click(screen.getByRole("menuitem", { name: /Abandoned/ }));

		const abandoned = await screen.findByRole("dialog", {
			name: "Abandoned?"
		});
		expect(
			within(abandoned).getByLabelText(/Abandoned on/)
		).toBeInTheDocument();
		expect(within(abandoned).getByLabelText("Notes")).toHaveAttribute(
			"placeholder",
			"Why did you drop it?"
		);
		expect(backlogPatches).toEqual([]);
	});

	it("opens an entry, edits it, saves and shows the updated card", async () => {
		const user = userEvent.setup();
		await renderBacklog();

		await user.click(within(card("Hollow Knight")).getByText("PC"));

		const summary = await screen.findByRole("dialog", { name: "Your run" });
		answerPending();
		await user.click(within(summary).getByRole("button", { name: "Edit" }));

		const editor = await screen.findByRole("dialog", { name: "Edit run" });
		const notes = within(editor).getByLabelText("Notes");
		await user.clear(notes);
		await user.type(notes, "Bring the dream nail");
		await user.click(within(editor).getByRole("button", { name: "Save" }));

		await untilVisible(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		expect(backlogPatches.at(-1)).toEqual({
			id: "b2",
			body: expect.objectContaining({ notes: "Bring the dream nail" })
		});
		await untilVisible(() =>
			expect(
				screen.getByRole("button", {
					name: "Flip to read your note and review"
				})
			).toBeInTheDocument()
		);
		await user.click(
			screen.getByRole("button", {
				name: "Flip to read your note and review"
			})
		);
		expect(
			screen.getByRole("button", { name: "Back to the card" })
		).toHaveAttribute("aria-pressed", "true");
		expect(
			within(
				screen.getByRole("region", {
					name: "Your note and review for Hollow Knight"
				})
			).getByText("Bring the dream nail")
		).toBeInTheDocument();
	});

	it("deletes an entry only after confirming", async () => {
		const user = userEvent.setup();
		await renderBacklog();

		await user.click(within(card("Celeste")).getByText("PC"));
		const summary = await screen.findByRole("dialog", { name: "Your run" });
		answerPending();
		await user.click(within(summary).getByRole("button", { name: "Edit" }));
		const editor = await screen.findByRole("dialog", { name: "Edit run" });

		await user.click(
			within(editor).getByRole("button", { name: /Delete/ })
		);
		expect(within(editor).getByRole("status")).toHaveTextContent(
			"Delete this run?"
		);
		await user.click(within(editor).getByRole("button", { name: "Keep" }));
		expect(deletedIds).toEqual([]);

		await user.click(
			within(editor).getByRole("button", { name: /Delete/ })
		);
		await user.click(
			within(editor).getByRole("button", { name: "Yes, delete" })
		);

		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hades", "Hollow Knight"])
		);
		expect(deletedIds).toEqual(["b3"]);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
	describe("platform filter", () => {
		function filtersButton() {
			return screen
				.getAllByRole("button", { name: /^Filters/ })
				.find(button => !button.classList.contains("sm:hidden"))!;
		}

		function platformTrigger() {
			return screen.getByRole("button", { name: /^Platform:/ });
		}

		function platformOption(name: string) {
			return screen.getByRole("option", { name });
		}

		function lastLibraryQuery() {
			return backlogQueries
				.filter(query => query.get("limit") !== "1")
				.at(-1)!;
		}

		async function openFilters(user: ReturnType<typeof userEvent.setup>) {
			await user.click(filtersButton());
			await screen.findByRole("button", { name: /^Platform:/ });
		}

		async function showResults(user: ReturnType<typeof userEvent.setup>) {
			await user.click(
				screen.getByRole("button", { name: /^(Save & )?[Ss]how/ })
			);
			answerPending();
		}

		beforeEach(() => {
			Element.prototype.getAnimations = () => [];
		});

		afterEach(() => {
			Reflect.deleteProperty(Element.prototype, "getAnimations");
		});

		it("sends the chosen platforms together as platforms and never as platform_id", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openFilters(user);
			expect(platformTrigger()).toHaveAccessibleName(
				"Platform: All platforms"
			);

			await user.click(platformTrigger());
			await user.click(platformOption("PlayStation 3"));
			await user.click(platformOption("PlayStation 2"));
			await user.keyboard("{Escape}");
			expect(platformTrigger()).toHaveAccessibleName(
				"Platform: PS2, PS3"
			);
			await showResults(user);

			await untilVisible(() =>
				expect(lastLibraryQuery().get("platforms")).toBe("ps2,ps3")
			);
			expect(lastLibraryQuery().has("platform_id")).toBe(false);
		});

		it("counts the platform selection as one active filter and previews it with platforms", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openFilters(user);

			await user.click(platformTrigger());
			await user.click(platformOption("PC"));
			await user.click(platformOption("Nintendo Switch"));
			await user.keyboard("{Escape}");

			await untilVisible(() => {
				expect(
					within(filtersButton()).getByText("1")
				).toBeInTheDocument();
				const preview = backlogQueries.filter(
					query => query.get("limit") === "1"
				);
				expect(preview.at(-1)?.get("platforms")).toBe("pc,switch");
			});
			expect(
				backlogQueries.every(query => !query.has("platform_id"))
			).toBe(true);
		});

		it("clears the whole selection from the footer Clear", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openFilters(user);
			await user.click(platformTrigger());
			await user.click(platformOption("PC"));
			await user.click(platformOption("PlayStation 2"));
			await user.keyboard("{Escape}");
			expect(platformTrigger()).toHaveAccessibleName("Platform: PC, PS2");

			await user.click(screen.getByRole("button", { name: "Clear" }));

			await untilVisible(() =>
				expect(lastLibraryQuery().has("platforms")).toBe(false)
			);
			expect(platformTrigger()).toHaveAccessibleName(
				"Platform: All platforms"
			);
			expect(
				within(filtersButton()).queryByText("1")
			).not.toBeInTheDocument();
		});

		it("converts a saved view with platform_id into the equivalent selection", async () => {
			const user = userEvent.setup();
			savedViews = [
				savedView({
					id: "legacy",
					name: "Only PS2",
					isDefault: true,
					filters: { platform_id: "p2" }
				})
			];
			await renderBacklog();

			await untilVisible(() =>
				expect(lastLibraryQuery().get("platforms")).toBe("ps2")
			);
			expect(
				backlogQueries.every(query => !query.has("platform_id"))
			).toBe(true);
			expect(within(filtersButton()).getByText("1")).toBeInTheDocument();

			await openFilters(user);
			expect(platformTrigger()).toHaveAccessibleName(
				"Platform: PlayStation 2"
			);
		});

		it("merges platform_id with platforms when a view has both", async () => {
			savedViews = [
				savedView({
					isDefault: true,
					filters: { platform_id: "p2", platforms: "pc" }
				})
			];
			await renderBacklog();

			await untilVisible(() =>
				expect(lastLibraryQuery().get("platforms")).toBe("pc,ps2")
			);
		});

		it("opens a view linked by id with its platforms selected", async () => {
			const user = userEvent.setup();
			savedViews = [
				savedView({
					id: "linked",
					filters: { platforms: "pc,ps2,ps3,switch" }
				})
			];
			await renderBacklog("/?savedFilterId=linked");

			await untilVisible(() =>
				expect(lastLibraryQuery().get("platforms")).toBe(
					"pc,ps2,ps3,switch"
				)
			);
			await openFilters(user);
			expect(platformTrigger()).toHaveAccessibleName(
				"Platform: 4 platforms"
			);
		});

		it("updates a legacy view saving platforms and dropping platform_id", async () => {
			const user = userEvent.setup();
			savedViews = [
				savedView({
					id: "legacy",
					isDefault: true,
					filters: { platform_id: "p2" }
				})
			];
			await renderBacklog();
			await untilVisible(() =>
				expect(lastLibraryQuery().get("platforms")).toBe("ps2")
			);
			await openFilters(user);
			await user.click(platformTrigger());
			await user.click(platformOption("PC"));
			await user.keyboard("{Escape}");

			await user.click(
				screen.getByRole("button", { name: /Update current view/ })
			);
			answerPending();

			expect(savedViewWrites).toEqual([
				{
					method: "PATCH",
					url: `${api}/users/me/saved-filters/legacy`,
					body: expect.objectContaining({
						filters: { platforms: "pc,ps2" }
					})
				}
			]);
		});

		it("saves a new view with the selected platforms", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openFilters(user);
			await user.click(platformTrigger());
			await user.click(platformOption("PlayStation 2"));
			await user.click(platformOption("PlayStation 3"));
			await user.keyboard("{Escape}");

			await user.type(
				screen.getByRole("textbox", { name: "View name" }),
				"Sony"
			);
			await showResults(user);

			await untilVisible(() =>
				expect(savedViewWrites).toEqual([
					{
						method: "POST",
						url: `${api}/users/me/saved-filters`,
						body: expect.objectContaining({
							name: "Sony",
							filters: { platforms: "ps2,ps3" }
						})
					}
				])
			);
		});
	});
});
