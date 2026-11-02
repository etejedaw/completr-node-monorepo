import "@testing-library/jest-dom/vitest";

import { type HttpRequest } from "@angular/common/http";
import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastService } from "../../../core/services/toast";
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

interface Write {
	method: string;
	url: string;
	body: {
		name: string;
		description: string | null;
		gameIds?: string[];
	};
}

const api = environment.apiUrl;
const franchisesUrl = `${api}/franchises`;

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const failure = (status: number, title = "ERROR"): ApiResponse => ({
	status,
	body: { type: title, title }
});

function toCode(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

describe("AdminFranchiseModal interaction", () => {
	let httpTesting: HttpTestingController;
	let franchises: StoredFranchise[];
	let games: StoredGame[];
	let held: (request: HttpRequest<unknown>) => boolean;
	let createFailure: ApiResponse | null;
	let updateFailure: ApiResponse | null;
	let searchFailure: ApiResponse | null;
	let detailFailure: ApiResponse | null;
	let unexpectedRequests: string[];
	const writes: Write[] = [];
	const searches: string[] = [];
	const listRequests: number[] = [];
	const toast = {
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	};

	function franchiseNameOf(game: StoredGame) {
		return franchises.find(f => f.id === game.franchiseId)?.name ?? null;
	}

	function detailOf(entry: StoredFranchise, limit: number): ApiResponse {
		const all = games.filter(game => game.franchiseId === entry.id);
		const page = all.slice(0, limit);
		return ok({
			data: {
				franchise: entry,
				games: page.map(game => ({
					id: game.id,
					title: game.title,
					franchise: { id: entry.id, name: entry.name }
				})),
				gameCount: all.length,
				isTracked: false,
				hasMore: all.length > page.length
			}
		});
	}

	function search(query: string): ApiResponse {
		searches.push(query);
		if (searchFailure) return searchFailure;
		const needle = query.toLowerCase();
		const found = games
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

	function applyGames(franchiseId: string, gameIds: string[] | undefined) {
		if (!gameIds) return;
		games = games.map(game => {
			if (gameIds.includes(game.id)) return { ...game, franchiseId };
			if (game.franchiseId === franchiseId)
				return { ...game, franchiseId: null };
			return game;
		});
	}

	function nameTaken(name: string, exceptId?: string) {
		return franchises.some(
			f =>
				f.id !== exceptId && f.name.toLowerCase() === name.toLowerCase()
		);
	}

	function create(body: Write["body"]): ApiResponse {
		if (createFailure) return createFailure;
		if (nameTaken(body.name)) return failure(409, "FRANCHISE_UNIQUE");
		const entry: StoredFranchise = {
			id: `f-${franchises.length + 1}`,
			name: body.name,
			code: toCode(body.name),
			description: body.description
		};
		franchises = [...franchises, entry];
		applyGames(entry.id, body.gameIds);
		return { status: 201, body: { data: { franchise: entry } } };
	}

	function update(id: string, body: Write["body"]): ApiResponse {
		if (updateFailure) return updateFailure;
		const current = franchises.find(f => f.id === id);
		if (!current) return failure(404, "FRANCHISE_NOT_FOUND");
		if (nameTaken(body.name, id)) return failure(409, "FRANCHISE_UNIQUE");
		const entry = {
			...current,
			name: body.name,
			code: toCode(body.name),
			description: body.description
		};
		franchises = franchises.map(f => (f.id === id ? entry : f));
		applyGames(id, body.gameIds);
		return ok({ data: { franchise: entry } });
	}

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url, body, params } = req.request;
		if (method === "GET" && url === franchisesUrl) {
			listRequests.push(Date.now());
			return ok({ data: { franchises, total: franchises.length } });
		}
		if (method === "POST" && url === franchisesUrl) {
			writes.push({ method, url, body });
			return create(body);
		}
		const searchMatch = url.match(
			/\/games\/search\?query=([^&]+)&local_only=true$/
		);
		if (method === "GET" && searchMatch)
			return search(decodeURIComponent(searchMatch[1]));
		const franchiseMatch = url.match(/\/franchises\/([^/?]+)$/);
		if (method === "GET" && franchiseMatch) {
			if (detailFailure) return detailFailure;
			const entry = franchises.find(f => f.code === franchiseMatch[1]);
			if (!entry) return failure(404, "FRANCHISE_NOT_FOUND");
			return detailOf(entry, Number(params.get("limit") ?? 100));
		}
		if (method === "PATCH" && franchiseMatch) {
			writes.push({ method, url, body });
			return update(franchiseMatch[1], body);
		}
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

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	async function settle() {
		await new Promise(resolve => setTimeout(resolve, 30));
	}

	function dialog() {
		return screen.getByRole("dialog");
	}

	async function appears(text: string) {
		await untilVisible(() =>
			expect(within(dialog()).getByText(text)).toBeInTheDocument()
		);
	}

	function nameInput() {
		return within(dialog()).getByRole("textbox", { name: /Name/ });
	}

	function descriptionInput() {
		return within(dialog()).getByRole("textbox", { name: "Description" });
	}

	function searchInput() {
		return within(dialog()).getByRole("textbox", {
			name: "Search games to add"
		});
	}

	function submitButton() {
		return within(dialog()).getByRole("button", { name: /^(Create|Save)/ });
	}

	function rowWithTitle(title: string) {
		return within(dialog())
			.getAllByRole("listitem")
			.find(item => within(item).queryByText(title)) as HTMLElement;
	}

	function isInFranchise(title: string) {
		return !!within(rowWithTitle(title)).queryByRole("button", {
			name: "Remove game"
		});
	}

	function franchiseRow(name: string) {
		return screen.getByRole("link", { name }).closest("li") as HTMLElement;
	}

	type User = ReturnType<typeof userEvent.setup>;

	async function openCreate(user: User) {
		await user.click(
			screen.getAllByRole("button", { name: "New franchise" })[0]
		);
		return screen.findByRole("dialog", { name: "New Franchise" });
	}

	async function openEdit(user: User, name: string, settleGames = true) {
		await untilVisible(() =>
			expect(screen.getByRole("link", { name })).toBeInTheDocument()
		);
		await user.click(
			within(franchiseRow(name)).getByRole("button", {
				name: "Edit franchise"
			})
		);
		const opened = await screen.findByRole("dialog", {
			name: "Edit Franchise"
		});
		if (settleGames)
			await untilVisible(() =>
				expect(
					within(opened).queryByText("Loading games...")
				).not.toBeInTheDocument()
			);
		return opened;
	}

	async function typeSearch(user: User, text: string) {
		await user.clear(searchInput());
		await user.type(searchInput(), text);
	}

	async function addGame(user: User, query: string, title = query) {
		await typeSearch(user, query);
		await untilVisible(() => expect(rowWithTitle(title)).toBeDefined());
		await user.click(
			within(rowWithTitle(title)).getByRole("button", { name: "Add" })
		);
	}

	async function closeDialogWithCancel(user: User) {
		await user.click(
			within(dialog()).getByRole("button", { name: "Cancel" })
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
	}

	async function renderHost(mobile = false) {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: mobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		await render(AdminFranchises, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast }
			],
			routes: []
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { level: 1, name: "Franchises" })
			).toBeInTheDocument()
		);
	}

	beforeEach(() => {
		franchises = [
			{ id: "f-souls", name: "Souls", code: "souls", description: null },
			{
				id: "f-zelda",
				name: "Zelda",
				code: "zelda",
				description: "Hyrule"
			}
		];
		games = [
			{ id: "ds1", title: "Dark Souls", franchiseId: "f-souls" },
			{ id: "ds2", title: "Dark Souls II", franchiseId: "f-souls" },
			{ id: "hk", title: "Hollow Knight", franchiseId: null },
			{ id: "hades", title: "Hades", franchiseId: null },
			{ id: "pokemon", title: "Pokémon Rojo", franchiseId: null },
			{ id: "emoji", title: "Game 🎮 Night", franchiseId: null },
			{ id: "botw", title: "Breath of the Wild", franchiseId: "f-zelda" }
		];
		held = () => false;
		createFailure = null;
		updateFailure = null;
		searchFailure = null;
		detailFailure = null;
		unexpectedRequests = [];
		writes.length = 0;
		searches.length = 0;
		listRequests.length = 0;
		toast.success.mockClear();
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

	describe("creating: validation", () => {
		it("keeps Create disabled and sends nothing while the name is empty", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			expect(submitButton()).toBeDisabled();
			await user.click(submitButton());
			await user.click(nameInput());
			await user.keyboard("{Enter}");
			await settle();

			expect(writes).toEqual([]);
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		it("refuses a name made only of spaces", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.type(nameInput(), "     ");
			await user.tab();

			expect(submitButton()).toBeDisabled();
			await appears("Name is required");
			await user.click(submitButton());
			expect(writes).toEqual([]);
		});

		it("caps the name at 100 characters when a longer text is pasted", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.click(nameInput());
			await user.paste("n".repeat(101));
			await addGame(user, "hades", "Hades");

			expect(nameInput()).toHaveValue("n".repeat(100));
			expect(submitButton()).toBeEnabled();
		});

		it("caps the description at 500 characters when a longer text is pasted", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "Metroid");

			await user.click(descriptionInput());
			await user.paste("d".repeat(501));
			await addGame(user, "hades", "Hades");

			expect(descriptionInput()).toHaveValue("d".repeat(500));
			expect(submitButton()).toBeEnabled();
		});

		it("sends nothing for an empty name and sends the corrected form afterwards", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await addGame(user, "hades", "Hades");

			await user.click(submitButton());
			await user.type(nameInput(), "Metroid");
			await user.clear(nameInput());
			await user.click(submitButton());
			expect(writes).toEqual([]);
			await user.type(nameInput(), "Metroid Prime");
			await user.click(submitButton());

			await untilVisible(() => expect(writes).toHaveLength(1));
			expect(writes[0].body.name).toBe("Metroid Prime");
		});
	});

	describe("creating: submitting", () => {
		it("sends the trimmed name, a null description for blank text and keeps unicode intact", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.type(nameInput(), "  Pokémon 🎮 Ñandú  ");
			await user.type(descriptionInput(), "   ");
			await addGame(user, "hades", "Hades");
			await user.click(submitButton());

			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Pokémon 🎮 Ñandú" })
				).toBeInTheDocument()
			);
			expect(writes[0].body).toEqual({
				name: "Pokémon 🎮 Ñandú",
				description: null,
				gameIds: ["hades"]
			});
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("keeps Create disabled with a valid name and no games and sends nothing on Enter", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.type(nameInput(), "Metroid");
			await user.type(descriptionInput(), "Bounty hunter");

			expect(submitButton()).toBeDisabled();
			expect(submitButton()).toHaveAttribute(
				"aria-describedby",
				"franchise-games-required"
			);
			await user.click(submitButton());
			await user.click(nameInput());
			await user.keyboard("{Enter}{Enter}");
			await settle();

			expect(writes).toEqual([]);
			expect(screen.getByRole("dialog")).toBeInTheDocument();

			await addGame(user, "hades", "Hades");
			expect(submitButton()).toBeEnabled();
			await user.click(
				within(dialog()).getByRole("button", { name: "Remove game" })
			);
			expect(submitButton()).toBeDisabled();
			await user.keyboard("{Enter}");
			await settle();
			expect(writes).toEqual([]);
		});

		it("sends one POST when Enter is pressed repeatedly on the focused Create button", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "Metroid");
			await addGame(user, "hades", "Hades");

			held = req => req.method === "POST";
			submitButton().focus();
			await user.keyboard("{Enter}{Enter}{Enter}");
			held = () => false;

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(writes).toHaveLength(1);
		});

		it("sends the selected games in the order they were added", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "Indies");
			await typeSearch(user, "hollow");
			await untilVisible(() =>
				expect(rowWithTitle("Hollow Knight")).toBeDefined()
			);
			await user.click(
				within(rowWithTitle("Hollow Knight")).getByRole("button", {
					name: "Add"
				})
			);
			await typeSearch(user, "hades");
			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);
			await user.click(
				within(rowWithTitle("Hades")).getByRole("button", {
					name: "Add"
				})
			);
			await user.click(submitButton());

			await untilVisible(() => expect(writes).toHaveLength(1));
			expect(writes[0].body.gameIds).toEqual(["hk", "hades"]);
		});

		it("shows the duplicate-name message on 409 and succeeds after changing the name", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "souls");
			await addGame(user, "hades", "Hades");
			await user.click(submitButton());

			await appears("A franchise with that name already exists");
			expect(submitButton()).toBeEnabled();

			await user.clear(nameInput());
			await user.type(nameInput(), "Souls Remastered");
			await user.click(submitButton());

			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Souls Remastered" })
				).toBeInTheDocument()
			);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(writes).toHaveLength(2);
		});

		it.each([
			[
				"a server error with a title",
				500,
				failure(500, "Server blew up"),
				"Server blew up"
			],
			[
				"a validation error",
				422,
				failure(422, "Invalid payload"),
				"Invalid payload"
			],
			[
				"a server error without a body",
				500,
				{ status: 500, body: {} },
				"Creation failed"
			],
			[
				"a network failure",
				0,
				{ status: 0, body: null },
				"Creation failed"
			]
		])(
			"shows a readable message on %s, stays open and allows retrying",
			async (_, __, response, message) => {
				const user = userEvent.setup();
				await renderHost();
				await openCreate(user);
				await user.type(nameInput(), "Metroid");
				await addGame(user, "hades", "Hades");
				createFailure = response;

				await user.click(submitButton());

				await appears(message);
				expect(submitButton()).toBeEnabled();
				expect(nameInput()).toHaveValue("Metroid");

				createFailure = null;
				await user.click(submitButton());
				await untilVisible(() =>
					expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
				);
				expect(writes).toHaveLength(2);
			}
		);

		it("clears the previous error when a retry starts", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "Metroid");
			await addGame(user, "hades", "Hades");
			createFailure = failure(500, "Server blew up");
			await user.click(submitButton());
			await appears("Server blew up");

			held = req => req.method === "POST";
			createFailure = null;
			await user.click(submitButton());

			expect(
				within(dialog()).queryByText("Server blew up")
			).not.toBeInTheDocument();
		});
	});

	describe("creating: closing the dialog", () => {
		it("closes with Cancel and Escape and the close button when idle", async () => {
			const user = userEvent.setup();
			await renderHost();

			await openCreate(user);
			await closeDialogWithCancel(user);
			await openCreate(user);
			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			await openCreate(user);
			await user.click(
				within(dialog()).getByRole("button", {
					name: "Close New Franchise"
				})
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(writes).toEqual([]);
		});

		it("opens and closes repeatedly without leaking dialogs or requests", async () => {
			const user = userEvent.setup();
			await renderHost();
			const before = listRequests.length;

			for (let round = 0; round < 4; round++) {
				await openCreate(user);
				await user.type(nameInput(), "x");
				await closeDialogWithCancel(user);
			}

			expect(screen.queryAllByRole("dialog")).toHaveLength(0);
			answerPending();
			expect(listRequests.length).toBe(before);
			expect(writes).toEqual([]);
		});

		it("reopens empty after a cancel with typed data, games and a server error", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "souls");
			await user.type(descriptionInput(), "something");
			await typeSearch(user, "hollow");
			await untilVisible(() =>
				expect(rowWithTitle("Hollow Knight")).toBeDefined()
			);
			await user.click(
				within(rowWithTitle("Hollow Knight")).getByRole("button", {
					name: "Add"
				})
			);
			await user.click(submitButton());
			await appears("A franchise with that name already exists");
			await closeDialogWithCancel(user);

			await openCreate(user);

			expect(nameInput()).toHaveValue("");
			expect(descriptionInput()).toHaveValue("");
			expect(searchInput()).toHaveValue("");
			expect(
				within(dialog()).queryByText(
					"A franchise with that name already exists"
				)
			).not.toBeInTheDocument();
			expect(
				within(dialog()).getByText("0 games in this franchise")
			).toBeInTheDocument();
		});

		it("disables Cancel while the request is in flight", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "Metroid");
			await addGame(user, "hades", "Hades");
			held = req => req.method === "POST";
			await user.click(submitButton());

			expect(
				within(dialog()).getByRole("button", { name: "Cancel" })
			).toBeDisabled();
		});

		it("shows the new franchise in the list even if Cancel is clicked while saving", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "Metroid");
			await addGame(user, "hades", "Hades");
			held = req => req.method === "POST";
			await user.click(submitButton());
			await user.click(
				within(dialog()).getByRole("button", { name: "Cancel" })
			);
			expect(screen.getByRole("dialog")).toBeInTheDocument();
			held = () => false;

			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Metroid" })
				).toBeInTheDocument()
			);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	describe("games search", () => {
		it("does not search for a single character or for spaces", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.type(searchInput(), "h");
			await settle();
			await settle();
			await user.clear(searchInput());
			await user.type(searchInput(), "   ");
			await settle();
			await new Promise(resolve => setTimeout(resolve, 350));
			answerPending();

			expect(searches).toEqual([]);
			expect(
				within(dialog()).queryByText("No games found.")
			).not.toBeInTheDocument();
		});

		it("searches once after typing fast and shows results with their franchise or nothing", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			for (const typed of ["d", "da", "dar", "dark"])
				fireEvent.input(searchInput(), { target: { value: typed } });

			await untilVisible(() =>
				expect(rowWithTitle("Dark Souls II")).toBeDefined()
			);
			expect(searches).toEqual(["dark"]);
			expect(
				within(rowWithTitle("Dark Souls")).getByText("in Souls")
			).toBeInTheDocument();
			expect(
				within(rowWithTitle("Dark Souls")).getByRole("button", {
					name: "Add"
				})
			).toBeInTheDocument();
		});

		it("accepts a long text and shows no games found", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			for (let length = 1; length <= 150; length++)
				fireEvent.input(searchInput(), {
					target: { value: "z".repeat(length) }
				});

			await untilVisible(() =>
				expect(searches).toEqual(["z".repeat(150)])
			);
			await appears("No games found.");
		});

		it("hides the results when the text is shortened below two characters and shows fresh ones when retyped", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(searchInput(), "ho");
			await untilVisible(() =>
				expect(rowWithTitle("Hollow Knight")).toBeDefined()
			);

			await user.type(searchInput(), "{Backspace}");
			expect(
				within(dialog()).queryByText("Hollow Knight")
			).not.toBeInTheDocument();
			await user.clear(searchInput());
			await user.type(searchInput(), "had");

			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);
			expect(
				within(dialog()).queryByText("Hollow Knight")
			).not.toBeInTheDocument();
		});

		it("shows no games found for an unknown title and recovers when cleared and retyped", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.type(searchInput(), "qwerty");
			await appears("No games found.");
			await user.clear(searchInput());
			expect(
				within(dialog()).queryByText("No games found.")
			).not.toBeInTheDocument();
			await user.type(searchInput(), "hades");

			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);
		});

		it("moves a game from the results to the selection with a single Add even on a triple click", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(searchInput(), "hades");
			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);

			await user.tripleClick(
				within(rowWithTitle("Hades")).getByRole("button", {
					name: "Add"
				})
			);

			expect(
				within(dialog()).getByText("1 game in this franchise")
			).toBeInTheDocument();
			expect(within(dialog()).getAllByText("Hades")).toHaveLength(1);
			expect(
				within(dialog()).getByText("No games found.")
			).toBeInTheDocument();
		});

		it("does not offer a game that is already selected and offers it again after removing it", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(searchInput(), "hades");
			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);
			await user.click(
				within(rowWithTitle("Hades")).getByRole("button", {
					name: "Add"
				})
			);

			await typeSearch(user, "hade");
			await untilVisible(() =>
				expect(
					within(dialog()).getByText("No games found.")
				).toBeInTheDocument()
			);
			await user.click(
				within(dialog()).getByRole("button", { name: "Remove game" })
			);
			await typeSearch(user, "hades");

			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);
			expect(
				within(rowWithTitle("Hades")).getByRole("button", {
					name: "Add"
				})
			).toBeInTheDocument();
		});

		it("returns to the empty selection message after removing every game", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(nameInput(), "Metroid");
			await user.type(searchInput(), "dark");
			await untilVisible(() =>
				expect(rowWithTitle("Dark Souls II")).toBeDefined()
			);
			await user.click(
				within(rowWithTitle("Dark Souls II")).getByRole("button", {
					name: "Add"
				})
			);
			await user.click(
				within(rowWithTitle("Dark Souls")).getByRole("button", {
					name: "Add"
				})
			);
			expect(
				within(dialog()).getByText("2 games in this franchise")
			).toBeInTheDocument();
			expect(submitButton()).toBeEnabled();

			for (const button of within(dialog()).getAllByRole("button", {
				name: "Remove game"
			}))
				await user.click(button);

			expect(
				within(dialog()).getByText(
					"A saga needs at least one game. Search above to add some."
				)
			).toBeInTheDocument();
			expect(submitButton()).toBeDisabled();
			expect(writes).toEqual([]);
		});

		it("tells the user a search failed and keeps searching afterwards", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			searchFailure = failure(500);

			await user.type(searchInput(), "hades");
			await appears("Could not search games. Try again.");
			expect(
				within(dialog()).queryByRole("list", {
					name: "Searching games"
				})
			).not.toBeInTheDocument();
			searchFailure = null;
			await typeSearch(user, "hollow");

			await untilVisible(() =>
				expect(rowWithTitle("Hollow Knight")).toBeDefined()
			);
			expect(
				within(dialog()).queryByText(
					"Could not search games. Try again."
				)
			).not.toBeInTheDocument();
		});
	});

	describe("editing", () => {
		it("shows the loading skeleton and then the franchise games", async () => {
			const user = userEvent.setup();
			await renderHost();
			held = req => req.url === `${franchisesUrl}/souls`;

			await openEdit(user, "Souls", false);
			expect(
				within(dialog()).getByRole("list", { name: "Loading games" })
			).toHaveAttribute("aria-busy", "true");
			expect(nameInput()).toHaveValue("Souls");
			held = () => false;

			await untilVisible(() =>
				expect(
					within(dialog()).getByText("2 games in this franchise")
				).toBeInTheDocument()
			);
			expect(isInFranchise("Dark Souls")).toBe(true);
		});

		it("sends a single PATCH without games on a triple click when only the name changed and refreshes the list", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Souls");
			await user.clear(nameInput());
			await user.type(nameInput(), "Soulslike");

			held = req => req.method === "PATCH";
			await user.tripleClick(submitButton());
			held = () => false;

			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Soulslike" })
				).toBeInTheDocument()
			);
			expect(writes).toHaveLength(1);
			expect(writes[0].method).toBe("PATCH");
			expect(writes[0].body.gameIds).toBeUndefined();
			expect(games.filter(g => g.franchiseId === "f-souls")).toHaveLength(
				2
			);
		});

		it("sends a null description when it is cleared", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Zelda");
			expect(descriptionInput()).toHaveValue("Hyrule");

			await user.clear(descriptionInput());
			await user.click(submitButton());

			await untilVisible(() => expect(writes).toHaveLength(1));
			expect(writes[0].body.description).toBeNull();
		});

		it("shows the duplicate message when renaming into an existing name and keeps the games", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Souls");
			await user.clear(nameInput());
			await user.type(nameInput(), "ZELDA");
			await user.click(submitButton());

			await appears("A franchise with that name already exists");
			expect(
				within(dialog()).getByText("2 games in this franchise")
			).toBeInTheDocument();
			expect(submitButton()).toBeEnabled();
		});

		it("shows the server title when the franchise was deleted meanwhile", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Souls");
			franchises = franchises.filter(f => f.id !== "f-souls");

			await user.click(submitButton());

			await appears("FRANCHISE_NOT_FOUND");
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		it("falls back to the update message on a network failure", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Souls");
			updateFailure = { status: 0, body: null };

			await user.click(submitButton());

			await appears("Update failed");
		});

		it("keeps Save disabled until the franchise games finished loading", async () => {
			const user = userEvent.setup();
			await renderHost();
			held = req => req.url === `${franchisesUrl}/souls`;
			await openEdit(user, "Souls", false);

			expect(submitButton()).toBeDisabled();
			await user.click(submitButton());
			held = () => false;
			answerPending();
			await settle();

			expect(writes).toEqual([]);
			await untilVisible(() => expect(submitButton()).toBeEnabled());
		});

		it("shows a retry when the games cannot be loaded and never wipes them on a rename", async () => {
			const user = userEvent.setup();
			await renderHost();
			detailFailure = failure(500);
			await openEdit(user, "Souls");
			await appears("Could not load the games of this franchise.");
			expect(searchInput()).toBeDisabled();
			await user.clear(nameInput());
			await user.type(nameInput(), "Soulslike");

			await user.click(submitButton());

			await untilVisible(() => expect(writes).toHaveLength(1));
			expect(writes[0].body.gameIds).toBeUndefined();
			expect(games.filter(g => g.franchiseId === "f-souls")).toHaveLength(
				2
			);
		});

		it("disables Save when every game is removed, sends no PATCH and enables it again after adding a game", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Souls");
			await user.clear(nameInput());
			await user.type(nameInput(), "Soulslike");

			for (const button of within(dialog()).getAllByRole("button", {
				name: "Remove game"
			}))
				await user.click(button);

			expect(submitButton()).toBeDisabled();
			expect(
				within(dialog()).getByText(
					"A saga needs at least one game. Search above to add some."
				)
			).toBeInTheDocument();
			await user.click(submitButton());
			await user.click(nameInput());
			await user.keyboard("{Enter}");
			await settle();
			expect(writes).toEqual([]);
			expect(screen.getByRole("dialog")).toBeInTheDocument();

			await addGame(user, "hades", "Hades");
			expect(submitButton()).toBeEnabled();
			await user.click(submitButton());

			await untilVisible(() => expect(writes).toHaveLength(1));
			expect(writes[0].method).toBe("PATCH");
			expect(writes[0].body.name).toBe("Soulslike");
			expect(writes[0].body.gameIds).toEqual(["hades"]);
		});

		it("saves a rename when the games failed to load without sending any games", async () => {
			const user = userEvent.setup();
			await renderHost();
			detailFailure = failure(500);
			await openEdit(user, "Souls");
			await appears("Could not load the games of this franchise.");

			await user.clear(nameInput());
			await user.type(nameInput(), "Soulslike");
			expect(submitButton()).toBeEnabled();
			await user.tripleClick(submitButton());

			await untilVisible(() => expect(writes).toHaveLength(1));
			expect(writes[0].method).toBe("PATCH");
			expect(writes[0].body.name).toBe("Soulslike");
			expect(writes[0].body.gameIds).toBeUndefined();
			expect(games.filter(g => g.franchiseId === "f-souls")).toHaveLength(
				2
			);
		});

		it("loads the games after Try again when the first attempt failed", async () => {
			const user = userEvent.setup();
			await renderHost();
			detailFailure = failure(500);
			await openEdit(user, "Souls");
			await appears("Could not load the games of this franchise.");

			detailFailure = null;
			await user.click(
				within(dialog()).getByRole("button", { name: "Try again" })
			);

			await appears("2 games in this franchise");
			expect(searchInput()).toBeEnabled();
			expect(isInFranchise("Dark Souls")).toBe(true);
		});

		it("sends the games only when the list changed and not when a game is removed and re-added", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Souls");
			await user.click(
				within(rowWithTitle("Dark Souls II")).getByRole("button", {
					name: "Remove game"
				})
			);
			await user.type(searchInput(), "dark souls ii");
			await untilVisible(() =>
				expect(
					within(rowWithTitle("Dark Souls II")).getByRole("button", {
						name: "Add"
					})
				).toBeInTheDocument()
			);
			await user.click(
				within(rowWithTitle("Dark Souls II")).getByRole("button", {
					name: "Add"
				})
			);
			await user.click(submitButton());

			await untilVisible(() => expect(writes).toHaveLength(1));
			expect(writes[0].body.gameIds).toBeUndefined();
		});

		it("locks the games of a franchise with more than 100 games and keeps them all on a rename", async () => {
			const user = userEvent.setup();
			games = Array.from({ length: 150 }, (_, index) => ({
				id: `big${index}`,
				title: `Big Game ${index}`,
				franchiseId: "f-souls"
			}));
			await renderHost();
			await openEdit(user, "Souls");
			expect(
				within(dialog()).getByText("showing first 100")
			).toBeInTheDocument();
			expect(
				within(dialog()).getByText(/can't be changed from this dialog/)
			).toBeInTheDocument();
			expect(searchInput()).toBeDisabled();
			for (const button of within(dialog()).getAllByRole("button", {
				name: "Remove game"
			}))
				expect(button).toBeDisabled();
			await user.clear(nameInput());
			await user.type(nameInput(), "Souls Saga");

			await user.click(submitButton());
			await untilVisible(() => expect(writes).toHaveLength(1));

			expect(writes[0].body.gameIds).toBeUndefined();
			expect(games.filter(g => g.franchiseId === "f-souls")).toHaveLength(
				150
			);
		});

		it("moves from the name to the description to the search with Tab", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.type(nameInput(), "Metroid");
			await user.tab();
			expect(descriptionInput()).toHaveFocus();
			await user.tab();
			expect(searchInput()).toHaveFocus();
		});
	});

	describe("server error visibility", () => {
		const DUPLICATE = "A franchise with that name already exists";

		async function createWithDuplicateName(user: User) {
			await openCreate(user);
			await user.type(nameInput(), "souls");
			await user.type(descriptionInput(), "first");
			await addGame(user, "hades", "Hades");
			await user.click(submitButton());
			await appears(DUPLICATE);
		}

		function duplicateMessage() {
			return within(dialog()).queryByText(DUPLICATE);
		}

		it("hides the server error as soon as the name is edited", async () => {
			const user = userEvent.setup();
			await renderHost();
			await createWithDuplicateName(user);

			await user.type(nameInput(), "x");

			expect(duplicateMessage()).not.toBeInTheDocument();
			expect(writes).toHaveLength(1);
		});

		it("hides the server error as soon as the description is edited", async () => {
			const user = userEvent.setup();
			await renderHost();
			await createWithDuplicateName(user);

			await user.type(descriptionInput(), "!");

			expect(duplicateMessage()).not.toBeInTheDocument();
		});

		it("keeps the server error while games are added and removed", async () => {
			const user = userEvent.setup();
			await renderHost();
			await createWithDuplicateName(user);

			await typeSearch(user, "hollow");
			await untilVisible(() =>
				expect(rowWithTitle("Hollow Knight")).toBeDefined()
			);
			await user.click(
				within(rowWithTitle("Hollow Knight")).getByRole("button", {
					name: "Add"
				})
			);
			expect(duplicateMessage()).toBeInTheDocument();

			await user.click(
				within(rowWithTitle("Hollow Knight")).getByRole("button", {
					name: "Remove game"
				})
			);
			expect(duplicateMessage()).toBeInTheDocument();
		});

		it("shows the error again when the name goes back to the one that failed", async () => {
			const user = userEvent.setup();
			await renderHost();
			await createWithDuplicateName(user);

			await user.type(nameInput(), "x");
			expect(duplicateMessage()).not.toBeInTheDocument();
			await user.type(nameInput(), "{Backspace}");

			expect(duplicateMessage()).toBeInTheDocument();

			await user.clear(nameInput());
			expect(duplicateMessage()).not.toBeInTheDocument();
			await user.type(nameInput(), "souls");
			expect(duplicateMessage()).toBeInTheDocument();
		});

		it("shows the new error when a resubmit fails with a different message", async () => {
			const user = userEvent.setup();
			await renderHost();
			await createWithDuplicateName(user);
			await user.type(nameInput(), "x");
			expect(duplicateMessage()).not.toBeInTheDocument();

			createFailure = failure(500, "Server blew up");
			await user.click(submitButton());

			await appears("Server blew up");
			expect(duplicateMessage()).not.toBeInTheDocument();

			await user.type(descriptionInput(), "more");
			expect(
				within(dialog()).queryByText("Server blew up")
			).not.toBeInTheDocument();
		});

		it("hides an edit-mode error on edit and keeps it when only games change", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openEdit(user, "Souls");
			await user.clear(nameInput());
			await user.type(nameInput(), "ZELDA");
			await user.click(submitButton());
			await appears(DUPLICATE);

			await user.click(
				within(rowWithTitle("Dark Souls II")).getByRole("button", {
					name: "Remove game"
				})
			);
			expect(duplicateMessage()).toBeInTheDocument();

			await user.type(descriptionInput(), "d");
			expect(duplicateMessage()).not.toBeInTheDocument();
		});

		it("does not carry the error into a reopened dialog", async () => {
			const user = userEvent.setup();
			await renderHost();
			await createWithDuplicateName(user);
			await user.type(nameInput(), "x");
			await closeDialogWithCancel(user);

			await openCreate(user);
			expect(duplicateMessage()).not.toBeInTheDocument();
			await user.type(nameInput(), "souls");
			expect(duplicateMessage()).not.toBeInTheDocument();
		});
	});

	describe("keyboard", () => {
		it("moves from the name to the description to the search with Tab", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);

			await user.type(nameInput(), "Metroid");
			await user.tab();
			expect(descriptionInput()).toHaveFocus();
			await user.tab();
			expect(searchInput()).toHaveFocus();
		});

		it("adds a game with the keyboard", async () => {
			const user = userEvent.setup();
			await renderHost();
			await openCreate(user);
			await user.type(searchInput(), "hades");
			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);

			within(rowWithTitle("Hades"))
				.getByRole("button", { name: "Add" })
				.focus();
			await user.keyboard(" ");

			expect(
				within(dialog()).getByText("1 game in this franchise")
			).toBeInTheDocument();
		});
	});

	describe("mobile viewport", () => {
		it("creates a franchise with a game through the same dialog", async () => {
			const user = userEvent.setup();
			await renderHost(true);
			await openCreate(user);
			await user.type(nameInput(), "Metroid");
			await user.type(searchInput(), "hades");
			await untilVisible(() =>
				expect(rowWithTitle("Hades")).toBeDefined()
			);
			await user.click(
				within(rowWithTitle("Hades")).getByRole("button", {
					name: "Add"
				})
			);

			await user.tripleClick(submitButton());

			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Metroid" })
				).toBeInTheDocument()
			);
			expect(writes).toHaveLength(1);
			expect(writes[0].body.gameIds).toEqual(["hades"]);
		});
	});
});
