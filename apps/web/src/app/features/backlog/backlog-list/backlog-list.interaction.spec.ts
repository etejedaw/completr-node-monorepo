import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import {
	ApplicationRef,
	ChangeDetectionStrategy,
	Component
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent, { type UserEvent } from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type BacklogEntry, type Platform } from "../../../core/models";
import { UiToastContainer } from "../../../shared/ui";
import { pickCalendarDate } from "../../../shared/ui/date-picker/ui-date-picker.testing";
import { todayLocalDate } from "../../../shared/utils/local-date";
import { type SavedFilter } from "../saved-filters.model";
import { BacklogList } from "./backlog-list";

@Component({
	selector: "app-backlog-host",
	imports: [BacklogList, UiToastContainer],
	template: `<app-backlog-list /><ui-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class BacklogHost {}

interface BulkCall {
	url: string;
	action: string | null;
	body: Record<string, unknown>;
}

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
	let savedViewsStatus: number;
	const savedViewWrites: { method: string; url: string; body: unknown }[] =
		[];
	const backlogQueries: URLSearchParams[] = [];
	const backlogPatches: { id: string; body: unknown }[] = [];
	const deletedIds: string[] = [];
	const platinumPuts: { gameId: string; body: unknown }[] = [];
	const bulkCalls: BulkCall[] = [];
	let bulkSkipIds: Set<string>;
	let bulkFailure: number | null;
	let queuedIds: string[];
	let favoriteGameIds: string[];
	let reportedTotal: number | null;
	let secondPage: BacklogEntry[];
	let myTags: {
		tag: string;
		usageCount: number;
		description: string | null;
	}[];
	let myTagsStatus: number;
	let myTagsRequests: number;
	let holdViewPatches: boolean;
	let viewPatchFailure: number | null;
	const heldViewPatches: TestRequest[] = [];
	let statsStatus: number;
	let holdStats: boolean;
	const statsRequests: TestRequest[] = [];
	const heldStats: TestRequest[] = [];

	function hasAllTags(
		owned: readonly string[] | undefined,
		wanted: string[]
	) {
		return wanted.every(tag => owned?.includes(tag));
	}

	function listBacklog(req: TestRequest) {
		const params = req.request.params;
		backlogQueries.push(new URLSearchParams(params.toString()));
		const statuses = params.get("status")?.split(",");
		const search = params.get("search")?.toLowerCase();
		const platinumedOnly = params.get("platinumed_only") === "true";
		const moodTags = params.get("mood_tags")?.split(",") ?? [];
		if (Number(params.get("offset") ?? 0) > 0) {
			return req.flush({
				data: {
					backlog: secondPage,
					total: reportedTotal ?? secondPage.length
				}
			});
		}
		const backlog = library.filter(
			item =>
				(!statuses || statuses.includes(item.status)) &&
				(!search || item.game.title.toLowerCase().includes(search)) &&
				(!platinumedOnly || !!item.platinum) &&
				hasAllTags(item.moodTags, moodTags)
		);
		req.flush({
			data: { backlog, total: reportedTotal ?? backlog.length }
		});
	}

	function answerBulk(req: TestRequest) {
		const { url, params } = req.request;
		const body = req.request.body as Record<string, unknown>;
		const action = params.get("action");
		bulkCalls.push({ url, action, body });
		if (bulkFailure !== null)
			return req.flush(
				{ type: "INTERNAL" },
				{ status: bulkFailure, statusText: "Server Error" }
			);
		const ids = (body["ids"] ??
			body["backlogIds"] ??
			body["gameIds"]) as string[];
		const succeeded = ids.filter(id => !bulkSkipIds.has(id));
		const skipped = ids
			.filter(id => bulkSkipIds.has(id))
			.map(id => ({ id, code: "BACKLOG_NOT_FOUND" }));
		const done = new Set(succeeded);
		if (url === `${backlogUrl}/bulk` && action === "delete")
			library = library.filter(item => !done.has(item.id));
		if (url === `${backlogUrl}/bulk` && action === "update") {
			const changes = body["changes"] as Partial<BacklogEntry>;
			library = library.map(item =>
				done.has(item.id) ? { ...item, ...changes } : item
			);
		}
		if (url === `${api}/users/me/queue/bulk`)
			queuedIds =
				action === "add"
					? [...new Set([...queuedIds, ...succeeded])]
					: queuedIds.filter(id => !done.has(id));
		const queueRemoved =
			url === `${backlogUrl}/bulk` && action === "update"
				? succeeded.filter(id => queuedIds.includes(id))
				: undefined;
		if (queueRemoved)
			queuedIds = queuedIds.filter(id => !queueRemoved.includes(id));
		req.flush({
			data: {
				action,
				succeeded,
				skipped,
				...(queueRemoved ? { queueRemoved } : {})
			}
		});
	}

	function patchBacklog(req: TestRequest, id: string) {
		backlogPatches.push({ id, body: req.request.body });
		const current = library.find(item => item.id === id)!;
		const updated = { ...current, ...req.request.body } as BacklogEntry;
		library = library.map(item => (item.id === id ? updated : item));
		req.flush({ data: { backlog: updated, queueRemoved: false } });
	}

	function putPlatinum(req: TestRequest, gameId: string) {
		const body = req.request.body as {
			backlogId: string | null;
			platinumedAt: string | null;
		};
		platinumPuts.push({ gameId, body });
		const platinum = {
			id: `platinum-${gameId}`,
			backlogId: body.backlogId,
			platformId: null,
			platinumedAt: body.platinumedAt,
			notes: null
		};
		library = library.map(item =>
			item.game.id === gameId ? { ...item, platinum } : item
		);
		req.flush({ data: { platinum } }, { status: 201, statusText: "OK" });
	}

	const exportRequests: TestRequest["request"][] = [];

	function statsFiltersOf(req: TestRequest): Record<string, string> {
		const { params, url } = req.request;
		if (params.keys().length > 0)
			return Object.fromEntries(
				params.keys().map(key => [key, params.get(key) ?? ""])
			);
		const viewId = url.split("/").at(-2);
		const view = savedViews.find(item => item.id === viewId);
		return (view?.filters ?? {}) as Record<string, string>;
	}

	function respondToStats(req: TestRequest) {
		if (statsStatus !== 200)
			return req.flush(
				{ title: "Failed" },
				{ status: statsStatus, statusText: "Failed" }
			);
		const filters = statsFiltersOf(req);
		const statuses = filters["status"]?.split(",");
		const moodTags = filters["mood_tags"]?.split(",") ?? [];
		const matching = library.filter(
			item =>
				(!statuses || statuses.includes(item.status)) &&
				hasAllTags(item.moodTags, moodTags)
		);
		const countOf = (status: string) =>
			matching.filter(item => item.status === status).length;
		req.flush({
			data: {
				stats: {
					totalEntries: matching.length,
					totalRealHours: null,
					avgRatio: null,
					avgPersonalRatio: null,
					countByStatus: {
						not_started: countOf("not_started"),
						playing: countOf("playing"),
						completed: countOf("completed"),
						abandoned: countOf("abandoned"),
						endless: countOf("endless")
					}
				}
			}
		});
	}

	function answerStats(req: TestRequest) {
		statsRequests.push(req);
		if (holdStats) {
			heldStats.push(req);
			return;
		}
		respondToStats(req);
	}

	function respondToViewPatch(req: TestRequest, failWith: number | null) {
		const id = req.request.url.split("/").at(-1)!;
		if (failWith !== null)
			return req.flush(
				{ title: "Failed", status: failWith },
				{ status: failWith, statusText: "Failed" }
			);
		savedViews = savedViews.map(view =>
			view.id === id
				? { ...view, ...(req.request.body as Partial<SavedFilter>) }
				: view
		);
		req.flush({
			data: {
				savedFilter:
					savedViews.find(view => view.id === id) ??
					savedView(req.request.body as Partial<SavedFilter>)
			}
		});
	}

	function patchSavedView(req: TestRequest) {
		const { method, url, body } = req.request;
		savedViewWrites.push({ method, url, body });
		if (holdViewPatches) {
			heldViewPatches.push(req);
			return;
		}
		respondToViewPatch(req, viewPatchFailure);
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		const platinumMatch = url.match(
			/\/users\/me\/games\/([^/]+)\/platinum$/
		);
		if (method === "PUT" && platinumMatch)
			return putPlatinum(req, platinumMatch[1]);
		if (method === "POST" && url.endsWith("/bulk")) return answerBulk(req);
		const entryMatch = url.match(/\/users\/me\/backlog\/([^/]+)$/);
		if (method === "GET" && url === backlogUrl) return listBacklog(req);
		if (method === "GET" && url === `${backlogUrl}/export`) {
			exportRequests.push(req.request);
			return req.flush(new Blob(["gameTitle\n"], { type: "text/csv" }));
		}
		if (method === "GET" && url === `${api}/users/me/gift-offers`)
			return req.flush({ data: { offers: [] } });
		if (method === "PATCH" && entryMatch)
			return patchBacklog(req, entryMatch[1]);
		if (method === "DELETE" && entryMatch) {
			deletedIds.push(entryMatch[1]);
			library = library.filter(item => item.id !== entryMatch[1]);
			return req.flush(null);
		}
		if (url.endsWith("/progress") || url.endsWith("/coop"))
			return req.flush({ data: { progress: [], members: [] } });
		if (url.endsWith("/stats")) return answerStats(req);
		if (url === `${api}/users/me/mood-tags`) {
			myTagsRequests++;
			if (myTagsStatus !== 200)
				return req.flush(
					{ title: "Failed" },
					{ status: myTagsStatus, statusText: "Failed" }
				);
			return req.flush({ data: { tags: myTags } });
		}
		if (url.endsWith("/mood-tags"))
			return req.flush({ data: { tags: [] } });
		if (url === `${api}/users/me/queue/backlog-ids`)
			return req.flush({ data: { backlogIds: queuedIds } });
		if (url === `${api}/users/me/queue`)
			return req.flush({ data: { queue: [], total: 0 } });
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: favoriteGameIds } });
		if (
			url === `${api}/users/me/saved-filters` &&
			method === "GET" &&
			savedViewsStatus !== 200
		)
			return req.flush(
				{ title: "Failed", status: savedViewsStatus },
				{ status: savedViewsStatus, statusText: "Failed" }
			);
		if (url === `${api}/users/me/saved-filters` && method === "GET")
			return req.flush({ data: { savedFilters: savedViews } });
		if (
			method === "PATCH" &&
			/\/users\/me\/saved-filters\/[^/]+$/.test(url)
		)
			return patchSavedView(req);
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
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled);
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
		savedViewsStatus = 200;
		savedViewWrites.length = 0;
		backlogQueries.length = 0;
		backlogPatches.length = 0;
		deletedIds.length = 0;
		platinumPuts.length = 0;
		exportRequests.length = 0;
		bulkCalls.length = 0;
		bulkSkipIds = new Set();
		bulkFailure = null;
		queuedIds = [];
		favoriteGameIds = [];
		reportedTotal = null;
		secondPage = [];
		myTags = [];
		myTagsStatus = 200;
		myTagsRequests = 0;
		holdViewPatches = false;
		viewPatchFailure = null;
		heldViewPatches.length = 0;
		statsStatus = 500;
		holdStats = false;
		statsRequests.length = 0;
		heldStats.length = 0;
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
		vi.useRealTimers();
		answerPending();
		httpTesting.verify();
		vi.unstubAllGlobals();
	});

	it("says how many games the filter covers and how many match while typing", async () => {
		const user = userEvent.setup();
		await renderBacklog();
		expect(searchBox()).toHaveAttribute(
			"placeholder",
			"Filter 3 games by title"
		);

		await user.type(searchBox(), "hollow");

		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hollow Knight"])
		);
		expect(
			within(
				searchBox().closest("ui-search-bar") as HTMLElement
			).getByRole("status")
		).toHaveTextContent("1 game");
	});

	it("opens with the title search of the link and leaves the default view aside", async () => {
		savedViews = [
			savedView({
				id: "default",
				isDefault: true,
				filters: { status: "completed" }
			})
		];
		await render(BacklogList, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "**", component: BacklogList }],
			initialRoute: "/?search=hollow"
		});
		httpTesting = TestBed.inject(HttpTestingController);

		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hollow Knight"])
		);
		expect(searchBox()).toHaveValue("hollow");
		expect(backlogQueries.at(-1)?.get("search")).toBe("hollow");
		expect(backlogQueries.at(-1)?.get("status")).toBeNull();
	});

	it("loads the library from a view link even when the saved views fail to load", async () => {
		savedViewsStatus = 500;

		await renderBacklog("/?savedFilterId=linked");

		expect(visibleTitles()).toEqual(["Hades", "Hollow Knight", "Celeste"]);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("still opens the library when the browser blocks storage", async () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("blocked", "SecurityError");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("blocked", "SecurityError");
		});

		await renderBacklog();

		expect(visibleTitles()).toEqual(["Hades", "Hollow Knight", "Celeste"]);
		vi.restoreAllMocks();
	});

	it("exports exactly the filtered and sorted library", async () => {
		const user = userEvent.setup();
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined);
		Object.assign(URL, {
			createObjectURL: vi.fn(() => "blob:export"),
			revokeObjectURL: vi.fn()
		});
		savedViews = [
			savedView({
				id: "linked",
				filters: {},
				sortBy: "ratio",
				sortOrder: "asc"
			})
		];
		await renderBacklog("/?savedFilterId=linked");
		await user.click(
			statusPills().getByRole("button", { name: /Not Started/ })
		);
		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
		);
		await user.type(searchBox(), "hollow");
		await untilVisible(() =>
			expect(visibleTitles()).toEqual(["Hollow Knight"])
		);

		await user.click(screen.getByRole("button", { name: "Export" }));
		await user.click(
			within(
				await screen.findByRole("menu", { name: "Export My Games" })
			).getByRole("menuitem", { name: "Download CSV" })
		);
		answerPending();

		expect(exportRequests).toHaveLength(1);
		const [request] = exportRequests;
		expect(request.headers.get("Accept")).toBe("text/csv");
		expect(
			Object.fromEntries(
				request.params.keys().map(key => [key, request.params.get(key)])
			)
		).toEqual({
			status: "not_started",
			search: "hollow",
			sort_by: "ratio",
			sort_order: "asc"
		});
		expect(click).toHaveBeenCalledTimes(1);
		click.mockRestore();
		Reflect.deleteProperty(URL, "createObjectURL");
		Reflect.deleteProperty(URL, "revokeObjectURL");
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
		await user.click(
			hades.getByRole("button", { name: "Status of Hades: Playing" })
		);
		const menu = await screen.findByRole("menu", { name: "Change status" });
		expect(
			within(menu).getByRole("menuitemradio", { name: /Playing/ })
		).toHaveAttribute("aria-checked", "true");

		await user.click(
			within(menu).getByRole("menuitemradio", { name: /Completed/ })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Completed?"
		});
		expect(within(dialog).getByLabelText(/Finished/)).toBeInTheDocument();
		expect(
			within(dialog).getByLabelText("Real duration (hours) Optional")
		).toBeInTheDocument();
		const notes = within(dialog).getByLabelText("Notes Optional");
		await user.type(notes, "Escaped at last");
		await user.type(
			within(dialog).getByLabelText("Real duration (hours) Optional"),
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

	it("marks the run as platinumed after saving the Completed status", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 2, 20, 12));
		const user = userEvent.setup();
		await renderBacklog();

		await user.click(
			within(card("Hades")).getByRole("button", {
				name: "Status of Hades: Playing"
			})
		);
		await user.click(
			within(
				await screen.findByRole("menu", { name: "Change status" })
			).getByRole("menuitemradio", { name: /Completed/ })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Completed?"
		});
		expect(
			within(dialog).queryByLabelText("Platinumed on")
		).not.toBeInTheDocument();

		await user.click(
			within(dialog).getByRole("switch", { name: "Mark as platinumed" })
		);
		const platinumedOn = within(dialog).getByLabelText("Platinumed on");
		await pickCalendarDate(user, platinumedOn, "2026-03-12");
		await user.click(
			within(dialog).getByRole("button", { name: "Confirm" })
		);

		await untilVisible(() =>
			expect(
				within(card("Hades")).getByRole("img", {
					name: "Platinumed in this run on Mar 12, 2026"
				})
			).toBeInTheDocument()
		);
		expect(backlogPatches.map(patch => patch.id)).toEqual(["b1"]);
		expect(platinumPuts).toEqual([
			{
				gameId: "g1",
				body: { backlogId: "b1", platinumedAt: "2026-03-12" }
			}
		]);
	});

	it("shows an existing platinum instead of offering it again when completing", async () => {
		const user = userEvent.setup();
		library = library.map(item =>
			item.id === "b1"
				? {
						...item,
						platinum: {
							id: "platinum-g1",
							backlogId: "b0",
							platformId: null,
							platinumedAt: null,
							notes: null
						}
					}
				: item
		);
		await renderBacklog();

		expect(
			within(card("Hades")).getByRole("img", { name: "Platinumed" })
		).toBeInTheDocument();
		expect(
			within(card("Hades")).queryByText(/^Platinumed on/)
		).not.toBeInTheDocument();

		await user.click(
			within(card("Hades")).getByRole("button", {
				name: "Status of Hades: Playing"
			})
		);
		await user.click(
			within(
				await screen.findByRole("menu", { name: "Change status" })
			).getByRole("menuitemradio", { name: /Completed/ })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Completed?"
		});

		expect(
			within(dialog).getByText("You already platinumed this game")
		).toBeInTheDocument();
		expect(
			within(dialog).queryByRole("switch", { name: "Mark as platinumed" })
		).not.toBeInTheDocument();

		await user.click(
			within(dialog).getByRole("button", { name: "Confirm" })
		);
		await untilVisible(() => expect(backlogPatches).toHaveLength(1));
		expect(platinumPuts).toEqual([]);
		expect(
			within(card("Hades")).getByRole("img", { name: "Platinumed" })
		).toBeInTheDocument();
	});

	it("changes the status from the Hardcore table with a double click and opens a single dialog", async () => {
		const user = userEvent.setup();
		await renderBacklog();

		await user.click(
			screen.queryByRole("radio", { name: /Hardcore/ }) ??
				screen.getByRole("button", { name: /Hardcore/ })
		);
		await user.click(
			await screen.findByRole("button", {
				name: "Status of Hades: Playing"
			})
		);
		await user.dblClick(
			within(
				await screen.findByRole("menu", { name: "Change status" })
			).getByRole("menuitemradio", { name: /Completed/ })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Completed?"
		});
		expect(screen.getAllByRole("dialog")).toEqual([dialog]);
		await user.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		await untilVisible(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		expect(backlogPatches).toEqual([]);
	});

	it("leaves the status alone when the menu is opened and dismissed twice", async () => {
		const user = userEvent.setup();
		await renderBacklog();
		const trigger = () =>
			within(card("Celeste")).getByRole("button", {
				name: "Status of Celeste: Not Started"
			});

		await user.click(trigger());
		await screen.findByRole("menu", { name: "Change status" });
		await user.keyboard("{Escape}");
		await untilVisible(() =>
			expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		);
		await user.click(trigger());
		await user.click(
			within(
				await screen.findByRole("menu", { name: "Change status" })
			).getByRole("menuitemradio", { name: /Not Started/ })
		);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(backlogPatches).toEqual([]);
		expect(trigger()).toBeInTheDocument();
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
			within(playing).queryByLabelText("Notes Optional")
		).not.toBeInTheDocument();
		await user.click(
			within(playing).getByRole("button", { name: "Cancel" })
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await user.click(
			within(card("Celeste")).getByRole("button", {
				name: "Status of Celeste: Not Started"
			})
		);
		await user.click(
			await screen.findByRole("menuitemradio", { name: /Abandoned/ })
		);

		const abandoned = await screen.findByRole("dialog", {
			name: "Abandoned?"
		});
		expect(
			within(abandoned).getByLabelText(/Abandoned on/)
		).toBeInTheDocument();
		expect(
			within(abandoned).getByLabelText("Notes Optional")
		).toHaveAttribute("placeholder", "Why did you drop it?");
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
		const notes = within(editor).getByLabelText("Notes Optional");
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
				.find(button => button.classList.contains("max-sm:!hidden"))!;
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

		it("filters to platinumed games with the Platinum switch", async () => {
			const user = userEvent.setup();
			library = library.map(item =>
				item.id === "b3"
					? {
							...item,
							platinum: {
								id: "platinum-g3",
								backlogId: "b3",
								platformId: null,
								platinumedAt: null,
								notes: null
							}
						}
					: item
			);
			await renderBacklog();
			await openFilters(user);

			await user.click(
				screen.getByRole("switch", { name: "Only platinumed games" })
			);
			await untilVisible(() =>
				expect(
					within(filtersButton()).getByText("1")
				).toBeInTheDocument()
			);
			await showResults(user);

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Celeste"])
			);
			expect(lastLibraryQuery().get("platinumed_only")).toBe("true");
			expect(
				within(card("Celeste")).getByRole("img", {
					name: /^Platinumed/
				})
			).toBeInTheDocument();
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

		it("opens Filters & stats as a sheet on mobile and reaches the filters from it", async () => {
			vi.stubGlobal(
				"matchMedia",
				vi.fn(() => ({
					matches: true,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}))
			);
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

			const trigger = screen.getByRole("button", {
				name: /^Filters & stats, \d+ active$/
			});
			await user.click(trigger);
			const sheet = await screen.findByRole("dialog", {
				name: "Filters & stats"
			});
			expect(sheet).toHaveTextContent("Only PS2");
			expect(
				within(sheet).getByRole("button", { name: "Filters" })
			).toHaveAccessibleDescription("1 active");
			await user.dblClick(
				within(sheet).getByRole("button", { name: "Filters" })
			);

			expect(
				await screen.findByRole("button", { name: /^Platform:/ })
			).toHaveAccessibleName("Platform: PlayStation 2");
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
	describe("bulk actions in Hardcore", () => {
		async function renderHardcore() {
			localStorage.setItem("completr.backlog.viewMode", "hardcore");
			const { fixture } = await render(BacklogHost, {
				providers: [provideHttpClient(), provideHttpClientTesting()],
				routes: []
			});
			TestBed.inject(ApplicationRef).components.push(
				fixture.componentRef
			);
			httpTesting = TestBed.inject(HttpTestingController);
			await untilVisible(() =>
				expect(rowCheckbox("Celeste")).toBeInTheDocument()
			);
		}

		function rowCheckbox(title: string) {
			return screen.getByRole("checkbox", { name: `Select ${title}` });
		}

		function pageCheckbox() {
			return screen.getByRole("checkbox", {
				name: "Select all runs on this page"
			});
		}

		function bar() {
			return within(
				screen.getByRole("toolbar", { name: "Bulk actions" })
			);
		}

		function selectionStatus() {
			return screen
				.getAllByRole("status")
				.find(node => node.getAttribute("aria-atomic") === "true")!;
		}

		function toast(message: string) {
			return within(
				screen.getByText(message).closest("[ngpToast]") as HTMLElement
			);
		}

		it("selects rows, ranges and the page, and clears on Escape and on page change", async () => {
			const user = userEvent.setup();
			reportedTotal = 150;
			secondPage = [
				entry({
					id: "b9",
					game: {
						id: "g9",
						code: "inside",
						title: "Inside",
						isDlc: false
					}
				})
			];
			await renderHardcore();

			await user.click(rowCheckbox("Hades"));
			expect(selectionStatus()).toHaveTextContent("1 run selected");
			expect(rowCheckbox("Hades").closest("tr")).toHaveAttribute(
				"aria-selected",
				"true"
			);
			expect(screen.queryAllByRole("dialog")).toEqual([]);

			await user.keyboard("{Shift>}");
			await user.click(rowCheckbox("Celeste"));
			await user.keyboard("{/Shift}");
			expect(selectionStatus()).toHaveTextContent("3 runs selected");
			expect(pageCheckbox()).toHaveAttribute("aria-checked", "true");

			await user.click(rowCheckbox("Hollow Knight"));
			expect(pageCheckbox()).toHaveAttribute("aria-checked", "mixed");
			await user.click(pageCheckbox());
			expect(selectionStatus()).toHaveTextContent("3 runs selected");

			await user.keyboard("{Escape}");
			expect(selectionStatus()).toHaveTextContent("");
			expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

			await user.click(rowCheckbox("Hades"));
			await user.click(rowCheckbox("Celeste"));
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(rowCheckbox("Inside")).toBeInTheDocument()
			);
			expect(selectionStatus()).toHaveTextContent("");
			expect(rowCheckbox("Inside")).toHaveAttribute(
				"aria-checked",
				"false"
			);
			expect(bulkCalls).toEqual([]);
		});

		it("sends a single favorites batch when the action is double clicked", async () => {
			const user = userEvent.setup();
			favoriteGameIds = ["g2"];
			await renderHardcore();

			await user.click(pageCheckbox());
			await user.dblClick(
				bar().getByRole("button", { name: "Favorite (2)" })
			);
			await untilVisible(() =>
				expect(
					screen.getByText("2 games added to favorites")
				).toBeInTheDocument()
			);

			expect(bulkCalls).toEqual([
				{
					url: `${api}/users/me/favorites/bulk`,
					action: "add",
					body: { gameIds: ["g1", "g3"] }
				}
			]);
			expect(selectionStatus()).toHaveTextContent("");
		});

		it("changes the status of the eligible runs and keeps the skipped ones selected", async () => {
			const user = userEvent.setup();
			library = [
				...initialLibrary(),
				entry({
					id: "b4",
					status: "completed",
					game: {
						id: "g4",
						code: "inside",
						title: "Inside",
						isDlc: false
					}
				})
			];
			queuedIds = ["b2"];
			bulkSkipIds = new Set(["b3"]);
			await renderHardcore();

			await user.click(pageCheckbox());
			await user.click(
				bar().getByRole("button", { name: "Change status (3)" })
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Completed?"
			});
			expect(
				within(dialog).getByText("1 finished run will be skipped")
			).toBeInTheDocument();
			expect(
				within(dialog).getByText(/Runs in Up Next will be removed/)
			).toBeInTheDocument();
			await user.dblClick(
				within(dialog).getByRole("button", { name: "Change 3 runs" })
			);
			await untilVisible(() =>
				expect(
					screen.getByText("2 updated, 1 couldn't be changed")
				).toBeInTheDocument()
			);

			expect(bulkCalls).toEqual([
				{
					url: `${backlogUrl}/bulk`,
					action: "update",
					body: {
						ids: ["b1", "b2", "b3"],
						changes: {
							status: "completed",
							finishedAt: todayLocalDate()
						}
					}
				}
			]);
			expect(selectionStatus()).toHaveTextContent("1 run selected");
			expect(rowCheckbox("Celeste")).toHaveAttribute(
				"aria-checked",
				"true"
			);
			expect(
				within(
					rowCheckbox("Hades").closest("tr") as HTMLElement
				).queryByRole("button", { name: /Status of Hades/ })
			).not.toBeInTheDocument();
			expect(queuedIds).toEqual([]);
		});

		it("rates only the started runs and leaves everything as it was when the request fails", async () => {
			const user = userEvent.setup();
			bulkFailure = 500;
			await renderHardcore();

			await user.click(rowCheckbox("Hades"));
			await user.click(rowCheckbox("Celeste"));
			await user.click(bar().getByRole("button", { name: "Rate (2)" }));
			const dialog = await screen.findByRole("dialog", {
				name: "Rate 1 run?"
			});
			expect(
				within(dialog).getByText("1 not started run will be skipped")
			).toBeInTheDocument();
			const confirm = within(dialog).getByRole("button", {
				name: "Rate 1 run"
			});
			expect(confirm).toBeDisabled();
			within(dialog).getByRole("slider", { name: "Your rating" }).focus();
			await user.keyboard(
				"{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}"
			);
			await user.click(confirm);
			await untilVisible(() =>
				expect(
					screen.getByText(
						"Couldn't update the selected runs. Try again."
					)
				).toBeInTheDocument()
			);

			expect(bulkCalls).toEqual([
				{
					url: `${backlogUrl}/bulk`,
					action: "update",
					body: { ids: ["b1"], changes: { userRating: 2 } }
				}
			]);
			expect(selectionStatus()).toHaveTextContent("2 runs selected");
			expect(
				bar().getByRole("button", { name: "Rate (2)" })
			).toBeEnabled();
		});

		it("rates the not started runs too when the switch is turned on, even after flipping it back and forth", async () => {
			const user = userEvent.setup();
			await renderHardcore();

			await user.click(rowCheckbox("Hades"));
			await user.click(rowCheckbox("Celeste"));
			await user.click(bar().getByRole("button", { name: "Rate (2)" }));
			const dialog = await screen.findByRole("dialog", {
				name: "Rate 1 run?"
			});
			const include = within(dialog).getByRole("switch", {
				name: "Include not started runs"
			});
			expect(include).not.toBeChecked();

			await user.click(include);
			await user.click(include);
			await user.click(include);

			expect(include).toBeChecked();
			expect(
				within(dialog).queryByText("1 not started run will be skipped")
			).not.toBeInTheDocument();
			expect(dialog).toHaveAccessibleName("Rate 2 runs?");
			within(dialog).getByRole("slider", { name: "Your rating" }).focus();
			await user.keyboard("{ArrowRight}{ArrowRight}");
			await user.click(
				within(dialog).getByRole("button", { name: "Rate 2 runs" })
			);
			await untilVisible(() => expect(bulkCalls).toHaveLength(1));

			expect(bulkCalls).toEqual([
				{
					url: `${backlogUrl}/bulk`,
					action: "update",
					body: { ids: ["b1", "b3"], changes: { userRating: 1 } }
				}
			]);
		});

		it("turns the switch on by default when every selected run is not started", async () => {
			const user = userEvent.setup();
			await renderHardcore();

			await user.click(rowCheckbox("Hollow Knight"));
			await user.click(rowCheckbox("Celeste"));
			await user.click(bar().getByRole("button", { name: "Rate (2)" }));
			const dialog = await screen.findByRole("dialog", {
				name: "Rate 2 runs?"
			});
			const include = within(dialog).getByRole("switch", {
				name: "Include not started runs"
			});
			expect(include).toBeChecked();

			await user.click(include);

			expect(dialog).toHaveAccessibleName("Nothing to rate yet");
			expect(
				within(dialog).getByText(
					"All the selected runs are not started. Turn on Include not started runs to rate them."
				)
			).toBeInTheDocument();
			within(dialog).getByRole("slider", { name: "Your rating" }).focus();
			await user.keyboard("{ArrowRight}");
			expect(
				within(dialog).getByRole("button", { name: "Rate" })
			).toBeDisabled();
		});

		it("deletes at once with Undo, and sends the batch only when the toast is dismissed", async () => {
			const user = userEvent.setup();
			await renderHardcore();

			await user.click(rowCheckbox("Hades"));
			await user.click(rowCheckbox("Celeste"));
			await user.click(
				bar().getByRole("button", { name: "Delete runs (2)" })
			);
			expect(
				screen.queryByRole("checkbox", { name: "Select Hades" })
			).toBeNull();
			expect(
				screen.queryByRole("checkbox", { name: "Select Celeste" })
			).toBeNull();
			await user.click(
				toast("2 runs deleted").getByRole("button", { name: /Undo/ })
			);
			await untilVisible(() =>
				expect(rowCheckbox("Celeste")).toBeInTheDocument()
			);
			expect(rowCheckbox("Hades")).toBeInTheDocument();
			expect(bulkCalls).toEqual([]);

			await user.click(rowCheckbox("Hades"));
			await user.click(
				bar().getByRole("button", { name: "Delete runs (1)" })
			);
			await user.click(
				toast("1 run deleted").getByRole("button", { name: "Dismiss" })
			);
			await untilVisible(() => expect(bulkCalls).toHaveLength(1));
			expect(bulkCalls[0]).toEqual({
				url: `${backlogUrl}/bulk`,
				action: "delete",
				body: { ids: ["b1"] }
			});
			expect(
				screen.queryByRole("checkbox", { name: "Select Hades" })
			).toBeNull();
			expect(library.map(item => item.id)).toEqual(["b2", "b3"]);
		});

		it("brings back the rows that the server refused to delete, still selected", async () => {
			const user = userEvent.setup();
			bulkSkipIds = new Set(["b3"]);
			await renderHardcore();

			await user.click(rowCheckbox("Hades"));
			await user.click(rowCheckbox("Celeste"));
			await user.click(
				bar().getByRole("button", { name: "Delete runs (2)" })
			);
			await user.click(
				toast("2 runs deleted").getByRole("button", { name: "Dismiss" })
			);
			await untilVisible(() =>
				expect(rowCheckbox("Celeste")).toBeInTheDocument()
			);
			expect(
				screen.getByText("1 removed, 1 couldn't be changed")
			).toBeInTheDocument();
			expect(rowCheckbox("Celeste")).toHaveAttribute(
				"aria-checked",
				"true"
			);
			expect(
				screen.queryByRole("checkbox", { name: "Select Hades" })
			).toBeNull();
		});

		it("restores and reselects every row when the delete batch fails", async () => {
			const user = userEvent.setup();
			bulkFailure = 500;
			await renderHardcore();

			await user.click(rowCheckbox("Hollow Knight"));
			await user.click(
				bar().getByRole("button", { name: "Delete runs (1)" })
			);
			await user.click(
				toast("1 run deleted").getByRole("button", { name: "Dismiss" })
			);
			await untilVisible(() =>
				expect(rowCheckbox("Hollow Knight")).toBeInTheDocument()
			);
			expect(
				screen.getByText(
					"Couldn't delete the selected runs. Try again."
				)
			).toBeInTheDocument();
			expect(rowCheckbox("Hollow Knight")).toHaveAttribute(
				"aria-checked",
				"true"
			);
			expect(bulkCalls).toHaveLength(1);
		});
	});

	describe("tags picker", () => {
		function tagLibrary(): BacklogEntry[] {
			return initialLibrary().map(item => ({
				...item,
				moodTags:
					{
						b1: ["cozy", "short"],
						b2: ["cozy"],
						b3: []
					}[item.id] ?? []
			}));
		}

		function tagsPicker() {
			return screen.getByRole("button", { name: /^Tags:/ });
		}

		function tagsList() {
			return within(
				screen.getByRole("listbox", { name: "Filter by your tags" })
			);
		}

		async function openTagsPicker(user: UserEvent) {
			await user.click(tagsPicker());
			await screen.findByRole("listbox", { name: "Filter by your tags" });
		}

		function tagOption(name: string) {
			return tagsList().getByRole("option", {
				name: new RegExp(`^${name}\\b`)
			});
		}

		function panelTags() {
			return within(
				within(screen.getByRole("dialog")).getByRole("group", {
					name: "Tags"
				})
			);
		}

		function filtersButton() {
			return screen
				.getAllByRole("button", { name: /^Filters/ })
				.find(button => button.classList.contains("max-sm:!hidden"))!;
		}

		function libraryQueries() {
			return backlogQueries.filter(query => query.get("limit") !== "1");
		}

		function lastLibraryQuery() {
			return libraryQueries().at(-1)!;
		}

		function currentUrl() {
			return new URL(TestBed.inject(Router).url, "http://app.test");
		}

		beforeEach(() => {
			library = tagLibrary();
			myTags = [
				{ tag: "short", usageCount: 1, description: "Under 5 hours" },
				{ tag: "cozy", usageCount: 2, description: null }
			];
		});

		it("sits in the toolbar left of View and no tag row is left above the list", async () => {
			savedViews = [savedView({ id: "v1", name: "Short ones" })];
			await renderBacklog();

			const toolbarButtons = screen
				.getAllByRole("button")
				.filter(button => /^(Tags|View):/.test(button.ariaLabel ?? ""));
			expect(toolbarButtons.map(button => button.ariaLabel)).toEqual([
				"Tags: Any",
				"View: None"
			]);
			expect(
				screen.queryByRole("radiogroup", { name: "Tag source" })
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("group", { name: "Filter by your tags" })
			).not.toBeInTheDocument();
			expect(screen.queryByText(/Community/)).not.toBeInTheDocument();
		});

		it("lists only your tags, most used first, with how many games use each", async () => {
			const user = userEvent.setup();
			await renderBacklog();

			await openTagsPicker(user);

			const [first, second, ...rest] = tagsList().getAllByRole("option");
			expect(first).toHaveAccessibleName("cozy");
			expect(first).toHaveTextContent(/2$/);
			expect(second).toHaveAccessibleName("short");
			expect(second).toHaveTextContent(/1$/);
			expect(rest).toEqual([]);
		});

		it("filters by several of your tags at once and keeps them in the URL", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openTagsPicker(user);

			await user.click(tagOption("cozy"));
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades", "Hollow Knight"])
			);
			await user.click(tagOption("short"));

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			expect(lastLibraryQuery().get("mood_tags")).toBe("cozy,short");
			expect(lastLibraryQuery().has("community_tags")).toBe(false);
			await waitFor(() =>
				expect(currentUrl().searchParams.get("mood_tags")).toBe(
					"cozy,short"
				)
			);
			expect(tagsPicker()).toHaveAccessibleName("Tags: cozy, short");
			expect(within(filtersButton()).getByText("1")).toBeInTheDocument();
		});

		it("ends unfiltered after a double click on the same tag", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openTagsPicker(user);

			await user.dblClick(tagOption("cozy"));

			await untilVisible(() =>
				expect(visibleTitles()).toEqual([
					"Hades",
					"Hollow Knight",
					"Celeste"
				])
			);
			expect(tagOption("cozy")).toHaveAttribute("aria-selected", "false");
			expect(lastLibraryQuery().has("mood_tags")).toBe(false);
			await waitFor(() =>
				expect(currentUrl().searchParams.has("mood_tags")).toBe(false)
			);
		});

		it("opening and closing the picker over and over changes nothing", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			const queriesBefore = libraryQueries().length;

			for (let round = 0; round < 3; round++) {
				await openTagsPicker(user);
				await user.keyboard("{Escape}");
				await waitFor(() =>
					expect(
						screen.queryByRole("listbox", {
							name: "Filter by your tags"
						})
					).not.toBeInTheDocument()
				);
			}
			await user.dblClick(tagsPicker());
			await user.keyboard("{Escape}");
			answerPending();

			expect(libraryQueries()).toHaveLength(queriesBefore);
			expect(tagsPicker()).toHaveAccessibleName("Tags: Any");
			expect(currentUrl().searchParams.has("mood_tags")).toBe(false);
		});

		it("selects and clears in a rapid burst and ends with the last choice", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openTagsPicker(user);

			await user.click(tagOption("cozy"));
			await user.click(tagOption("short"));
			await user.click(
				tagsList().getByRole("option", { name: /^short/ })
			);
			await user.click(screen.getByRole("button", { name: "Clear" }));
			await user.click(tagOption("short"));

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			expect(lastLibraryQuery().get("mood_tags")).toBe("short");
			expect(tagOption("short")).toHaveAttribute("aria-selected", "true");
			expect(tagOption("cozy")).toHaveAttribute("aria-selected", "false");
			await waitFor(() =>
				expect(currentUrl().searchParams.get("mood_tags")).toBe("short")
			);
		});

		it("refuses an eleventh tag and keeps the previous ten", async () => {
			const user = userEvent.setup();
			myTags = Array.from({ length: 11 }, (_, index) => ({
				tag: `t${index + 1}`,
				usageCount: 11 - index,
				description: null
			}));
			await render(BacklogList, {
				providers: [provideHttpClient(), provideHttpClientTesting()],
				routes: [{ path: "**", component: BacklogList }],
				initialRoute: `/?mood_tags=${myTags
					.slice(0, 10)
					.map(tag => tag.tag)
					.join(",")}`
			});
			httpTesting = TestBed.inject(HttpTestingController);
			await untilVisible(() =>
				expect(tagsPicker()).toHaveAccessibleName("Tags: 10 tags")
			);
			await openTagsPicker(user);

			await user.click(tagOption("t11"));
			answerPending();

			expect(tagOption("t11")).toHaveAttribute("aria-selected", "false");
			expect(
				lastLibraryQuery().get("mood_tags")?.split(",")
			).toHaveLength(10);
			expect(tagsPicker()).toHaveAccessibleName("Tags: 10 tags");
		});

		it("lets Surprise me inherit the selected tags", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openTagsPicker(user);
			await user.click(tagOption("cozy"));
			await user.keyboard("{Escape}");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades", "Hollow Knight"])
			);

			backlogQueries.length = 0;
			await user.click(
				screen.getByRole("button", { name: /Surprise me/ })
			);
			await untilVisible(() =>
				expect(backlogQueries.length).toBeGreaterThan(0)
			);
			expect(
				backlogQueries.every(
					query =>
						query.get("mood_tags") === "cozy" &&
						!query.has("community_tags")
				)
			).toBe(true);
		});

		it("cleans up garbage tags in the URL before asking the API", async () => {
			await render(BacklogList, {
				providers: [provideHttpClient(), provideHttpClientTesting()],
				routes: [{ path: "**", component: BacklogList }],
				initialRoute: "/?mood_tags=,, COZY ,cozy,,"
			});
			httpTesting = TestBed.inject(HttpTestingController);

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades", "Hollow Knight"])
			);
			expect(
				libraryQueries().every(
					query => query.get("mood_tags") === "cozy"
				)
			).toBe(true);
			await waitFor(() =>
				expect(currentUrl().searchParams.get("mood_tags")).toBe("cozy")
			);
			expect(tagsPicker()).toHaveAccessibleName("Tags: cozy");
		});

		it("ignores the community tags of an old link", async () => {
			await render(BacklogList, {
				providers: [provideHttpClient(), provideHttpClientTesting()],
				routes: [{ path: "**", component: BacklogList }],
				initialRoute: "/?community_tags=metroidvania"
			});
			httpTesting = TestBed.inject(HttpTestingController);

			await untilVisible(() =>
				expect(visibleTitles()).toEqual([
					"Hades",
					"Hollow Knight",
					"Celeste"
				])
			);
			expect(
				libraryQueries().every(
					query =>
						!query.has("community_tags") && !query.has("mood_tags")
				)
			).toBe(true);
			expect(tagsPicker()).toHaveAccessibleName("Tags: Any");
		});

		it("keeps a linked tag you no longer use selectable so it can be removed", async () => {
			const user = userEvent.setup();
			await render(BacklogList, {
				providers: [provideHttpClient(), provideHttpClientTesting()],
				routes: [{ path: "**", component: BacklogList }],
				initialRoute: "/?mood_tags=gone"
			});
			httpTesting = TestBed.inject(HttpTestingController);
			await untilVisible(() => expect(visibleTitles()).toEqual([]));

			await openTagsPicker(user);
			expect(tagOption("gone")).toHaveAttribute("aria-selected", "true");
			await user.click(tagOption("gone"));

			await untilVisible(() =>
				expect(visibleTitles()).toEqual([
					"Hades",
					"Hollow Knight",
					"Celeste"
				])
			);
			await waitFor(() =>
				expect(currentUrl().searchParams.has("mood_tags")).toBe(false)
			);
		});

		it("hides the picker when you have no tags and invites you to manage them in the panel", async () => {
			const user = userEvent.setup();
			myTags = [];
			await renderBacklog();

			expect(
				screen.queryByRole("button", { name: /^Tags:/ })
			).not.toBeInTheDocument();
			await user.click(filtersButton());
			expect(panelTags().getByText(/No tags yet/)).toBeInTheDocument();
			expect(
				panelTags().getByRole("link", { name: "Manage tags" })
			).toHaveAttribute("href", "/tags");
		});

		it("shows your tags in the filters panel as chips, most used first", async () => {
			const user = userEvent.setup();
			await renderBacklog();

			await user.click(filtersButton());
			const chips = panelTags()
				.getAllByRole("button")
				.filter(button => button.hasAttribute("data-chip-value"));

			expect(
				chips.map(chip => chip.getAttribute("data-chip-value"))
			).toEqual(["cozy", "short"]);
			expect(panelTags().queryByRole("textbox")).not.toBeInTheDocument();
			expect(
				panelTags().queryByRole("radiogroup", { name: "Tag source" })
			).not.toBeInTheDocument();
		});

		it("shares the selection between the picker, the filters panel and the URL", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openTagsPicker(user);
			await user.click(tagOption("cozy"));
			await user.keyboard("{Escape}");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades", "Hollow Knight"])
			);

			await user.click(filtersButton());
			const panelCozy = panelTags().getByRole("button", {
				name: /^cozy\b/
			});
			expect(panelCozy).toHaveAttribute("aria-pressed", "true");

			await user.click(panelCozy);
			await user.click(
				panelTags().getByRole("button", { name: /^short\b/ })
			);
			expect(tagsPicker()).toHaveAccessibleName("Tags: short");
			await user.click(
				screen.getByRole("button", { name: /^(Save & )?[Ss]how/ })
			);

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			expect(lastLibraryQuery().get("mood_tags")).toBe("short");
			await waitFor(() =>
				expect(currentUrl().searchParams.get("mood_tags")).toBe("short")
			);
		});

		it("clears the tags with the Clear button of the toolbar", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openTagsPicker(user);
			await user.click(tagOption("cozy"));
			await user.keyboard("{Escape}");

			await user.click(
				await screen.findByRole("button", {
					name: "Clear 1 active filter"
				})
			);

			await untilVisible(() =>
				expect(visibleTitles()).toEqual([
					"Hades",
					"Hollow Knight",
					"Celeste"
				])
			);
			expect(lastLibraryQuery().has("mood_tags")).toBe(false);
			expect(tagsPicker()).toHaveAccessibleName("Tags: Any");
			await waitFor(() =>
				expect(currentUrl().searchParams.has("mood_tags")).toBe(false)
			);
		});

		it("lets the user retry when the tags fail to load, and then shows the picker", async () => {
			const user = userEvent.setup();
			myTagsStatus = 503;
			await renderBacklog();

			expect(
				screen.queryByRole("button", { name: /^Tags:/ })
			).not.toBeInTheDocument();
			await user.click(filtersButton());
			expect(
				panelTags().getByText("Couldn't load these tags.")
			).toBeInTheDocument();
			myTagsStatus = 200;
			await user.click(
				panelTags().getByRole("button", { name: "Try again" })
			);

			await untilVisible(() =>
				expect(
					panelTags().getByRole("button", { name: /^cozy\b/ })
				).toBeInTheDocument()
			);
			expect(tagsPicker()).toHaveAccessibleName("Tags: Any");
			expect(myTagsRequests).toBe(2);
		});

		it("saves the selected tags with a new view", async () => {
			const user = userEvent.setup();
			await renderBacklog();
			await openTagsPicker(user);
			await user.click(tagOption("cozy"));
			await user.keyboard("{Escape}");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades", "Hollow Knight"])
			);

			await user.click(filtersButton());
			await user.type(
				await screen.findByRole("textbox", { name: "View name" }),
				"Chill"
			);
			await user.click(
				screen.getByRole("button", { name: /^Save & [Ss]how/ })
			);
			answerPending();

			const created = savedViewWrites.find(
				write => write.method === "POST"
			);
			expect(created?.body).toMatchObject({
				name: "Chill",
				filters: { mood_tags: "cozy" }
			});
			expect(
				(created?.body as { filters: Record<string, string> }).filters
			).not.toHaveProperty("community_tags");
		});

		it("shows the tags of each entry on its Diary card", async () => {
			await renderBacklog();

			expect(within(card("Hades")).getByText("cozy")).toBeInTheDocument();
			expect(
				within(card("Hades")).getByText("short")
			).toBeInTheDocument();
		});
	});

	describe("modified saved views", () => {
		function viewLibrary(): BacklogEntry[] {
			return initialLibrary().map(item => ({
				...item,
				moodTags:
					{
						b1: ["cozy", "short"],
						b2: ["cozy"],
						b3: []
					}[item.id] ?? [],
				platinum:
					item.id === "b2"
						? {
								id: "platinum-g2",
								backlogId: "b2",
								platformId: null,
								platinumedAt: null,
								notes: null
							}
						: undefined
			}));
		}

		function toPlay(overrides: Partial<SavedFilter> = {}) {
			return savedView({
				id: "v1",
				name: "To play",
				filters: { status: "not_started" },
				sortBy: "createdAt",
				sortOrder: "desc",
				icon: "flag",
				color: "blue",
				...overrides
			});
		}

		function playingNow() {
			return savedView({
				id: "v2",
				name: "Playing now",
				filters: { status: "playing" }
			});
		}

		async function renderViews(initialRoute = "/") {
			const { fixture } = await render(BacklogHost, {
				providers: [provideHttpClient(), provideHttpClientTesting()],
				routes: [],
				initialRoute
			});
			TestBed.inject(ApplicationRef).components.push(
				fixture.componentRef
			);
			httpTesting = TestBed.inject(HttpTestingController);
			await untilVisible(() =>
				expect(visibleTitles().length).toBeGreaterThan(0)
			);
		}

		function viewPicker() {
			return screen.getByRole("button", { name: /^View:/ });
		}

		async function openViewMenu(user: UserEvent) {
			await user.click(viewPicker());
			return screen.findByRole("menu");
		}

		async function chooseView(user: UserEvent, name: string) {
			const menu = await openViewMenu(user);
			await user.click(
				within(menu).getByRole("menuitemradio", {
					name: new RegExp(`^${name}`)
				})
			);
			answerPending();
		}

		async function runViewAction(user: UserEvent, label: string) {
			const menu = await openViewMenu(user);
			await user.click(
				within(menu).getByRole("menuitem", { name: label })
			);
		}

		async function pickStatusPill(user: UserEvent, name: RegExp) {
			await user.click(statusPills().getByRole("button", { name }));
			answerPending();
		}

		function libraryQueries() {
			return backlogQueries.filter(query => query.get("limit") !== "1");
		}

		function lastLibraryQuery() {
			return libraryQueries().at(-1)!;
		}

		function currentUrl() {
			return new URL(TestBed.inject(Router).url, "http://app.test");
		}

		function viewPatches() {
			return savedViewWrites.filter(write => write.method === "PATCH");
		}

		function filtersButton() {
			return screen
				.getAllByRole("button", { name: /^Filters/ })
				.find(button => button.classList.contains("max-sm:!hidden"))!;
		}

		beforeEach(() => {
			library = viewLibrary();
			myTags = [
				{ tag: "short", usageCount: 1, description: null },
				{ tag: "cozy", usageCount: 2, description: null }
			];
		});

		it("keeps the view when a status chip changes and stops being modified once back to the saved filters", async () => {
			const user = userEvent.setup();
			savedViews = [toPlay()];
			await renderViews();
			await chooseView(user, "To play");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: To play");

			await pickStatusPill(user, /Playing/);

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			expect(viewPicker()).toHaveAccessibleName(
				"View: To play (modified)"
			);
			expect(
				viewPicker().querySelector("[data-modified-indicator]")
			).not.toBeNull();
			expect(lastLibraryQuery().get("status")).toBe("playing");
			await waitFor(() => {
				expect(currentUrl().searchParams.get("savedFilterId")).toBe(
					"v1"
				);
				expect(currentUrl().searchParams.get("status")).toBe("playing");
			});

			await pickStatusPill(user, /Not Started/);

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: To play");
			expect(
				viewPicker().querySelector("[data-modified-indicator]")
			).toBeNull();
			await waitFor(() =>
				expect(currentUrl().searchParams.has("status")).toBe(false)
			);
			expect(currentUrl().searchParams.get("savedFilterId")).toBe("v1");
			expect(
				screen.getByRole("button", {
					name: "Exit the saved view and show all games"
				})
			).toBeInTheDocument();
		});

		it("adds tags and panel filters on top of the view and saves them all with Save to view", async () => {
			const user = userEvent.setup();
			savedViews = [toPlay()];
			await renderViews();
			await chooseView(user, "To play");

			await user.click(screen.getByRole("button", { name: /^Tags:/ }));
			await user.click(
				within(
					await screen.findByRole("listbox", {
						name: "Filter by your tags"
					})
				).getByRole("option", { name: /^cozy\b/ })
			);
			await user.keyboard("{Escape}");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight"])
			);
			expect(viewPicker()).toHaveAccessibleName(
				"View: To play (modified)"
			);

			await user.click(filtersButton());
			await user.click(
				await screen.findByRole("switch", {
					name: "Only platinumed games"
				})
			);
			await user.click(
				screen.getByRole("button", { name: /^(Save & )?[Ss]how/ })
			);
			answerPending();

			await untilVisible(() =>
				expect(lastLibraryQuery().get("platinumed_only")).toBe("true")
			);
			expect(lastLibraryQuery().get("status")).toBe("not_started");
			expect(lastLibraryQuery().get("mood_tags")).toBe("cozy");
			expect(viewPicker()).toHaveAccessibleName(
				"View: To play (modified)"
			);

			await runViewAction(user, "Save to view");
			answerPending();

			expect(viewPatches()).toEqual([
				{
					method: "PATCH",
					url: `${api}/users/me/saved-filters/v1`,
					body: {
						filters: {
							status: "not_started",
							mood_tags: "cozy",
							platinumed_only: "true"
						},
						sortBy: "createdAt",
						sortOrder: "desc"
					}
				}
			]);
			expect(savedViews[0]).toMatchObject({
				name: "To play",
				icon: "flag",
				color: "blue",
				showInBacklog: true,
				isDefault: false
			});
			expect(viewPicker()).toHaveAccessibleName("View: To play");
			expect(
				await screen.findByText("Saved your changes to To play.")
			).toBeInTheDocument();
			await waitFor(() => {
				expect(currentUrl().searchParams.has("mood_tags")).toBe(false);
				expect(currentUrl().searchParams.has("platinumed_only")).toBe(
					false
				);
			});
			expect(currentUrl().searchParams.get("savedFilterId")).toBe("v1");
		});

		it("sends a single PATCH when Save to view or Update current view is double clicked", async () => {
			const user = userEvent.setup();
			holdViewPatches = true;
			savedViews = [toPlay()];
			await renderViews();
			await chooseView(user, "To play");
			await pickStatusPill(user, /Playing/);
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);

			const menu = await openViewMenu(user);
			await user.dblClick(
				within(menu).getByRole("menuitem", { name: "Save to view" })
			);
			answerPending();
			expect(viewPatches()).toHaveLength(1);

			heldViewPatches
				.splice(0)
				.forEach(req => respondToViewPatch(req, null));
			await pickStatusPill(user, /^All/);
			await user.click(filtersButton());
			await user.dblClick(
				await screen.findByRole("button", {
					name: /Update current view/
				})
			);
			answerPending();

			expect(viewPatches()).toHaveLength(2);
			heldViewPatches
				.splice(0)
				.forEach(req => respondToViewPatch(req, null));
			answerPending();
			expect(savedViews[0].filters).toEqual({});
		});

		it("resets to the filters being saved when Reset is pressed during a save", async () => {
			const user = userEvent.setup();
			holdViewPatches = true;
			savedViews = [toPlay()];
			await renderViews();
			await chooseView(user, "To play");
			await pickStatusPill(user, /Playing/);
			await runViewAction(user, "Save to view");
			answerPending();
			expect(viewPicker()).toHaveAccessibleName("View: To play");

			await pickStatusPill(user, /Not Started/);
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(viewPicker()).toHaveAccessibleName(
				"View: To play (modified)"
			);
			await runViewAction(user, "Reset view");

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: To play");

			heldViewPatches
				.splice(0)
				.forEach(req => respondToViewPatch(req, null));
			answerPending();

			expect(viewPatches()).toHaveLength(1);
			expect(savedViews[0].filters).toEqual({ status: "playing" });
			expect(viewPicker()).toHaveAccessibleName("View: To play");
			expect(visibleTitles()).toEqual(["Hades"]);
		});

		it("rolls the view back and warns when Save to view fails, keeping the changes on screen", async () => {
			const user = userEvent.setup();
			viewPatchFailure = 500;
			savedViews = [toPlay()];
			await renderViews();
			await chooseView(user, "To play");
			await pickStatusPill(user, /Playing/);

			await runViewAction(user, "Save to view");
			answerPending();

			expect(
				await screen.findByText(
					"Couldn't save your changes to To play. Try again."
				)
			).toBeInTheDocument();
			expect(viewPicker()).toHaveAccessibleName(
				"View: To play (modified)"
			);
			expect(visibleTitles()).toEqual(["Hades"]);
			expect(savedViews[0].filters).toEqual({ status: "not_started" });
			await waitFor(() =>
				expect(currentUrl().searchParams.get("status")).toBe("playing")
			);

			await runViewAction(user, "Reset view");

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: To play");
		});

		it("discards the pending changes when another view or None is picked", async () => {
			const user = userEvent.setup();
			savedViews = [toPlay(), playingNow()];
			await renderViews();
			await chooseView(user, "To play");
			await pickStatusPill(user, /Playing/);
			expect(viewPicker()).toHaveAccessibleName(
				"View: To play (modified)"
			);

			await chooseView(user, "Playing now");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: Playing now");

			await chooseView(user, "To play");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: To play");

			await pickStatusPill(user, /Playing/);
			await chooseView(user, "None");
			await untilVisible(() =>
				expect(visibleTitles()).toEqual([
					"Hades",
					"Hollow Knight",
					"Celeste"
				])
			);
			expect(viewPicker()).toHaveAccessibleName("View: None");
			expect(viewPatches()).toEqual([]);
			await waitFor(() => expect(currentUrl().search).toBe(""));
		});

		it("turns the toolbar Clear into Reset view while the view is modified and into Exit view otherwise", async () => {
			const user = userEvent.setup();
			savedViews = [toPlay()];
			await renderViews();
			await chooseView(user, "To play");
			await pickStatusPill(user, /Playing/);

			await user.click(
				screen.getByRole("button", {
					name: "Discard your changes and go back to the saved view"
				})
			);
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: To play");

			await user.click(
				screen.getByRole("button", {
					name: "Exit the saved view and show all games"
				})
			);
			await untilVisible(() =>
				expect(visibleTitles()).toEqual([
					"Hades",
					"Hollow Knight",
					"Celeste"
				])
			);
			expect(viewPicker()).toHaveAccessibleName("View: None");
		});

		it("restores the changes of a reloaded link once, replacing the view filters instead of adding to them", async () => {
			savedViews = [
				toPlay({
					filters: { status: "not_started", mood_tags: "cozy" }
				})
			];
			await renderViews("/?savedFilterId=v1&mood_tags=short&status=");

			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			expect(lastLibraryQuery().get("mood_tags")).toBe("short");
			expect(lastLibraryQuery().has("status")).toBe(false);
			expect(viewPicker()).toHaveAccessibleName(
				"View: To play (modified)"
			);
			expect(
				screen.getByRole("button", { name: /^Tags:/ })
			).toHaveAccessibleName("Tags: short");
			expect(
				libraryQueries().filter(
					query => query.get("mood_tags") === "cozy"
				)
			).toEqual([]);
		});

		it("keeps the URL of an untouched default view clean and names the view once it changes", async () => {
			const user = userEvent.setup();
			savedViews = [toPlay({ isDefault: true })];
			await renderViews();
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(currentUrl().search).toBe("");

			await pickStatusPill(user, /Playing/);

			await waitFor(() =>
				expect(currentUrl().searchParams.get("savedFilterId")).toBe(
					"v1"
				)
			);
			expect(currentUrl().searchParams.get("status")).toBe("playing");

			await pickStatusPill(user, /Not Started/);
			await waitFor(() => expect(currentUrl().search).toBe(""));
		});

		it("links Manage saved views in the View menu to the saved views page", async () => {
			const user = userEvent.setup();
			savedViews = [toPlay()];
			await renderViews();

			const menu = await openViewMenu(user);
			const manage = within(menu).getByRole("menuitem", {
				name: "Manage saved views"
			});

			expect(manage.tagName).toBe("A");
			expect(manage).toHaveAttribute("href", "/saved-views");
		});

		describe("stats", () => {
			function entriesTile() {
				const stats = screen.getByRole("region", { name: "Stats" });
				return within(stats).getByText("Entries").closest("li")!;
			}

			function statsQuery(index = -1) {
				const req = statsRequests.at(index)!;
				return Object.fromEntries(
					req.request.params
						.keys()
						.map(key => [key, req.request.params.get(key)])
				);
			}

			beforeEach(() => {
				statsStatus = 200;
			});

			it("computes the stats of a modified view with the applied filters, without any notice", async () => {
				const user = userEvent.setup();
				savedViews = [toPlay()];
				await renderViews();
				await chooseView(user, "To play");
				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("2")
				);
				expect(statsRequests).toHaveLength(1);
				expect(statsQuery()).toEqual({});

				await pickStatusPill(user, /Playing/);

				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("1")
				);
				expect(statsRequests).toHaveLength(2);
				expect(statsRequests[1].request.url).toBe(
					`${api}/users/me/saved-filters/v1/stats`
				);
				expect(statsQuery()).toEqual({
					status: "playing",
					sort_by: "createdAt",
					sort_order: "desc"
				});
				expect(
					screen.queryByText(/These stats are for the saved filters/)
				).not.toBeInTheDocument();
			});

			it("keeps a removed filter out of the stats instead of falling back to the saved ones", async () => {
				const user = userEvent.setup();
				savedViews = [toPlay()];
				await renderViews();
				await chooseView(user, "To play");
				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("2")
				);

				await pickStatusPill(user, /^All/);

				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("3")
				);
				expect(statsQuery()).toEqual({
					sort_by: "createdAt",
					sort_order: "desc"
				});
			});

			it("asks again without the applied filters only once Save to view is confirmed", async () => {
				const user = userEvent.setup();
				holdViewPatches = true;
				savedViews = [toPlay()];
				await renderViews();
				await chooseView(user, "To play");
				await pickStatusPill(user, /Playing/);
				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("1")
				);
				expect(statsRequests).toHaveLength(2);

				const menu = await openViewMenu(user);
				await user.dblClick(
					within(menu).getByRole("menuitem", {
						name: "Save to view"
					})
				);
				answerPending();
				expect(viewPatches()).toHaveLength(1);
				expect(statsRequests).toHaveLength(2);

				heldViewPatches
					.splice(0)
					.forEach(req => respondToViewPatch(req, null));
				answerPending();

				await untilVisible(() => expect(statsRequests).toHaveLength(3));
				expect(statsQuery()).toEqual({});
				expect(entriesTile()).toHaveTextContent("1");
				answerPending();
				expect(statsRequests).toHaveLength(3);
			});

			it("keeps the applied filters in the stats when Save to view fails", async () => {
				const user = userEvent.setup();
				viewPatchFailure = 500;
				savedViews = [toPlay()];
				await renderViews();
				await chooseView(user, "To play");
				await pickStatusPill(user, /Playing/);
				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("1")
				);

				await runViewAction(user, "Save to view");
				answerPending();

				await untilVisible(() =>
					expect(viewPicker()).toHaveAccessibleName(
						"View: To play (modified)"
					)
				);
				expect(statsRequests).toHaveLength(2);
				expect(entriesTile()).toHaveTextContent("1");
			});

			it("goes back to the saved stats with Reset view and drops an answer that arrives too late", async () => {
				const user = userEvent.setup();
				savedViews = [toPlay()];
				await renderViews();
				await chooseView(user, "To play");
				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("2")
				);

				holdStats = true;
				await pickStatusPill(user, /Playing/);
				await pickStatusPill(user, /^All/);
				await runViewAction(user, "Reset view");
				answerPending();

				const [playing, all, reset] = heldStats.splice(0);
				expect(heldStats).toEqual([]);
				expect(playing.cancelled).toBe(true);
				expect(all.cancelled).toBe(true);
				expect(reset.request.params.keys()).toEqual([]);
				respondToStats(reset);

				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("2")
				);
				expect(viewPicker()).toHaveAccessibleName("View: To play");
			});

			it("sends one stats request per change even when a status chip is double clicked", async () => {
				const user = userEvent.setup();
				savedViews = [toPlay()];
				await renderViews();
				await chooseView(user, "To play");
				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("2")
				);

				await user.dblClick(
					statusPills().getByRole("button", { name: /Playing/ })
				);
				answerPending();
				await user.click(
					screen.getByRole("button", { name: /^Tags:/ })
				);
				await user.click(
					within(
						await screen.findByRole("listbox", {
							name: "Filter by your tags"
						})
					).getByRole("option", { name: /^cozy\b/ })
				);
				await user.keyboard("{Escape}");

				await untilVisible(() =>
					expect(entriesTile()).toHaveTextContent("1")
				);
				expect(
					statsRequests.map(req =>
						req.request.params.get("mood_tags")
					)
				).toEqual([null, null, "cozy"]);
				expect(statsQuery()).toMatchObject({
					status: "playing",
					mood_tags: "cozy"
				});
			});
		});

		it("offers Save to view and Reset view on mobile, in Filters & stats and in the View sheet", async () => {
			vi.stubGlobal(
				"matchMedia",
				vi.fn(() => ({
					matches: true,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}))
			);
			const user = userEvent.setup();
			savedViews = [toPlay({ isDefault: true })];
			await renderViews();
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			await pickStatusPill(user, /Playing/);
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);

			await user.click(
				screen.getByRole("button", { name: /^Filters & stats/ })
			);
			const tools = await screen.findByRole("dialog", {
				name: "Filters & stats"
			});
			expect(tools).toHaveTextContent("To play · Modified");
			await user.click(
				within(tools).getByRole("button", { name: /^Reset view/ })
			);
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hollow Knight", "Celeste"])
			);
			expect(viewPicker()).toHaveAccessibleName("View: To play");

			await pickStatusPill(user, /Playing/);
			await untilVisible(() =>
				expect(visibleTitles()).toEqual(["Hades"])
			);
			await user.click(viewPicker());
			const sheet = await screen.findByRole("dialog", {
				name: "Saved views"
			});
			expect(
				within(sheet).getByRole("button", { name: /^To play/ })
			).toHaveTextContent("Modified");
			await user.dblClick(
				within(sheet).getByRole("button", { name: /Save to view/ })
			);
			answerPending();

			expect(viewPatches()).toHaveLength(1);
			expect(savedViews[0].filters).toEqual({ status: "playing" });
			expect(viewPicker()).toHaveAccessibleName("View: To play");
		});
	});
});
