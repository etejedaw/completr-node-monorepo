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
import { type BacklogEntry } from "../../../core/models";
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
		if (url.endsWith("/mood-tags"))
			return req.flush({ data: { tags: [] } });
		if (url === `${api}/users/me/queue/backlog-ids`)
			return req.flush({ data: { backlogIds: [] } });
		if (url === `${api}/users/me/queue`)
			return req.flush({ data: { queue: [], total: 0 } });
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (url === `${api}/users/me/saved-filters`)
			return req.flush({ data: { savedFilters: [] } });
		if (url === `${api}/platforms`)
			return req.flush({ data: { platforms: [] } });
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

	async function renderBacklog() {
		const result = await render(BacklogList, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "**", component: BacklogList }]
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
});
