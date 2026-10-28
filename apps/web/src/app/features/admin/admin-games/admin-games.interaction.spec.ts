import "@testing-library/jest-dom/vitest";

import { type HttpRequest } from "@angular/common/http";
import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastService } from "../../../core/services/toast";
import { AdminGames } from "./admin-games";

type ResponseBody = Parameters<TestRequest["flush"]>[0];

interface ApiResponse {
	status: number;
	body: ResponseBody;
}

interface StoredGame {
	id: string;
	code: string;
	title: string;
	isActive: boolean;
	isDlc: boolean;
	variant?: string;
	platforms: { abbreviation: string }[];
	scores: { source: string; score: number }[];
	times: { source: string; duration: number }[];
}

const api = environment.apiUrl;
const gamesUrl = `${api}/games`;

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const failure = (status: number): ApiResponse => ({
	status,
	body: { type: "ERROR", title: "ERROR" }
});

function storedGame(
	id: string,
	title: string,
	overrides: Partial<StoredGame> = {}
): StoredGame {
	return {
		id,
		code: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
		title,
		isActive: true,
		isDlc: false,
		platforms: [{ abbreviation: "PC" }],
		scores: [{ source: "metacritic", score: 80 }],
		times: [{ source: "hltb", duration: 10 }],
		...overrides
	};
}

function initialCatalog(): StoredGame[] {
	const alphas = Array.from({ length: 120 }, (_, index) => {
		const number = String(index + 1).padStart(3, "0");
		return storedGame(`a${number}`, `Alpha ${number}`);
	});
	return [
		storedGame("zelda", "Zelda: Breath of the Wild", { scores: [] }),
		storedGame("pokemon", "Pokémon Rojo", { times: [] }),
		storedGame("nandu", "Ñandú Quest 🎮", { platforms: [] }),
		...alphas,
		storedGame("dead1", "Dead Game One", { isActive: false }),
		storedGame("dead2", "Dead Game Two", { isActive: false })
	];
}

describe("AdminGames interaction", () => {
	let httpTesting: HttpTestingController;
	let catalog: StoredGame[];
	let pendingReports: { id: string; gameId: string }[];
	let held: (request: HttpRequest<unknown>) => boolean;
	let nextGamesFailure: ApiResponse | null;
	let reactivateFailure: ApiResponse | null;
	let reportsFailure: ApiResponse | null;
	let detailFailure: ApiResponse | null;
	let deactivateFailure: ApiResponse | null;
	let scoreSourcesFailure: ApiResponse | null;
	let unexpectedRequests: string[];
	const gamesQueries: URLSearchParams[] = [];
	const reactivations: string[] = [];
	const deactivations: string[] = [];
	const detailRequests: string[] = [];
	const toast = {
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	};

	function listGames(req: TestRequest): ApiResponse {
		const params = req.request.params;
		gamesQueries.push(new URLSearchParams(params.toString()));
		if (nextGamesFailure) {
			const response = nextGamesFailure;
			nextGamesFailure = null;
			return response;
		}
		const search = params.get("search")?.toLowerCase();
		const noScoreSources = params.get("no_score_source")?.split(",");
		const noTimeSources = params.get("no_time_source")?.split(",");
		const found = catalog.filter(game => {
			if (params.get("only_inactive") === "true") {
				if (game.isActive) return false;
			} else if (
				params.get("include_inactive") !== "true" &&
				!game.isActive
			)
				return false;
			if (search && !game.title.toLowerCase().includes(search))
				return false;
			if (params.get("no_scores") === "true" && game.scores.length > 0)
				return false;
			if (params.get("no_times") === "true" && game.times.length > 0)
				return false;
			if (
				params.get("no_platforms") === "true" &&
				game.platforms.length > 0
			)
				return false;
			if (
				noScoreSources?.some(src =>
					game.scores.some(score => score.source === src)
				)
			)
				return false;
			if (
				noTimeSources?.some(src =>
					game.times.some(time => time.source === src)
				)
			)
				return false;
			return true;
		});
		const offset = Number(params.get("offset") ?? 0);
		const limit = Number(params.get("limit") ?? 50);
		return ok({
			data: {
				games: found.slice(offset, offset + limit),
				total: found.length,
				limit,
				offset
			}
		});
	}

	function reactivate(id: string): ApiResponse {
		reactivations.push(id);
		if (reactivateFailure) return reactivateFailure;
		const game = catalog.find(g => g.id === id);
		if (!game) return failure(404);
		game.isActive = true;
		return ok({ data: { game } });
	}

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url } = req.request;
		if (method === "GET" && url === gamesUrl) return listGames(req);
		if (method === "GET" && url === `${api}/score-sources`)
			return (
				scoreSourcesFailure ??
				ok({
					data: {
						sources: [
							{
								code: "metacritic",
								name: "Metacritic",
								scale: 100,
								priority: 1
							},
							{
								code: "completr",
								name: "Completr",
								scale: 5,
								priority: 2
							}
						]
					}
				})
			);
		if (method === "GET" && url === `${api}/admin/game-reports`)
			return reportsFailure ?? ok({ data: { reports: pendingReports } });
		if (method === "GET" && url === `${api}/platforms`)
			return ok({ data: { platforms: [] } });
		if (method === "GET" && url === `${api}/genres`)
			return ok({ data: { genres: [] } });
		if (method === "GET" && url === `${api}/franchises`)
			return ok({ data: { franchises: [], total: 0 } });
		const gameMatch = url.match(/\/games\/([^/?]+)$/);
		if (method === "GET" && gameMatch) {
			detailRequests.push(gameMatch[1]);
			if (detailFailure) return detailFailure;
			const found = catalog.find(g => g.code === gameMatch[1]);
			if (!found) return failure(404);
			return ok({ data: { game: { ...found, genres: [] } } });
		}
		if (method === "DELETE" && gameMatch) {
			deactivations.push(gameMatch[1]);
			if (deactivateFailure) return deactivateFailure;
			const found = catalog.find(g => g.id === gameMatch[1]);
			if (!found) return failure(404);
			found.isActive = false;
			return { status: 204, body: null };
		}
		const reactivateMatch = url.match(/\/games\/([^/]+)\/reactivate$/);
		if (method === "POST" && reactivateMatch)
			return reactivate(reactivateMatch[1]);
		unexpectedRequests.push(`${method} ${url}`);
		return null;
	}

	function answer(req: TestRequest) {
		const response = handle(req);
		if (!response || req.cancelled) return;
		req.flush(response.body, {
			status: response.status,
			statusText: String(response.status)
		});
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(req => !held(req));
			if (pending.length === 0) break;
			pending.forEach(answer);
		}
		if (unexpectedRequests.length > 0)
			throw new Error(`Unexpected request: ${unexpectedRequests[0]}`);
	}

	async function nextGamesRequest() {
		let found: TestRequest | undefined;
		await waitFor(() => {
			[found] = httpTesting.match(
				req => req.method === "GET" && req.url === gamesUrl
			);
			expect(found).toBeDefined();
		});
		return found as TestRequest;
	}

	async function settle() {
		await new Promise(resolve => setTimeout(resolve, 30));
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function searchBox() {
		return screen.getByRole("textbox", { name: "Search games" });
	}

	function chip(name: string) {
		return screen.getByRole("button", { name });
	}

	function statusOption(name: string) {
		return within(
			screen.getByRole("radiogroup", { name: "Game status" })
		).getByRole("radio", { name });
	}

	function rowOf(title: string) {
		return screen.getByText(title).closest("li") as HTMLElement;
	}

	function titlesOnScreen() {
		return screen
			.queryAllByRole("listitem")
			.map(item => item.querySelector("a, span.font-medium"))
			.filter((el): el is Element => !!el)
			.map(el => el.textContent?.trim() ?? "");
	}

	function lastQuery() {
		return gamesQueries[gamesQueries.length - 1];
	}

	async function renderGames(mobile = false) {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: mobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		const view = await render(AdminGames, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast }
			],
			routes: []
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return view;
	}

	async function renderLoaded(mobile = false) {
		const view = await renderGames(mobile);
		await untilVisible(() =>
			expect(screen.getByText("Alpha 001")).toBeInTheDocument()
		);
		return view;
	}

	beforeEach(() => {
		catalog = initialCatalog();
		pendingReports = [];
		held = () => false;
		nextGamesFailure = null;
		reactivateFailure = null;
		reportsFailure = null;
		detailFailure = null;
		deactivateFailure = null;
		scoreSourcesFailure = null;
		unexpectedRequests = [];
		gamesQueries.length = 0;
		reactivations.length = 0;
		deactivations.length = 0;
		detailRequests.length = 0;
		toast.success.mockClear();
		toast.warning.mockClear();
		toast.error.mockClear();
	});

	afterEach(() => {
		try {
			held = () => false;
			answerPending();
			httpTesting.verify();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("initial load", () => {
		it("shows a busy skeleton and then the first page with the total", async () => {
			await renderGames();

			expect(
				screen.getByRole("list", { name: "Loading games" })
			).toHaveAttribute("aria-busy", "true");
			await untilVisible(() =>
				expect(screen.getByText("Alpha 001")).toBeInTheDocument()
			);
			expect(screen.getByText("123")).toBeInTheDocument();
			expect(
				screen.getByText(/games in the catalog/)
			).toBeInTheDocument();
			expect(titlesOnScreen()).toHaveLength(50);
			expect(lastQuery().get("limit")).toBe("50");
			expect(lastQuery().get("offset")).toBe("0");
			expect(lastQuery().get("detailed")).toBe("true");
		});

		it("uses the singular when the catalog has a single game", async () => {
			catalog = [storedGame("solo", "Solo Game")];
			await renderGames();

			await untilVisible(() =>
				expect(screen.getByText("Solo Game")).toBeInTheDocument()
			);
			expect(
				screen.getByText(/^game in the catalog/)
			).toBeInTheDocument();
		});

		it("shows the plain empty state when the catalog is empty and nothing is filtered", async () => {
			catalog = [];
			await renderGames();

			await untilVisible(() =>
				expect(screen.getByText("No games found")).toBeInTheDocument()
			);
			expect(
				screen.queryByRole("button", { name: "Clear filters" })
			).not.toBeInTheDocument();
		});

		it("keeps working without unhandled errors when the reports and score sources fail to load", async () => {
			reportsFailure = failure(500);
			scoreSourcesFailure = failure(500);
			await renderLoaded();

			expect(screen.getByText("Alpha 001")).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "View report" })
			).not.toBeInTheDocument();
			expect(chip("No scores")).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Metacritic" })
			).not.toBeInTheDocument();
		});

		it("offers a chip per manual score source and per time source but not the computed one", async () => {
			await renderLoaded();

			expect(chip("Metacritic")).toBeInTheDocument();
			expect(chip("HowLongToBeat")).toBeInTheDocument();
			expect(chip("RAWG")).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Completr" })
			).not.toBeInTheDocument();
		});
	});

	describe("search", () => {
		it("sends the typed text trimmed and finds it", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "  zelda  ");

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"])
			);
			expect(lastQuery().get("search")).toBe("zelda");
		});

		it("treats whitespace alone as no search and does not flag active filters", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "     ");
			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));

			expect(lastQuery().has("search")).toBe(false);
			expect(
				screen.queryByRole("button", { name: "Clear filters" })
			).not.toBeInTheDocument();
		});

		it("finds accented and emoji titles by their typed text", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "pokémon");
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Pokémon Rojo"])
			);
			expect(lastQuery().get("search")).toBe("pokémon");

			await user.clear(searchBox());
			await user.type(searchBox(), "🎮");
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Ñandú Quest 🎮"])
			);
			expect(lastQuery().get("search")).toBe("🎮");
		});

		it("matches regardless of upper and lower case", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "ZELDA");

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"])
			);
		});

		it("sends a very long pasted text intact and shows the no-matches state", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const longText = "x".repeat(600);

			await user.click(searchBox());
			await user.paste(longText);

			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);
			expect(lastQuery().get("search")).toBe(longText);
		});

		it("shows no matches for an unknown title and restores the list when the search is cleared", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "qwertyuiop");
			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);

			await user.click(
				screen.getByRole("button", { name: "Clear search" })
			);

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
			expect(searchBox()).toHaveValue("");
		});

		it("clears the search with Escape from the keyboard", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "zelda");
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"])
			);
			await user.keyboard("{Escape}");

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
			expect(searchBox()).toHaveValue("");
			expect(lastQuery().has("search")).toBe(false);
		});

		it("typing and deleting quickly ends on the list matching the final text", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "zeld");
			await user.type(searchBox(), "{Backspace}{Backspace}{Backspace}");
			await user.type(searchBox(), "oke");

			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);
			expect(searchBox()).toHaveValue("zoke");
			expect(lastQuery().get("search")).toBe("zoke");
		});

		it("returns to the first page when searching from a later page", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(screen.getByText("Alpha 048")).toBeInTheDocument()
			);
			expect(lastQuery().get("offset")).toBe("50");

			await user.type(searchBox(), "alpha 00");

			await untilVisible(() =>
				expect(screen.getByText("Alpha 001")).toBeInTheDocument()
			);
			expect(lastQuery().get("offset")).toBe("0");
		});

		it("keeps the pagination reachable when a search matches more than one page", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "alpha");
			await untilVisible(() =>
				expect(screen.getByText("1–50 of 120")).toBeInTheDocument()
			);
			await user.click(screen.getByRole("button", { name: "Next page" }));

			await untilVisible(() =>
				expect(screen.getByText("51–100 of 120")).toBeInTheDocument()
			);
			expect(lastQuery().get("search")).toBe("alpha");
			expect(lastQuery().get("offset")).toBe("50");
		});

		it("waits for a pause in typing and sends a single search request", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const before = gamesQueries.length;

			await user.type(searchBox(), "zelda");
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"])
			);

			expect(gamesQueries.length - before).toBe(1);
		});

		it("shows the result of the latest search when the older one was still in flight", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			held = req => req.method === "GET" && req.url === gamesUrl;
			await user.type(searchBox(), "p");
			const first = await nextGamesRequest();
			await user.type(searchBox(), "o");
			const second = await nextGamesRequest();
			held = () => false;
			answer(second);
			answer(first);

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Pokémon Rojo"])
			);
			await settle();
			expect(titlesOnScreen()).toEqual(["Pokémon Rojo"]);
			expect(first.cancelled).toBe(true);
		});

		it("keeps the loading skeleton while the newest request is pending", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			held = req => req.method === "GET" && req.url === gamesUrl;
			await user.click(chip("No scores"));
			const first = await nextGamesRequest();
			await user.click(chip("No times"));
			const second = await nextGamesRequest();

			expect(first.cancelled).toBe(true);
			expect(
				screen.getByRole("list", { name: "Loading games" })
			).toBeInTheDocument();
			held = () => false;
			answer(second);
			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);
		});
	});

	describe("status filter", () => {
		it("loads only deactivated games and shows the deactivated badge without a link", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(statusOption("Deactivated"));

			await untilVisible(() =>
				expect(screen.getByText("Dead Game One")).toBeInTheDocument()
			);
			expect(lastQuery().get("only_inactive")).toBe("true");
			expect(titlesOnScreen()).toEqual([
				"Dead Game One",
				"Dead Game Two"
			]);
			expect(
				screen.queryByRole("link", { name: "Dead Game One" })
			).not.toBeInTheDocument();
			expect(screen.getAllByText("Deactivated").length).toBeGreaterThan(
				0
			);
		});

		it("includes inactive games with All and links only the active ones", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(statusOption("All"));

			await untilVisible(() =>
				expect(lastQuery().get("include_inactive")).toBe("true")
			);
			await user.click(screen.getByRole("button", { name: "Last page" }));
			await untilVisible(() =>
				expect(screen.getByText("Dead Game Two")).toBeInTheDocument()
			);
			expect(
				screen.getByRole("link", { name: "Alpha 120" })
			).toBeInTheDocument();
			expect(
				screen.queryByRole("link", { name: "Dead Game Two" })
			).not.toBeInTheDocument();
		});

		it("clicking the same option again does not break the list", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(statusOption("Active"));
			await user.click(statusOption("Active"));

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
			expect(statusOption("Active")).toHaveAttribute(
				"aria-checked",
				"true"
			);
		});

		it("hopping between options quickly ends with the last chosen one selected and its data", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(statusOption("Deactivated"));
			await user.click(statusOption("All"));
			await user.click(statusOption("Deactivated"));

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual([
					"Dead Game One",
					"Dead Game Two"
				])
			);
			expect(statusOption("Deactivated")).toHaveAttribute(
				"aria-checked",
				"true"
			);
			expect(lastQuery().get("only_inactive")).toBe("true");
		});
	});

	describe("missing data chips", () => {
		it("filters by one chip and toggles it off again", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(chip("No scores"));
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"])
			);
			expect(chip("No scores")).toHaveAttribute("aria-pressed", "true");
			expect(lastQuery().get("no_scores")).toBe("true");

			await user.click(chip("No scores"));
			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
			expect(chip("No scores")).toHaveAttribute("aria-pressed", "false");
			expect(lastQuery().has("no_scores")).toBe(false);
		});

		it("combines several chips and drops to no matches when they exclude each other", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(chip("No scores"));
			await user.click(chip("No times"));

			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);
			expect(lastQuery().get("no_scores")).toBe("true");
			expect(lastQuery().get("no_times")).toBe("true");
		});

		it("sends source filters joined with commas", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(chip("HowLongToBeat"));
			await user.click(chip("RAWG"));
			await user.click(chip("Metacritic"));

			await untilVisible(() =>
				expect(lastQuery().get("no_score_source")).toBe("metacritic")
			);
			expect(lastQuery().get("no_time_source")).toBe("hltb,rawg");
		});

		it("returns to the first page when a chip changes while on a later page", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(screen.getByText("Alpha 048")).toBeInTheDocument()
			);

			await user.click(chip("No platforms"));

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Ñandú Quest 🎮"])
			);
			expect(lastQuery().get("offset")).toBe("0");
		});

		it("toggles with Space and Enter from the keyboard", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			chip("No times").focus();
			await user.keyboard(" ");
			await untilVisible(() =>
				expect(chip("No times")).toHaveAttribute("aria-pressed", "true")
			);
			await user.keyboard("{Enter}");
			await untilVisible(() =>
				expect(chip("No times")).toHaveAttribute(
					"aria-pressed",
					"false"
				)
			);
		});

		it("an odd number of rapid clicks leaves the chip on and the list filtered", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.tripleClick(chip("No scores"));

			await untilVisible(() =>
				expect(chip("No scores")).toHaveAttribute(
					"aria-pressed",
					"true"
				)
			);
			expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"]);
		});
	});

	describe("responses out of order", () => {
		it("shows the data of the last chip clicked when the responses arrive swapped", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			held = req => req.method === "GET" && req.url === gamesUrl;
			await user.click(chip("No scores"));
			const first = await nextGamesRequest();
			await user.click(chip("No scores"));
			const second = await nextGamesRequest();
			await user.click(chip("No times"));
			const third = await nextGamesRequest();
			held = () => false;
			answer(third);
			answer(second);
			answer(first);

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Pokémon Rojo"])
			);
			await settle();
			expect(chip("No times")).toHaveAttribute("aria-pressed", "true");
			expect(titlesOnScreen()).toEqual(["Pokémon Rojo"]);
		});
	});

	describe("clear filters", () => {
		it("resets search, status and chips with a single click", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "zzz");
			await user.click(statusOption("All"));
			await user.click(chip("No scores"));
			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);

			await user.click(
				screen.getByRole("button", { name: "Clear filters" })
			);

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
			expect(searchBox()).toHaveValue("");
			expect(statusOption("Active")).toHaveAttribute(
				"aria-checked",
				"true"
			);
			expect(chip("No scores")).toHaveAttribute("aria-pressed", "false");
			const query = lastQuery();
			expect(query.has("search")).toBe(false);
			expect(query.has("no_scores")).toBe(false);
			expect(query.has("include_inactive")).toBe(false);
			expect(query.get("offset")).toBe("0");
		});

		it("does not fire twice when clicked repeatedly in a row", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.type(searchBox(), "zzz");
			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);
			const before = gamesQueries.length;

			await user.tripleClick(
				screen.getByRole("button", { name: "Clear filters" })
			);
			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));

			expect(gamesQueries.length - before).toBe(1);
		});

		it("offers clear filters when the deactivated view is empty", async () => {
			const user = userEvent.setup();
			catalog = catalog.filter(game => game.isActive);
			await renderLoaded();

			await user.click(statusOption("Deactivated"));
			await untilVisible(() =>
				expect(
					screen.getByText("No games match these filters.")
				).toBeInTheDocument()
			);
			await user.click(
				screen.getByRole("button", { name: "Clear filters" })
			);

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
		});
	});

	describe("pagination", () => {
		it("walks to the next, last, previous and first pages", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			expect(screen.getByText("1–50 of 123")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(screen.getByText("51–100 of 123")).toBeInTheDocument()
			);
			await user.click(screen.getByRole("button", { name: "Last page" }));
			await untilVisible(() =>
				expect(screen.getByText("101–123 of 123")).toBeInTheDocument()
			);
			expect(titlesOnScreen()).toHaveLength(23);
			await user.click(
				screen.getByRole("button", { name: "Previous page" })
			);
			await untilVisible(() =>
				expect(screen.getByText("51–100 of 123")).toBeInTheDocument()
			);
			await user.click(
				screen.getByRole("button", { name: "First page" })
			);
			await untilVisible(() =>
				expect(screen.getByText("1–50 of 123")).toBeInTheDocument()
			);
			expect(lastQuery().get("offset")).toBe("0");
		});

		it("disables previous and first on the first page", async () => {
			await renderLoaded();

			expect(
				screen.getByRole("button", { name: "Previous page" })
			).toBeDisabled();
			expect(
				screen.getByRole("button", { name: "First page" })
			).toBeDisabled();
			expect(
				screen.getByRole("button", { name: "Next page" })
			).toBeEnabled();
		});

		it("jumps to a page number", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(screen.getByRole("button", { name: "3" }));

			await untilVisible(() =>
				expect(screen.getByText("101–123 of 123")).toBeInTheDocument()
			);
			expect(lastQuery().get("offset")).toBe("100");
		});

		it("does not request anything when the current page is clicked again", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const before = gamesQueries.length;

			await user.click(screen.getByRole("button", { name: "1" }));
			await user.click(screen.getByRole("button", { name: "1" }));
			answerPending();

			expect(gamesQueries.length).toBe(before);
		});

		it("is hidden when everything fits on one page", async () => {
			catalog = catalog.slice(0, 10);
			await renderLoaded();

			expect(
				screen.queryByRole("button", { name: "Next page" })
			).not.toBeInTheDocument();
		});

		it("pages with the keyboard", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			screen.getByRole("button", { name: "Next page" }).focus();
			await user.keyboard("{Enter}");

			await untilVisible(() =>
				expect(screen.getByText("51–100 of 123")).toBeInTheDocument()
			);
		});
	});

	describe("load errors", () => {
		it.each([
			["a server error", 500],
			["a missing endpoint", 404],
			["a network failure", 0]
		])(
			"shows the alert on %s and recovers with Try again",
			async (_, status) => {
				const user = userEvent.setup();
				nextGamesFailure = failure(status);
				await renderGames();

				await untilVisible(() =>
					expect(
						screen.getByText(/Could not load games/)
					).toBeInTheDocument()
				);
				expect(
					screen.queryByText("No games found")
				).not.toBeInTheDocument();
				await user.click(
					screen.getByRole("button", { name: "Try again" })
				);

				await untilVisible(() =>
					expect(titlesOnScreen()).toHaveLength(50)
				);
				expect(
					screen.queryByText(/Could not load games/)
				).not.toBeInTheDocument();
			}
		);

		it("keeps failing visibly when Try again fails again and succeeds on the next attempt", async () => {
			const user = userEvent.setup();
			nextGamesFailure = failure(500);
			await renderGames();
			await untilVisible(() =>
				expect(
					screen.getByText(/Could not load games/)
				).toBeInTheDocument()
			);

			nextGamesFailure = failure(500);
			await user.click(screen.getByRole("button", { name: "Try again" }));
			await untilVisible(() =>
				expect(
					screen.getByRole("button", { name: "Try again" })
				).toBeInTheDocument()
			);
			await user.click(screen.getByRole("button", { name: "Try again" }));

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
		});

		it("recovers by changing a filter after an error without pressing Try again", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			nextGamesFailure = failure(500);
			await user.click(chip("No scores"));
			await untilVisible(() =>
				expect(
					screen.getByText(/Could not load games/)
				).toBeInTheDocument()
			);

			await user.click(chip("No scores"));

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
		});

		it("shows the error when a search fails and recovers when the text is cleared", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			nextGamesFailure = failure(500);
			await user.type(searchBox(), "z");
			await untilVisible(() =>
				expect(
					screen.getByText(/Could not load games/)
				).toBeInTheDocument()
			);

			await user.clear(searchBox());

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
		});

		it("does not fire duplicate requests when Try again is clicked repeatedly", async () => {
			const user = userEvent.setup();
			nextGamesFailure = failure(500);
			await renderGames();
			await untilVisible(() =>
				expect(
					screen.getByText(/Could not load games/)
				).toBeInTheDocument()
			);
			const before = gamesQueries.length;

			await user.tripleClick(
				screen.getByRole("button", { name: "Try again" })
			);
			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));

			expect(gamesQueries.length - before).toBe(1);
		});
	});

	describe("reactivating", () => {
		it("sends a single request on a triple click, disables the button and confirms", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(statusOption("All"));
			await untilVisible(() =>
				expect(lastQuery().get("include_inactive")).toBe("true")
			);
			await user.click(screen.getByRole("button", { name: "Last page" }));
			await untilVisible(() =>
				expect(screen.getByText("Dead Game One")).toBeInTheDocument()
			);

			held = req => req.method === "POST";
			const button = within(rowOf("Dead Game One")).getByRole("button", {
				name: "Reactivate game"
			});
			await user.tripleClick(button);
			expect(button).toBeDisabled();
			held = () => false;
			answerPending();
			await untilVisible(() =>
				expect(toast.success).toHaveBeenCalledWith(
					'Reactivated "Dead Game One"'
				)
			);

			expect(reactivations).toEqual(["dead1"]);
			expect(toast.success).toHaveBeenCalledTimes(1);
			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Dead Game One" })
				).toBeInTheDocument()
			);
			expect(
				within(rowOf("Dead Game One")).queryByRole("button", {
					name: "Reactivate game"
				})
			).not.toBeInTheDocument();
		});

		it("removes the game from the deactivated list after reactivating", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(statusOption("Deactivated"));
			await untilVisible(() =>
				expect(screen.getByText("Dead Game One")).toBeInTheDocument()
			);

			await user.click(
				within(rowOf("Dead Game One")).getByRole("button", {
					name: "Reactivate game"
				})
			);

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Dead Game Two"])
			);
		});

		it.each([
			["a server error", 500],
			["a conflict", 409],
			["a missing game", 404],
			["a network failure", 0]
		])(
			"warns on %s, leaves the row deactivated and allows retrying",
			async (_, status) => {
				const user = userEvent.setup();
				await renderLoaded();
				await user.click(statusOption("Deactivated"));
				await untilVisible(() =>
					expect(
						screen.getByText("Dead Game One")
					).toBeInTheDocument()
				);
				reactivateFailure = failure(status);
				const button = within(rowOf("Dead Game One")).getByRole(
					"button",
					{
						name: "Reactivate game"
					}
				);

				await user.click(button);

				await untilVisible(() =>
					expect(toast.warning).toHaveBeenCalledWith(
						"Could not reactivate game."
					)
				);
				expect(button).toBeEnabled();
				expect(
					within(rowOf("Dead Game One")).getByText("Deactivated")
				).toBeInTheDocument();

				reactivateFailure = null;
				await user.click(button);
				await untilVisible(() =>
					expect(toast.success).toHaveBeenCalledWith(
						'Reactivated "Dead Game One"'
					)
				);
				expect(reactivations).toEqual(["dead1", "dead1"]);
			}
		);

		it("reactivates two different games independently while both are pending", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(statusOption("All"));
			await untilVisible(() =>
				expect(lastQuery().get("include_inactive")).toBe("true")
			);
			await user.click(screen.getByRole("button", { name: "Last page" }));
			await untilVisible(() =>
				expect(screen.getByText("Dead Game Two")).toBeInTheDocument()
			);

			held = req => req.method === "POST";
			const first = within(rowOf("Dead Game One")).getByRole("button", {
				name: "Reactivate game"
			});
			const second = within(rowOf("Dead Game Two")).getByRole("button", {
				name: "Reactivate game"
			});
			await user.click(first);
			await user.click(second);
			expect(first).toBeDisabled();
			expect(second).toBeDisabled();
			held = () => false;
			answerPending();

			await untilVisible(() =>
				expect(toast.success).toHaveBeenCalledTimes(2)
			);
			expect(reactivations).toEqual(["dead1", "dead2"]);
		});

		it("reactivates from the keyboard with Enter", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(statusOption("Deactivated"));
			await untilVisible(() =>
				expect(screen.getByText("Dead Game One")).toBeInTheDocument()
			);

			within(rowOf("Dead Game One"))
				.getByRole("button", { name: "Reactivate game" })
				.focus();
			await user.keyboard("{Enter}");

			await untilVisible(() =>
				expect(toast.success).toHaveBeenCalledTimes(1)
			);
			expect(reactivations).toEqual(["dead1"]);
		});

		it("goes back to the previous page when reactivating the only game of the last page leaves it empty", async () => {
			const user = userEvent.setup();
			catalog = [
				...catalog.filter(game => game.isActive),
				...Array.from({ length: 51 }, (_, index) =>
					storedGame(
						`ghost${index}`,
						`Ghost ${String(index).padStart(2, "0")}`,
						{ isActive: false }
					)
				)
			];
			await renderLoaded();
			await user.click(statusOption("Deactivated"));
			await untilVisible(() =>
				expect(screen.getByText("Ghost 00")).toBeInTheDocument()
			);
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Ghost 50"])
			);

			await user.click(
				within(rowOf("Ghost 50")).getByRole("button", {
					name: "Reactivate game"
				})
			);

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
			expect(lastQuery().get("offset")).toBe("0");
		});
	});

	describe("reports", () => {
		it("flags games with a pending report and opens the report from the flag", async () => {
			const user = userEvent.setup();
			pendingReports = [{ id: "r1", gameId: "a002" }];
			await renderLoaded();
			const navigate = vi
				.spyOn(TestBed.inject(Router), "navigate")
				.mockResolvedValue(true);

			expect(
				within(rowOf("Alpha 001")).queryByRole("button", {
					name: "View report"
				})
			).not.toBeInTheDocument();
			const flag = within(rowOf("Alpha 002")).getByRole("button", {
				name: "View report"
			});
			await user.click(flag);

			expect(navigate).toHaveBeenCalledTimes(1);
			expect(navigate).toHaveBeenCalledWith(["/admin/reports"], {
				queryParams: { gameId: "a002" }
			});
		});

		it("keeps the flag when the list is filtered and refetched", async () => {
			const user = userEvent.setup();
			pendingReports = [{ id: "r1", gameId: "zelda" }];
			await renderLoaded();

			await user.click(chip("No scores"));

			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"])
			);
			expect(
				within(rowOf("Zelda: Breath of the Wild")).getByRole("button", {
					name: "View report"
				})
			).toBeInTheDocument();
		});
	});

	describe("rows", () => {
		it("renders platforms, scores, times, variant and DLC badges and a dash without platforms", async () => {
			catalog = [
				storedGame("dlc", "Expansion Pack", {
					isDlc: true,
					variant: "Gold",
					platforms: [{ abbreviation: "PC" }, { abbreviation: "PS5" }]
				}),
				storedGame("bare", "Bare Game", {
					platforms: [],
					scores: [],
					times: []
				})
			];
			await renderGames();
			await untilVisible(() =>
				expect(screen.getByText("Expansion Pack")).toBeInTheDocument()
			);

			const dlc = within(rowOf("Expansion Pack"));
			expect(dlc.getByText("DLC")).toBeInTheDocument();
			expect(dlc.getByText("Gold")).toBeInTheDocument();
			expect(dlc.getByText(/PC, PS5/)).toBeInTheDocument();
			expect(dlc.getByText("metacritic: 80")).toBeInTheDocument();
			expect(dlc.getByText("hltb: 10h")).toBeInTheDocument();
			expect(
				within(rowOf("Bare Game")).getByText(/-$/)
			).toBeInTheDocument();
		});

		it("links each active game to its detail page", async () => {
			await renderLoaded();

			expect(
				screen.getByRole("link", { name: "Alpha 001" })
			).toHaveAttribute("href", "/games/alpha-001");
		});
	});

	describe("editor dialogs", () => {
		function editButton(title: string) {
			return screen.getByRole("button", { name: `Edit ${title}` });
		}

		async function openedEditDialog(title: string) {
			let dialog: HTMLElement | undefined;
			await untilVisible(() => {
				dialog = screen.getByRole("dialog", { name: "Edit game" });
				expect(within(dialog).getByText(title)).toBeInTheDocument();
			});
			return dialog as HTMLElement;
		}

		async function closed() {
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
		}

		it("loads the full game once on a triple click, disables the button while loading and opens the edit dialog", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			held = req => req.url === `${gamesUrl}/zelda-breath-of-the-wild`;
			await user.tripleClick(editButton("Zelda: Breath of the Wild"));
			expect(editButton("Zelda: Breath of the Wild")).toBeDisabled();
			expect(editButton("Zelda: Breath of the Wild")).toHaveAttribute(
				"aria-busy",
				"true"
			);
			held = () => false;

			await openedEditDialog("Zelda: Breath of the Wild");
			expect(detailRequests).toEqual(["zelda-breath-of-the-wild"]);
			expect(screen.getAllByRole("dialog")).toHaveLength(1);
			expect(editButton("Zelda: Breath of the Wild")).toBeEnabled();
		});

		it("closes the edit dialog with Escape and with the close button and fetches again when reopened", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(editButton("Alpha 001"));
			await openedEditDialog("Alpha 001");
			await user.keyboard("{Escape}");
			await closed();
			await user.click(editButton("Alpha 001"));
			const dialog = await openedEditDialog("Alpha 001");
			await user.click(
				within(dialog).getByRole("button", { name: "Close Edit game" })
			);
			await closed();

			expect(detailRequests).toEqual(["alpha-001", "alpha-001"]);
			expect(titlesOnScreen()).toHaveLength(50);
		});

		it("opens and closes the edit dialog repeatedly without leaking dialogs", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			for (let round = 0; round < 3; round++) {
				await user.click(editButton("Alpha 002"));
				await openedEditDialog("Alpha 002");
				await user.keyboard("{Escape}");
				await closed();
			}

			expect(screen.queryAllByRole("dialog")).toHaveLength(0);
			expect(detailRequests).toHaveLength(3);
		});

		it("opens the dialog of the row clicked last when two rows answer swapped", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			held = req => req.url.startsWith(`${gamesUrl}/alpha-`);
			await user.click(editButton("Alpha 001"));
			await user.click(editButton("Alpha 002"));
			const [first, second] = httpTesting.match(req =>
				req.url.startsWith(`${gamesUrl}/alpha-`)
			);
			held = () => false;
			answer(second);
			answer(first);

			await openedEditDialog("Alpha 002");
			await settle();
			expect(screen.getAllByRole("dialog")).toHaveLength(1);
			expect(
				within(screen.getByRole("dialog")).queryByText("Alpha 001")
			).not.toBeInTheDocument();
		});

		it.each([
			["a server error", failure(500)],
			["a missing game", failure(404)],
			["a network failure", { status: 0, body: null }]
		])(
			"warns on %s, re-enables the button and recovers",
			async (_, response) => {
				const user = userEvent.setup();
				await renderLoaded();
				detailFailure = response;

				await user.click(editButton("Alpha 001"));

				await untilVisible(() =>
					expect(toast.warning).toHaveBeenCalledWith(
						"Could not load the game to edit."
					)
				);
				expect(editButton("Alpha 001")).toBeEnabled();
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

				detailFailure = null;
				await user.click(editButton("Alpha 001"));
				await openedEditDialog("Alpha 001");
			}
		);

		it("opens the create dialog from New game, which has no toggle state", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const button = screen.getByRole("button", { name: "New game" });
			expect(button).toHaveAttribute("aria-haspopup", "dialog");

			await user.click(button);

			await untilVisible(() =>
				expect(
					screen.getByRole("dialog", { name: "New game" })
				).toBeInTheDocument()
			);
			expect(button).not.toHaveAttribute("aria-expanded");
		});

		it("opens one create dialog on a triple click and closes it with Escape, the close button and reopening", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.tripleClick(
				screen.getByRole("button", { name: "New game" })
			);
			await untilVisible(() =>
				expect(
					screen.getByRole("dialog", { name: "New game" })
				).toBeInTheDocument()
			);
			expect(screen.getAllByRole("dialog")).toHaveLength(1);
			await user.keyboard("{Escape}");
			await closed();
			await user.click(screen.getByRole("button", { name: "New game" }));
			await untilVisible(() =>
				expect(
					screen.getByRole("dialog", { name: "New game" })
				).toBeInTheDocument()
			);
			await user.click(
				within(screen.getByRole("dialog")).getByRole("button", {
					name: "Close New game"
				})
			);
			await closed();

			expect(titlesOnScreen()).toHaveLength(50);
		});

		it("alternates the create dialog with repeated clicks and keeps the list intact", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			for (let round = 0; round < 3; round++) {
				await user.click(
					screen.getByRole("button", { name: "New game" })
				);
				await untilVisible(() =>
					expect(
						screen.getByRole("dialog", { name: "New game" })
					).toBeInTheDocument()
				);
				await user.keyboard("{Escape}");
				await closed();
			}

			expect(titlesOnScreen()).toHaveLength(50);
		});
	});

	describe("deactivating", () => {
		function deactivateButton(title: string) {
			return screen.getByRole("button", { name: `Deactivate ${title}` });
		}

		async function openDeactivate(
			user: ReturnType<typeof userEvent.setup>,
			title: string
		) {
			await user.click(deactivateButton(title));
			return screen.findByRole("dialog", {
				name: `Deactivate ${title}?`
			});
		}

		it("only offers Deactivate on active games", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			expect(deactivateButton("Alpha 001")).toBeInTheDocument();

			await user.click(statusOption("Deactivated"));
			await untilVisible(() =>
				expect(screen.getByText("Dead Game One")).toBeInTheDocument()
			);

			expect(
				screen.queryByRole("button", { name: /^Deactivate Dead/ })
			).not.toBeInTheDocument();
		});

		it("explains the effect, and Cancel, Escape and the close button leave everything untouched", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const dialog = await openDeactivate(user, "Alpha 001");
			expect(
				within(dialog).getByText(/keeps all its data/)
			).toBeInTheDocument();

			await user.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			const second = await openDeactivate(user, "Alpha 001");
			within(second).getByRole("button", { name: "Cancel" }).focus();
			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			const third = await openDeactivate(user, "Alpha 001");
			await user.click(
				within(third).getByRole("button", {
					name: "Close Deactivate Alpha 001?"
				})
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			expect(deactivations).toEqual([]);
			expect(
				screen.getByRole("link", { name: "Alpha 001" })
			).toBeInTheDocument();
		});

		it("sends one DELETE on a triple click, toasts and reloads without the game", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const dialog = await openDeactivate(
				user,
				"Zelda: Breath of the Wild"
			);

			held = req => req.method === "DELETE";
			await user.tripleClick(
				within(dialog).getByRole("button", { name: "Deactivate" })
			);
			expect(
				within(dialog).getByRole("button", { name: "Deactivating..." })
			).toBeDisabled();
			held = () => false;

			await untilVisible(() =>
				expect(titlesOnScreen()).not.toContain(
					"Zelda: Breath of the Wild"
				)
			);
			expect(deactivations).toEqual(["zelda"]);
			expect(toast.success).toHaveBeenCalledTimes(1);
			expect(toast.success).toHaveBeenCalledWith(
				'Deactivated "Zelda: Breath of the Wild"'
			);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("ignores Escape, the close button and Cancel while the request is in flight", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const dialog = await openDeactivate(user, "Alpha 001");
			held = req => req.method === "DELETE";
			await user.click(
				within(dialog).getByRole("button", { name: "Deactivate" })
			);

			expect(
				within(dialog).getByRole("button", { name: "Cancel" })
			).toBeDisabled();
			await user.keyboard("{Escape}");
			await user.click(
				within(dialog).getByRole("button", {
					name: "Close Deactivate Alpha 001?"
				})
			);

			expect(
				screen.getByRole("dialog", { name: "Deactivate Alpha 001?" })
			).toBeInTheDocument();
			held = () => false;
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(deactivations).toEqual(["a001"]);
		});

		it("does not toast a conflict itself because the interceptor already did", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			deactivateFailure = failure(409);
			const dialog = await openDeactivate(user, "Alpha 001");

			await user.click(
				within(dialog).getByRole("button", { name: "Deactivate" })
			);

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(toast.warning).not.toHaveBeenCalled();
			expect(toast.success).not.toHaveBeenCalled();
			expect(
				screen.getByRole("link", { name: "Alpha 001" })
			).toBeInTheDocument();
		});

		it.each([
			[
				"a server error",
				{ status: 500, body: { type: "ERROR", title: "ERROR" } },
				"Could not deactivate game."
			],
			[
				"a network failure",
				{ status: 0, body: null },
				"Could not deactivate game."
			],
			[
				"an already inactive game",
				{ status: 404, body: { type: "GAME_NOT_FOUND", title: "x" } },
				"This game no longer exists or is already inactive. Refresh the page to see its current state."
			]
		])(
			"warns on %s, closes the dialog and allows trying again",
			async (_, response, message) => {
				const user = userEvent.setup();
				await renderLoaded();
				deactivateFailure = response;
				const dialog = await openDeactivate(user, "Alpha 001");

				await user.click(
					within(dialog).getByRole("button", { name: "Deactivate" })
				);

				await untilVisible(() =>
					expect(toast.warning).toHaveBeenCalledWith(message)
				);
				await waitFor(() =>
					expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
				);
				expect(
					screen.getByRole("link", { name: "Alpha 001" })
				).toBeInTheDocument();

				deactivateFailure = null;
				const again = await openDeactivate(user, "Alpha 001");
				expect(
					within(again).getByRole("button", { name: "Deactivate" })
				).toBeEnabled();
				await user.click(
					within(again).getByRole("button", { name: "Deactivate" })
				);
				await untilVisible(() =>
					expect(toast.success).toHaveBeenCalledTimes(1)
				);
				expect(deactivations).toEqual(["a001", "a001"]);
			}
		);

		it("opens, cancels and reopens on a different row showing the right title", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const first = await openDeactivate(user, "Alpha 001");
			await user.click(
				within(first).getByRole("button", { name: "Cancel" })
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const second = await openDeactivate(user, "Alpha 002");
			await user.click(
				within(second).getByRole("button", { name: "Deactivate" })
			);

			await untilVisible(() =>
				expect(toast.success).toHaveBeenCalledTimes(1)
			);
			expect(deactivations).toEqual(["a002"]);
		});

		it("deactivates with the keyboard on mobile", async () => {
			const user = userEvent.setup();
			await renderLoaded(true);
			const dialog = await openDeactivate(user, "Alpha 003");

			within(dialog).getByRole("button", { name: "Deactivate" }).focus();
			await user.keyboard("{Enter}");

			await untilVisible(() =>
				expect(toast.success).toHaveBeenCalledTimes(1)
			);
			expect(deactivations).toEqual(["a003"]);
		});

		it("goes back to the previous page when deactivating the only game of the last page leaves it empty", async () => {
			const user = userEvent.setup();
			catalog = catalog
				.filter(game => game.id.startsWith("a"))
				.slice(0, 51);
			await renderLoaded();
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Alpha 051"])
			);
			const dialog = await openDeactivate(user, "Alpha 051");

			await user.click(
				within(dialog).getByRole("button", { name: "Deactivate" })
			);

			await untilVisible(() => expect(titlesOnScreen()).toHaveLength(50));
			expect(lastQuery().get("offset")).toBe("0");
		});
	});

	describe("mobile viewport", () => {
		it("filters, pages and reactivates the same way", async () => {
			const user = userEvent.setup();
			await renderLoaded(true);

			await user.click(chip("No scores"));
			await untilVisible(() =>
				expect(titlesOnScreen()).toEqual(["Zelda: Breath of the Wild"])
			);
			await user.click(chip("No scores"));
			await user.click(statusOption("Deactivated"));
			await untilVisible(() =>
				expect(screen.getByText("Dead Game One")).toBeInTheDocument()
			);
			await user.tripleClick(
				within(rowOf("Dead Game One")).getByRole("button", {
					name: "Reactivate game"
				})
			);

			await untilVisible(() =>
				expect(toast.success).toHaveBeenCalledTimes(1)
			);
			expect(reactivations).toEqual(["dead1"]);
		});
	});
});
