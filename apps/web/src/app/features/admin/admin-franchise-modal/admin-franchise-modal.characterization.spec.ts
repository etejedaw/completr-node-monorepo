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
import { AdminFranchises } from "../admin-franchises/admin-franchises";

type ResponseBody = Parameters<TestRequest["flush"]>[0];

interface ApiResponse {
	status: number;
	body: ResponseBody;
}

interface StoredFranchise {
	id: string;
	name: string;
	code: string;
	description: string | null;
}

interface StoredGame {
	id: string;
	title: string;
	franchiseId: string | null;
}

const api = environment.apiUrl;

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const failure = (status: number, type: string): ApiResponse => ({
	status,
	body: { type, title: type }
});

describe("AdminFranchiseModal characterization", () => {
	let httpTesting: HttpTestingController;
	let franchises: StoredFranchise[];
	let games: StoredGame[];
	let removedFromCatalog: StoredGame[];
	let failingGameId: string | null;
	let unexpectedRequests: string[];

	function toCode(name: string) {
		return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	}

	function franchiseOf(franchise: StoredFranchise) {
		const franchiseGames = games.filter(
			game => game.franchiseId === franchise.id
		);
		return {
			franchise,
			games: franchiseGames.map(game => ({
				id: game.id,
				title: game.title,
				franchise: { id: franchise.id, name: franchise.name }
			})),
			progress: { completed: 0, total: franchiseGames.length },
			isTracked: false,
			hasMore: false
		};
	}

	function franchiseNameOf(game: StoredGame) {
		return franchises.find(f => f.id === game.franchiseId)?.name ?? null;
	}

	function search(query: string): ApiResponse {
		const needle = query.toLowerCase();
		const found = [...games, ...removedFromCatalog]
			.filter(game => game.title.toLowerCase().includes(needle))
			.map(game => ({
				id: game.id,
				title: game.title,
				franchise: game.franchiseId
					? { id: game.franchiseId, name: franchiseNameOf(game) }
					: null
			}));
		return ok({ data: { games: found } });
	}

	function linkGames(
		franchiseId: string,
		gameIds: string[]
	): ApiResponse | null {
		const missing = gameIds.filter(id => !games.some(g => g.id === id));
		if (missing.length > 0)
			return failure(404, "FRANCHISE_GAMES_NOT_FOUND");
		if (failingGameId && gameIds.includes(failingGameId))
			return failure(500, "INTERNAL_SERVER_ERROR");
		games = games.map(game => {
			if (gameIds.includes(game.id)) return { ...game, franchiseId };
			if (game.franchiseId === franchiseId)
				return { ...game, franchiseId: null };
			return game;
		});
		return null;
	}

	function nameTaken(name: string, exceptId?: string) {
		return franchises.some(
			f =>
				f.id !== exceptId && f.name.toLowerCase() === name.toLowerCase()
		);
	}

	function createFranchise(body: {
		name: string;
		description: string | null;
		gameIds?: string[];
	}): ApiResponse {
		if (nameTaken(body.name))
			return failure(409, "FRANCHISE_UNIQUE_CONSTRAINT");
		const franchise: StoredFranchise = {
			id: `f-${franchises.length + 1}`,
			name: body.name,
			code: toCode(body.name),
			description: body.description
		};
		if (body.gameIds) {
			const linkFailure = linkGames(franchise.id, body.gameIds);
			if (linkFailure) return linkFailure;
		}
		franchises = [...franchises, franchise];
		return { status: 201, body: { data: { franchise } } };
	}

	function updateFranchise(
		id: string,
		body: { name: string; description: string | null; gameIds?: string[] }
	): ApiResponse {
		const current = franchises.find(f => f.id === id);
		if (!current) return failure(404, "FRANCHISE_NOT_FOUND");
		if (nameTaken(body.name, id))
			return failure(409, "FRANCHISE_UNIQUE_CONSTRAINT");
		if (body.gameIds) {
			const linkFailure = linkGames(id, body.gameIds);
			if (linkFailure) return linkFailure;
		}
		const franchise = {
			...current,
			name: body.name,
			code: toCode(body.name),
			description: body.description
		};
		franchises = franchises.map(f => (f.id === id ? franchise : f));
		return ok({ data: { franchise } });
	}

	function updateGame(
		id: string,
		body: { franchiseId: string | null }
	): ApiResponse {
		const game = games.find(g => g.id === id);
		if (!game) return failure(404, "GAME_NOT_FOUND");
		if (id === failingGameId) return failure(500, "INTERNAL_SERVER_ERROR");
		const updated = { ...game, franchiseId: body.franchiseId };
		games = games.map(g => (g.id === id ? updated : g));
		return ok({ data: { game: updated } });
	}

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url, body } = req.request;
		if (method === "GET" && url === `${api}/franchises`)
			return ok({ data: { franchises, total: franchises.length } });
		if (method === "POST" && url === `${api}/franchises`)
			return createFranchise(body);
		const searchMatch = url.match(
			/\/games\/search\?query=([^&]+)&local_only=true$/
		);
		if (method === "GET" && searchMatch)
			return search(decodeURIComponent(searchMatch[1]));
		const franchiseMatch = url.match(/\/franchises\/([^/?]+)$/);
		if (method === "GET" && franchiseMatch) {
			const franchise = franchises.find(
				f => f.code === franchiseMatch[1]
			);
			if (!franchise) return failure(404, "FRANCHISE_NOT_FOUND");
			return ok({ data: franchiseOf(franchise) });
		}
		if (method === "PATCH" && franchiseMatch)
			return updateFranchise(franchiseMatch[1], body);
		const gameMatch = url.match(/\/games\/([^/?]+)$/);
		if (method === "PATCH" && gameMatch)
			return updateGame(gameMatch[1], body);
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
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) break;
			pending.forEach(answer);
		}
		if (unexpectedRequests.length > 0)
			throw new Error(`Unexpected request: ${unexpectedRequests[0]}`);
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function franchiseRow(name: string) {
		return screen.getByRole("link", { name }).closest("li") as HTMLElement;
	}

	function rowWithTitle(container: HTMLElement, title: string) {
		return within(container)
			.getAllByRole("listitem")
			.find(item => within(item).queryByText(title)) as HTMLElement;
	}

	function gamesIn(franchiseId: string) {
		return games
			.filter(game => game.franchiseId === franchiseId)
			.map(game => game.id)
			.sort();
	}

	async function renderFranchises() {
		await render(AdminFranchises, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: []
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { level: 1, name: "Franchises" })
			).toBeInTheDocument()
		);
	}

	async function openCreate() {
		await userEvent.click(
			screen.getByRole("button", { name: "New franchise" })
		);
		return screen.findByRole("dialog", { name: "New Franchise" });
	}

	async function openEdit(name: string) {
		await untilVisible(() =>
			expect(screen.getByRole("link", { name })).toBeInTheDocument()
		);
		await userEvent.click(
			within(franchiseRow(name)).getByRole("button", {
				name: "Edit franchise"
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit Franchise"
		});
		await untilVisible(() =>
			expect(
				within(dialog).queryByText("Loading games...")
			).not.toBeInTheDocument()
		);
		return dialog;
	}

	async function addGame(dialog: HTMLElement, query: string, title: string) {
		const searchBox = within(dialog).getByPlaceholderText(
			"Search games to add..."
		);
		await userEvent.clear(searchBox);
		await userEvent.type(searchBox, query);
		let result: HTMLElement | undefined;
		await untilVisible(() => {
			result = rowWithTitle(dialog, title);
			expect(
				within(result).getByRole("button", { name: "Add" })
			).toBeInTheDocument();
		});
		await userEvent.click(
			within(result!).getByRole("button", { name: "Add" })
		);
	}

	async function removeGame(dialog: HTMLElement, title: string) {
		await userEvent.click(
			within(rowWithTitle(dialog, title)).getByRole("button", {
				name: "Remove game"
			})
		);
	}

	async function submit(dialog: HTMLElement, name: "Create" | "Save") {
		await userEvent.click(within(dialog).getByRole("button", { name }));
	}

	beforeEach(() => {
		unexpectedRequests = [];
		failingGameId = null;
		franchises = [
			{ id: "f-souls", name: "Souls", code: "souls", description: null }
		];
		games = [
			{ id: "hk", title: "Hollow Knight", franchiseId: null },
			{ id: "celeste", title: "Celeste", franchiseId: null },
			{ id: "ds1", title: "Dark Souls", franchiseId: "f-souls" },
			{ id: "ds2", title: "Dark Souls II", franchiseId: "f-souls" },
			{ id: "bb", title: "Bloodborne", franchiseId: null }
		];
		removedFromCatalog = [
			{ id: "ghost", title: "Ghost of a Tale", franchiseId: null }
		];
		Element.prototype.getAnimations = () => [];
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		try {
			answerPending();
			httpTesting.verify();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("same behavior", () => {
		it("creates a franchise with its games", async () => {
			await renderFranchises();
			const dialog = await openCreate();

			await userEvent.type(
				within(dialog).getByRole("textbox", { name: /Name/ }),
				"Metroidvanias"
			);
			await addGame(dialog, "hollow", "Hollow Knight");
			await addGame(dialog, "cele", "Celeste");
			expect(
				within(dialog).getByText("2 games in this franchise")
			).toBeInTheDocument();
			await submit(dialog, "Create");

			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Metroidvanias" })
				).toBeInTheDocument()
			);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			const created = franchises.find(f => f.name === "Metroidvanias")!;
			expect(gamesIn(created.id)).toEqual(["celeste", "hk"]);
			expect(gamesIn("f-souls")).toEqual(["ds1", "ds2"]);
		});

		it("edits a franchise removing one game and adding another", async () => {
			await renderFranchises();
			const dialog = await openEdit("Souls");
			expect(
				within(dialog).getByText("2 games in this franchise")
			).toBeInTheDocument();

			await removeGame(dialog, "Dark Souls II");
			await addGame(dialog, "blood", "Bloodborne");
			await submit(dialog, "Save");

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(gamesIn("f-souls")).toEqual(["bb", "ds1"]);
			expect(games.find(g => g.id === "ds2")?.franchiseId).toBeNull();

			const reopened = await openEdit("Souls");
			expect(
				within(reopened).getByText("Bloodborne")
			).toBeInTheDocument();
			expect(
				within(reopened).queryByText("Dark Souls II")
			).not.toBeInTheDocument();
		});
	});

	describe("intended change on failure", () => {
		it.fails(
			"creates neither the franchise nor any link when a game no longer exists",
			async () => {
				await renderFranchises();
				const dialog = await openCreate();

				await userEvent.type(
					within(dialog).getByRole("textbox", { name: /Name/ }),
					"Indies"
				);
				await addGame(dialog, "hollow", "Hollow Knight");
				await addGame(dialog, "ghost", "Ghost of a Tale");
				await submit(dialog, "Create");

				await untilVisible(() =>
					expect(
						within(dialog).getByRole("button", { name: "Create" })
					).toBeEnabled()
				);
				expect(
					screen.getByRole("dialog", { name: "New Franchise" })
				).toBeInTheDocument();
				expect(franchises.map(f => f.name)).toEqual(["Souls"]);
				expect(games.find(g => g.id === "hk")?.franchiseId).toBeNull();
			}
		);

		it.fails(
			"keeps the franchise and its games when a game update fails halfway",
			async () => {
				failingGameId = "bb";
				await renderFranchises();
				const dialog = await openEdit("Souls");

				const name = within(dialog).getByRole("textbox", {
					name: /Name/
				});
				await userEvent.clear(name);
				await userEvent.type(name, "Soulsborne");
				await removeGame(dialog, "Dark Souls II");
				await addGame(dialog, "blood", "Bloodborne");
				await submit(dialog, "Save");

				await untilVisible(() =>
					expect(
						within(dialog).getByRole("button", { name: "Save" })
					).toBeEnabled()
				);
				expect(
					screen.getByRole("dialog", { name: "Edit Franchise" })
				).toBeInTheDocument();
				expect(franchises.map(f => f.name)).toEqual(["Souls"]);
				expect(gamesIn("f-souls")).toEqual(["ds1", "ds2"]);
			}
		);
	});
});
