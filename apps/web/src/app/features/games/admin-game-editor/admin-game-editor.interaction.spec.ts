import "@testing-library/jest-dom/vitest";

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
import { type Game } from "../../../core/models";
import { AdminGameEditor } from "./admin-game-editor";

interface ApiFailure {
	status: number;
	body?: object;
}

interface Call {
	method: string;
	path: string;
	body: Record<string, unknown> | null;
}

const api = environment.apiUrl;
const scoreSources = [
	{ code: "completr", name: "Completr", scale: 5, priority: 0 },
	{ code: "metacritic", name: "Metacritic", scale: 100, priority: 1 },
	{ code: "opencritic", name: "OpenCritic", scale: 100, priority: 2 }
];
const platforms = [
	{ id: "p1", code: "pc", name: "PC", abbreviation: "PC" },
	{ id: "p2", code: "ps5", name: "PlayStation 5", abbreviation: "PS5" }
];
const genres = [
	{ id: "ge1", code: "rpg", name: "RPG" },
	{ id: "ge2", code: "action", name: "Action" }
];
const franchises = [
	{ id: "f1", name: "Supergiant", code: "supergiant" },
	{ id: "f2", name: "Mass Effect", code: "mass-effect" }
];

const summary = (id: string, title: string, code: string) => ({
	id,
	title,
	code,
	backgroundUrl: null
});

const catalog: Game[] = [
	summary("m1", "Mass Effect", "mass-effect"),
	summary("m2", "Mario Kart", "mario-kart"),
	summary("m3", "Madden", "madden"),
	summary("m4", "Mass Effect 2", "mass-effect-2"),
	summary("g1", "Hades", "hades")
] as unknown as Game[];

const existingGame = {
	id: "g1",
	code: "hades",
	title: "Hades",
	description: "Escape the underworld",
	isDlc: false,
	platforms: [],
	genres: [],
	scores: [{ source: "metacritic", score: 90 }],
	times: [{ source: "hltb", duration: 20 }]
} as unknown as Game;

const compilationGame = {
	...existingGame,
	isCompilation: true,
	compilationItems: [
		{
			id: "c1",
			position: 1,
			game: summary("m1", "Mass Effect", "mass-effect")
		},
		{
			id: "c2",
			position: 2,
			game: summary("m4", "Mass Effect 2", "mass-effect-2")
		}
	]
} as unknown as Game;

const rawgHades = {
	rawgId: 3498,
	title: "Hades (RAWG)",
	description: "From RAWG",
	coverUrl: "https://img.example/hades.jpg",
	releaseAt: "2020-09-17",
	platforms: ["pc"],
	genres: ["action"],
	scores: [{ source: "metacritic", score: 93 }],
	times: [{ source: "hltb", duration: 22 }]
};

describe("AdminGameEditor interaction", () => {
	let httpTesting: HttpTestingController;
	let calls: Call[];
	let failures: Record<string, ApiFailure>;
	let holds: string[];
	let held: { key: string; req: TestRequest }[];
	let rawgCatalog: Record<string, typeof rawgHades>;
	let parentCatalog: Record<string, Game>;
	let searchLimit: number;
	let compilationItemsResponse: unknown[];
	let splitResponse: Game[];
	let unexpectedRequests: string[];
	let saved: ReturnType<typeof vi.fn<() => void>>;
	let created: ReturnType<typeof vi.fn<(game: Game) => void>>;
	let split: ReturnType<typeof vi.fn<(game: Game) => void>>;

	function keyOf(req: TestRequest) {
		return `${req.request.method} ${req.request.url.replace(api, "")}`;
	}

	function respond(req: TestRequest) {
		if (req.cancelled) return;
		const { method, url, body } = req.request;
		const path = url.replace(api, "");
		const key = `${method} ${path}`;
		calls.push({ method, path, body });
		const failure =
			failures[key] ?? failures[`${method} ${path.split("?")[0]}`];
		if (failure)
			return req.flush(failure.body ?? {}, {
				status: failure.status,
				statusText: "err"
			});
		if (path === "/score-sources")
			return req.flush({ data: { sources: scoreSources } });
		if (path === "/platforms") return req.flush({ data: { platforms } });
		if (path === "/genres") return req.flush({ data: { genres } });
		if (method === "GET" && path.startsWith("/franchises"))
			return req.flush({
				data: { franchises, total: franchises.length }
			});
		if (method === "GET" && path.startsWith("/game-external/rawg/")) {
			const slug = decodeURIComponent(path.split("/").pop()!);
			const detail = rawgCatalog[slug];
			return detail
				? req.flush({ data: { game: detail } })
				: req.flush({}, { status: 404, statusText: "Not Found" });
		}
		if (method === "GET" && path.startsWith("/games/search")) {
			const query = new URL(url).searchParams.get("query")!.toLowerCase();
			const games = catalog
				.filter(game => game.title.toLowerCase().includes(query))
				.slice(0, searchLimit);
			return req.flush({ data: { games } });
		}
		if (method === "GET" && /^\/games\/[^/?]+$/.test(path)) {
			const parent = parentCatalog[path.split("/").pop()!];
			return parent
				? req.flush({ data: { game: parent } })
				: req.flush({}, { status: 404, statusText: "Not Found" });
		}
		if (method === "POST" && path === "/games")
			return req.flush(
				{
					data: {
						game: {
							...existingGame,
							id: "new1",
							title: body?.["title"]
						}
					}
				},
				{ status: 201, statusText: "Created" }
			);
		if (method === "PATCH" && path === "/games/g1")
			return req.flush({ data: { game: existingGame } });
		if (method === "PUT" && /^\/games\/g1\/(scores|times)$/.test(path))
			return req.flush({ data: {} });
		if (method === "POST" && path === "/games/g1/split")
			return req.flush(
				{ data: { games: splitResponse } },
				{ status: 201, statusText: "Created" }
			);
		if (method === "PUT" && path === "/games/g1/compilation-items")
			return req.flush({ data: { items: compilationItemsResponse } });
		if (method === "DELETE" && path === "/games/g1/compilation-items")
			return req.flush("", { status: 204, statusText: "No Content" });
		unexpectedRequests.push(key);
	}

	function answer(req: TestRequest) {
		const key = keyOf(req);
		if (holds.some(prefix => key.startsWith(prefix))) {
			held.push({ key, req });
			return;
		}
		respond(req);
	}

	function releaseHeld(key: string) {
		const entry = held.find(item => item.key === key);
		if (!entry) throw new Error(`Nothing held for ${key}`);
		held = held.filter(item => item !== entry);
		respond(entry.req);
	}

	function releaseAll() {
		const pending = held;
		held = [];
		holds = [];
		pending.forEach(item => respond(item.req));
	}

	function heldKeys(prefix: string) {
		return held.filter(item => item.key.startsWith(prefix));
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) break;
			pending.forEach(answer);
		}
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function callsTo(method: string, path: string) {
		return calls.filter(
			call => call.method === method && call.path === path
		);
	}

	function searchCalls() {
		return calls.filter(call => call.path.startsWith("/games/search"));
	}

	function stubViewport(isMobile: boolean) {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: isMobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	}

	async function renderEditor(game: Game | null, embedded = false) {
		await render(AdminGameEditor, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			inputs: { game, embedded },
			on: { saved, created, split }
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() => {
			expect(
				screen.getByRole("button", { name: "PC" })
			).toBeInTheDocument();
			expect(calls.some(call => call.path === "/score-sources")).toBe(
				true
			);
		});
	}

	const renderEdit = (game: Game = existingGame) => renderEditor(game);
	const renderEmbedded = (game: Game = existingGame) =>
		renderEditor(game, true);
	const renderCreate = () => renderEditor(null);

	async function replaceText(element: HTMLElement, value: string) {
		await userEvent.clear(element);
		if (value) await userEvent.type(element, value);
	}

	async function pasteInto(element: HTMLElement, value: string) {
		await userEvent.click(element);
		await userEvent.clear(element);
		await userEvent.paste(value);
	}

	const titleInput = () => screen.getByLabelText("Title");
	const rawgInput = () => screen.getByRole("textbox", { name: "RAWG slug" });
	const parentInput = () =>
		screen.getByRole("textbox", { name: "Parent game slug" });
	const button = (name: string | RegExp) =>
		screen.getByRole("button", { name });

	async function openSplit() {
		await userEvent.click(button("Split game"));
		return screen.findByRole("dialog", {
			name: "Split game into variants"
		});
	}

	async function openCompilation(heading: string) {
		await userEvent.click(button(heading));
		return screen.findByRole("dialog", { name: heading });
	}

	async function fillSplit(
		dialog: HTMLElement,
		rows: { title: string; variant: string }[]
	) {
		for (const [index, row] of rows.entries()) {
			await replaceText(splitTitle(dialog, index + 1), row.title);
			await replaceText(splitLabel(dialog, index), row.variant);
		}
	}

	const splitTitle = (dialog: HTMLElement, position: number) =>
		within(dialog).getAllByPlaceholderText("e.g. Pokemon Pearl")[
			position - 1
		];
	const splitTitleOrNull = (dialog: HTMLElement, position: number) =>
		within(dialog).queryAllByPlaceholderText("e.g. Pokemon Pearl")[
			position - 1
		] ?? null;
	const splitLabel = (dialog: HTMLElement, index: number) =>
		within(dialog).getAllByPlaceholderText("Pearl")[index];
	const splitSubmit = (dialog: HTMLElement) =>
		within(dialog).getByRole("button", { name: "Split" });
	const compilationSave = (dialog: HTMLElement) =>
		within(dialog).getByRole("button", { name: "Save" });
	const searchBox = (dialog: HTMLElement, index: number) =>
		within(dialog).getAllByRole("textbox", {
			name: "Search existing game"
		})[index];

	const resultName = (title: string, code: string) => (name: string) =>
		name.startsWith(title) && name.endsWith(code);

	async function pickLinked(
		dialog: HTMLElement,
		query: string,
		title: string
	) {
		await userEvent.type(searchBox(dialog, 0), query);
		const game = catalog.find(item => item.title === title)!;
		const option = await waitFor(() => {
			answerPending();
			return within(dialog).getByRole("button", {
				name: resultName(game.title, game.code)
			});
		});
		await userEvent.click(option);
	}

	async function waitForDialogGone(name: string) {
		await untilVisible(() =>
			expect(screen.queryByRole("dialog", { name })).toBeNull()
		);
	}

	beforeEach(() => {
		calls = [];
		failures = {};
		holds = [];
		held = [];
		rawgCatalog = { hades: rawgHades };
		parentCatalog = { hades: existingGame, "mass-effect": catalog[0] };
		searchLimit = 8;
		compilationItemsResponse = [];
		splitResponse = [
			{ ...existingGame, title: "Pearl" },
			{ ...existingGame, id: "g2", title: "Diamond" }
		] as unknown as Game[];
		unexpectedRequests = [];
		saved = vi.fn();
		created = vi.fn();
		split = vi.fn();
		stubViewport(false);
	});

	afterEach(() => {
		try {
			if (httpTesting) {
				releaseAll();
				answerPending();
				httpTesting.verify();
			}
			expect(unexpectedRequests).toEqual([]);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("RAWG lookup", () => {
		it("fills the form from RAWG and sends the external id when the game is created", async () => {
			await renderCreate();

			await userEvent.type(rawgInput(), "hades");
			await userEvent.click(button("Fetch"));
			await untilVisible(() =>
				expect(screen.getByText("RAWG ID: 3498")).toBeInTheDocument()
			);

			expect(titleInput()).toHaveValue("Hades (RAWG)");
			expect(screen.getByLabelText("Description")).toHaveValue(
				"From RAWG"
			);
			expect(screen.getByLabelText("Release date")).toHaveValue(
				"2020-09-17"
			);
			expect(button("PC")).toHaveAttribute("aria-pressed", "true");
			expect(button("PS5")).toHaveAttribute("aria-pressed", "false");
			expect(screen.getByLabelText("metacritic score")).toHaveValue(93);

			await userEvent.click(button("Create Game"));
			await untilVisible(() => expect(created).toHaveBeenCalledTimes(1));
			const [post] = callsTo("POST", "/games");
			expect(post.body?.["externalIds"]).toEqual([
				{ source: "rawg", externalId: "3498" }
			]);
			expect(post.body?.["platforms"]).toEqual(["pc"]);
		});

		it("sends one request when Fetch is clicked three times in a row", async () => {
			await renderCreate();
			holds = ["GET /game-external/rawg/"];
			await userEvent.type(rawgInput(), "hades");

			await userEvent.tripleClick(button("Fetch"));
			answerPending();

			expect(heldKeys("GET /game-external/rawg/")).toHaveLength(1);
			expect(button("Fetching...")).toBeDisabled();
		});

		it("sends one request when Enter is pressed repeatedly in the RAWG slug field", async () => {
			await renderCreate();
			holds = ["GET /game-external/rawg/"];
			await userEvent.type(rawgInput(), "hades{Enter}{Enter}{Enter}");
			answerPending();

			expect(heldKeys("GET /game-external/rawg/")).toHaveLength(1);
		});

		it("ignores a blank or whitespace-only slug on click and on Enter", async () => {
			await renderCreate();

			expect(button("Fetch")).toBeDisabled();
			await userEvent.type(rawgInput(), "   {Enter}");
			expect(button("Fetch")).toBeDisabled();
			answerPending();

			expect(
				calls.filter(call => call.path.startsWith("/game-external"))
			).toEqual([]);
		});

		it.each([
			["a 404", 404],
			["a 500", 500],
			["a network error", 0]
		])(
			"shows the not-found message after %s and lets the admin correct the slug",
			async (_label, status) => {
				await renderCreate();
				failures["GET /game-external/rawg/nope"] = { status };
				await userEvent.type(rawgInput(), "nope");
				await userEvent.click(button("Fetch"));
				await untilVisible(() =>
					expect(
						screen.getByText("Game not found on RAWG")
					).toBeInTheDocument()
				);
				expect(button("Fetch")).toBeEnabled();

				await replaceText(rawgInput(), "hades");
				await userEvent.click(button("Fetch"));

				await untilVisible(() =>
					expect(
						screen.getByText("RAWG ID: 3498")
					).toBeInTheDocument()
				);
				expect(screen.queryByText("Game not found on RAWG")).toBeNull();
			}
		);

		it("encodes unicode, emoji and spaces in the slug", async () => {
			await renderCreate();
			rawgCatalog["pokémon 💥/ö"] = rawgHades;

			await pasteInto(rawgInput(), "pokémon 💥/ö");
			await userEvent.click(button("Fetch"));

			await untilVisible(() =>
				expect(screen.getByText("RAWG ID: 3498")).toBeInTheDocument()
			);
			expect(calls.at(-1)?.path).toBe(
				`/game-external/rawg/${encodeURIComponent("pokémon 💥/ö")}`
			);
		});

		it("keeps the data of the latest slug when an older RAWG response arrives after a newer one", async () => {
			await renderCreate();
			rawgCatalog["first"] = { ...rawgHades, rawgId: 1, title: "First" };
			rawgCatalog["second"] = {
				...rawgHades,
				rawgId: 2,
				title: "Second"
			};
			holds = ["GET /game-external/rawg/"];

			await userEvent.type(rawgInput(), "first{Enter}");
			answerPending();
			await replaceText(rawgInput(), "second");
			await userEvent.type(rawgInput(), "{Enter}");
			answerPending();
			expect(heldKeys("GET /game-external/rawg/")).toHaveLength(2);

			releaseHeld("GET /game-external/rawg/second");
			await waitFor(() => expect(titleInput()).toHaveValue("Second"));
			releaseHeld("GET /game-external/rawg/first");
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(titleInput()).toHaveValue("Second");
			expect(screen.getByText("RAWG ID: 2")).toBeInTheDocument();
		});
	});

	describe("creating a game", () => {
		it("keeps Create Game disabled for an empty or whitespace-only title", async () => {
			await renderCreate();

			expect(button("Create Game")).toBeDisabled();
			await userEvent.type(titleInput(), "     ");
			expect(button("Create Game")).toBeDisabled();
			await userEvent.type(titleInput(), "Hades II");
			expect(button("Create Game")).toBeEnabled();
			await userEvent.clear(titleInput());
			expect(button("Create Game")).toBeDisabled();
		});

		it("does not submit when Enter is pressed in the title field", async () => {
			await renderCreate();

			await userEvent.type(titleInput(), "Hades II{Enter}");
			answerPending();

			expect(callsTo("POST", "/games")).toEqual([]);
		});

		it("sends a single create request when Create Game is clicked three times", async () => {
			await renderCreate();
			holds = ["POST /games"];
			await userEvent.type(titleInput(), "Hades II");

			await userEvent.tripleClick(button("Create Game"));
			answerPending();

			expect(heldKeys("POST /games")).toHaveLength(1);
			expect(button("Saving...")).toBeDisabled();
			releaseAll();
			await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
			expect(callsTo("POST", "/games")).toHaveLength(1);
		});

		it("sends the title without the spaces around it", async () => {
			await renderCreate();

			await pasteInto(titleInput(), "   Hades II   ");
			await userEvent.click(button("Create Game"));
			await untilVisible(() => expect(created).toHaveBeenCalled());

			expect(callsTo("POST", "/games")[0].body?.["title"]).toBe(
				"Hades II"
			);
		});

		it("sends unicode, emoji and accented text untouched", async () => {
			await renderCreate();

			await pasteInto(titleInput(), "Pokémon 💥 ÑANDÚ");
			await pasteInto(
				screen.getByLabelText("Description"),
				"línea ✨\nsegunda"
			);
			await userEvent.click(button("Create Game"));
			await untilVisible(() => expect(created).toHaveBeenCalled());

			const body = callsTo("POST", "/games")[0].body;
			expect(body?.["title"]).toBe("Pokémon 💥 ÑANDÚ");
			expect(body?.["description"]).toBe("línea ✨\nsegunda");
		});

		it("does not send a variant label longer than the 100 characters the form allows", async () => {
			await renderCreate();
			await userEvent.type(titleInput(), "Hades II");

			await pasteInto(
				screen.getByLabelText("Variant label"),
				"v".repeat(150)
			);
			await userEvent.click(button("Create Game"));
			answerPending();

			const sent = callsTo("POST", "/games")[0]?.body?.["variant"] as
				string | undefined;
			expect(sent === undefined || sent.length <= 100).toBe(true);
		});

		it.each([
			["a 500", 500, {}, "Failed to create game."],
			["a network error", 0, {}, "Failed to create game."],
			[
				"a 429",
				429,
				{},
				"Rate limit reached. Game was NOT created. Try again in a moment."
			],
			[
				"a 409 unique constraint",
				409,
				{ type: "GAME_UNIQUE_CONSTRAINT" },
				"Another game already uses this title or code. Choose a different title."
			]
		])(
			"shows the error after %s and creates the game once the title is changed",
			async (_label, status, body, message) => {
				await renderCreate();
				failures["POST /games"] = { status, body };
				await userEvent.type(titleInput(), "Hades");
				await userEvent.click(button("Create Game"));
				await untilVisible(() =>
					expect(screen.getByRole("alert")).toHaveTextContent(message)
				);
				expect(button("Create Game")).toBeEnabled();
				expect(created).not.toHaveBeenCalled();

				delete failures["POST /games"];
				await userEvent.type(titleInput(), " II");
				await userEvent.click(button("Create Game"));

				await untilVisible(() =>
					expect(created).toHaveBeenCalledTimes(1)
				);
				expect(screen.queryByRole("alert")).toBeNull();
				expect(callsTo("POST", "/games").at(-1)?.body?.["title"]).toBe(
					"Hades II"
				);
			}
		);

		it("blocks the request and reports an invalid score, then sends once it is fixed", async () => {
			await renderCreate();
			await userEvent.type(titleInput(), "Hades");
			await userEvent.selectOptions(
				screen.getByRole("combobox", { name: "New score source" }),
				"metacritic"
			);
			await userEvent.type(
				screen.getByRole("spinbutton", { name: "New score value" }),
				"150"
			);
			expect(
				screen.getByRole("button", { name: "Add score" })
			).toBeDisabled();
			expect(
				screen.getByText("Score can't be above 100 for metacritic.")
			).toBeInTheDocument();

			await replaceText(
				screen.getByRole("spinbutton", { name: "New score value" }),
				"85"
			);
			await userEvent.click(
				screen.getByRole("button", { name: "Add score" })
			);
			expect(screen.getByLabelText("metacritic score")).toHaveValue(85);
			fireEvent.input(screen.getByLabelText("metacritic score"), {
				target: { value: "-4" }
			});
			await userEvent.click(button("Create Game"));

			expect(screen.getByRole("alert")).toHaveTextContent(
				"Fix the highlighted scores and durations before saving."
			);
			expect(callsTo("POST", "/games")).toEqual([]);

			await replaceText(screen.getByLabelText("metacritic score"), "88");
			await userEvent.click(button("Create Game"));
			await untilVisible(() => expect(created).toHaveBeenCalledTimes(1));
			expect(callsTo("POST", "/games")[0].body?.["scores"]).toEqual([
				{ source: "metacritic", score: 88 }
			]);
			expect(screen.queryByRole("alert")).toBeNull();
		});

		it("adds a duration, removes it and offers its source again", async () => {
			await renderCreate();
			const source = () =>
				screen.getByRole("combobox", { name: "New duration source" });
			await userEvent.selectOptions(source(), "hltb");
			await userEvent.type(
				screen.getByRole("spinbutton", {
					name: "New duration in hours"
				}),
				"12.5"
			);
			await userEvent.click(button("Add duration"));
			expect(screen.getByLabelText("hltb duration")).toHaveValue(12.5);
			expect(
				within(source()).queryByRole("option", { name: "hltb" })
			).toBeNull();

			await userEvent.click(button("Remove hltb duration"));

			expect(screen.queryByLabelText("hltb duration")).toBeNull();
			expect(
				within(source()).getByRole("option", { name: "hltb" })
			).toBeInTheDocument();
		});

		it("ignores a zero duration and keeps Add duration disabled", async () => {
			await renderCreate();
			await userEvent.selectOptions(
				screen.getByRole("combobox", { name: "New duration source" }),
				"rawg"
			);
			await userEvent.type(
				screen.getByRole("spinbutton", {
					name: "New duration in hours"
				}),
				"0"
			);

			expect(button("Add duration")).toBeDisabled();
			expect(
				screen.getByText("Duration must be greater than 0.")
			).toBeInTheDocument();
		});

		it("toggles platforms and genres with the mouse, Space and Enter", async () => {
			await renderCreate();

			await userEvent.click(button("PC"));
			expect(button("PC")).toHaveAttribute("aria-pressed", "true");
			await userEvent.click(button("PC"));
			expect(button("PC")).toHaveAttribute("aria-pressed", "false");

			button("PS5").focus();
			await userEvent.keyboard(" ");
			expect(button("PS5")).toHaveAttribute("aria-pressed", "true");
			button("RPG").focus();
			await userEvent.keyboard("{Enter}");
			expect(button("RPG")).toHaveAttribute("aria-pressed", "true");
			await userEvent.type(titleInput(), "Hades II");
			await userEvent.click(button("Create Game"));

			await untilVisible(() => expect(created).toHaveBeenCalled());
			const body = callsTo("POST", "/games")[0].body;
			expect(body?.["platforms"]).toEqual(["ps5"]);
			expect(body?.["genres"]).toEqual(["rpg"]);
		});
	});

	describe("parent game of a DLC", () => {
		it("hides the parent field until DLC is checked", async () => {
			await renderCreate();

			expect(
				screen.queryByRole("textbox", { name: "Parent game slug" })
			).toBeNull();
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			expect(parentInput()).toBeInTheDocument();
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			expect(
				screen.queryByRole("textbox", { name: "Parent game slug" })
			).toBeNull();
		});

		it("links a parent, sends its id and drops it from the request when DLC is unchecked", async () => {
			await renderCreate();
			await userEvent.type(titleInput(), "Hades DLC");
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.type(parentInput(), "hades");
			await userEvent.click(button("Search"));
			await untilVisible(() =>
				expect(button("Clear parent game")).toBeInTheDocument()
			);
			expect(screen.getByText("Hades")).toBeInTheDocument();

			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.click(button("Create Game"));
			await untilVisible(() => expect(created).toHaveBeenCalledTimes(1));

			const body = callsTo("POST", "/games")[0].body;
			expect(body?.["parentGameId"]).toBeUndefined();
			expect(body?.["isDlc"]).toBe(false);
		});

		it("remembers the linked parent when DLC is unchecked and checked again", async () => {
			await renderCreate();
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.type(parentInput(), "hades{Enter}");
			await untilVisible(() =>
				expect(button("Clear parent game")).toBeInTheDocument()
			);

			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);

			expect(button("Clear parent game")).toBeInTheDocument();
			await userEvent.type(titleInput(), "Hades DLC");
			await userEvent.click(button("Create Game"));
			await untilVisible(() => expect(created).toHaveBeenCalled());
			expect(callsTo("POST", "/games")[0].body?.["parentGameId"]).toBe(
				"g1"
			);
		});

		it("reports an unknown parent, lets the admin retype the slug and clears the error on success", async () => {
			await renderCreate();
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.type(parentInput(), "nope{Enter}");
			await untilVisible(() =>
				expect(screen.getByText("Game not found")).toBeInTheDocument()
			);

			await replaceText(parentInput(), "mass-effect");
			await userEvent.click(button("Search"));

			await untilVisible(() =>
				expect(button("Clear parent game")).toBeInTheDocument()
			);
			expect(screen.queryByText("Game not found")).toBeNull();
		});

		it("clears the parent together with its slug and any old error", async () => {
			await renderCreate();
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.type(parentInput(), "hades{Enter}");
			await untilVisible(() =>
				expect(button("Clear parent game")).toBeInTheDocument()
			);

			await userEvent.click(button("Clear parent game"));

			expect(parentInput()).toHaveValue("");
			expect(button("Search")).toBeDisabled();
			expect(screen.queryByText("Game not found")).toBeNull();
		});

		it("sends one request when Enter is pressed repeatedly in the parent slug field", async () => {
			await renderCreate();
			holds = ["GET /games/hades"];
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.type(parentInput(), "hades{Enter}{Enter}{Enter}");
			answerPending();

			expect(heldKeys("GET /games/hades")).toHaveLength(1);
		});

		it("sends one request when Search is clicked three times", async () => {
			await renderCreate();
			holds = ["GET /games/hades"];
			await userEvent.click(
				screen.getByRole("checkbox", { name: "DLC" })
			);
			await userEvent.type(parentInput(), "hades");

			await userEvent.tripleClick(button("Search"));
			answerPending();

			expect(heldKeys("GET /games/hades")).toHaveLength(1);
			expect(button("...")).toBeDisabled();
		});
	});

	describe("parent of a DLC while editing", () => {
		const dlcWithParent = () =>
			({
				...existingGame,
				isDlc: true,
				parentGame: summary("p1", "Base Game", "base-game")
			}) as unknown as Game;

		const dlcCheckbox = () => screen.getByRole("checkbox", { name: "DLC" });

		async function saveAndGetBody() {
			await userEvent.click(button("Save Changes"));
			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			return callsTo("PATCH", "/games/g1")[0].body!;
		}

		it("saving a DLC with a parent without touching anything sends the same parent", async () => {
			await renderEdit(dlcWithParent());

			const body = await saveAndGetBody();

			expect(body["parentGameId"]).toBe("p1");
			expect(body["isDlc"]).toBe(true);
		});

		it("clearing the parent and saving sends parentGameId null", async () => {
			await renderEdit(dlcWithParent());

			await userEvent.click(button("Clear parent game"));
			const body = await saveAndGetBody();

			expect(body["parentGameId"]).toBeNull();
			expect(body["isDlc"]).toBe(true);
		});

		it("clearing the parent twice in a row still sends a single null", async () => {
			await renderEdit(dlcWithParent());

			await userEvent.dblClick(button("Clear parent game"));
			const body = await saveAndGetBody();

			expect(body["parentGameId"]).toBeNull();
			expect(callsTo("PATCH", "/games/g1")).toHaveLength(1);
		});

		it("clearing and linking another parent sends the new id", async () => {
			parentCatalog["other-base"] = {
				...existingGame,
				id: "g9",
				title: "Other Base",
				code: "other-base"
			} as unknown as Game;
			await renderEdit(dlcWithParent());

			await userEvent.click(button("Clear parent game"));
			await userEvent.type(parentInput(), "other-base{Enter}");
			await untilVisible(() =>
				expect(screen.getByText("Other Base")).toBeInTheDocument()
			);
			const body = await saveAndGetBody();

			expect(body["parentGameId"]).toBe("g9");
		});

		it("clearing, failing to find a new parent and saving still sends null", async () => {
			await renderEdit(dlcWithParent());

			await userEvent.click(button("Clear parent game"));
			await userEvent.type(parentInput(), "nope{Enter}");
			await untilVisible(() =>
				expect(screen.getByText("Game not found")).toBeInTheDocument()
			);
			const body = await saveAndGetBody();

			expect(body["parentGameId"]).toBeNull();
		});

		it("a game that is not a DLC and has no parent never sends parentGameId", async () => {
			await renderEdit();

			const body = await saveAndGetBody();

			expect(body).not.toHaveProperty("parentGameId");
			expect(body["isDlc"]).toBe(false);
		});

		it("a DLC without parent that was never linked does not send parentGameId", async () => {
			await renderEdit({ ...existingGame, isDlc: true } as Game);

			const body = await saveAndGetBody();

			expect(body).not.toHaveProperty("parentGameId");
			expect(body["isDlc"]).toBe(true);
		});

		it("unchecking DLC sends isDlc false and no parentGameId so the server clears the parent", async () => {
			await renderEdit(dlcWithParent());

			await userEvent.click(dlcCheckbox());
			const body = await saveAndGetBody();

			expect(body["isDlc"]).toBe(false);
			expect(body).not.toHaveProperty("parentGameId");
		});

		it("clearing the parent and then unchecking DLC sends no parentGameId", async () => {
			await renderEdit(dlcWithParent());

			await userEvent.click(button("Clear parent game"));
			await userEvent.click(dlcCheckbox());
			const body = await saveAndGetBody();

			expect(body["isDlc"]).toBe(false);
			expect(body).not.toHaveProperty("parentGameId");
		});

		it("refuses the game's own slug as its parent and does not link it, even with Enter repeated", async () => {
			await renderEdit({ ...existingGame, isDlc: true } as Game);

			await userEvent.type(parentInput(), "hades{Enter}{Enter}{Enter}");
			await untilVisible(() =>
				expect(
					screen.getByText("A game can't be its own parent.")
				).toBeInTheDocument()
			);

			expect(
				screen.queryByRole("button", { name: "Clear parent game" })
			).toBeNull();
			const body = await saveAndGetBody();
			expect(body).not.toHaveProperty("parentGameId");
		});

		it("refuses the game's own slug even when it replaces the current parent", async () => {
			await renderEdit(dlcWithParent());

			await userEvent.click(button("Clear parent game"));
			await userEvent.type(parentInput(), "hades");
			await userEvent.click(button("Search"));
			await untilVisible(() =>
				expect(
					screen.getByText("A game can't be its own parent.")
				).toBeInTheDocument()
			);
			const body = await saveAndGetBody();

			expect(body["parentGameId"]).toBeNull();
		});

		it("after the own-parent error a valid slug links normally and clears the error", async () => {
			await renderEdit({ ...existingGame, isDlc: true } as Game);
			await userEvent.type(parentInput(), "hades{Enter}");
			await untilVisible(() =>
				expect(
					screen.getByText("A game can't be its own parent.")
				).toBeInTheDocument()
			);

			await replaceText(parentInput(), "mass-effect");
			await userEvent.click(button("Search"));
			await untilVisible(() =>
				expect(button("Clear parent game")).toBeInTheDocument()
			);

			expect(
				screen.queryByText("A game can't be its own parent.")
			).toBeNull();
			const body = await saveAndGetBody();
			expect(body["parentGameId"]).toBe(catalog[0].id);
		});
	});

	describe("editing a game", () => {
		it("shows the parent of a DLC that is being edited and keeps it when saving", async () => {
			await renderEdit({
				...existingGame,
				isDlc: true,
				parentGame: summary("p1", "Base Game", "base-game")
			} as unknown as Game);

			expect(screen.getByText("Base Game")).toBeInTheDocument();
			expect(button("Clear parent game")).toBeInTheDocument();
			await userEvent.click(button("Save Changes"));

			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(
				callsTo("PATCH", "/games/g1")[0].body?.["parentGameId"]
			).toBe("p1");
		});

		it("loads the game into the form", async () => {
			await renderEdit();

			expect(
				screen.getByRole("heading", { name: "Edit game" })
			).toBeInTheDocument();
			expect(titleInput()).toHaveValue("Hades");
			expect(screen.getByLabelText("Description")).toHaveValue(
				"Escape the underworld"
			);
			expect(screen.getByLabelText("metacritic score")).toHaveValue(90);
			expect(screen.getByLabelText("hltb duration")).toHaveValue(20);
			expect(button("Save Changes")).toBeEnabled();
		});

		it("sends one PATCH when Save Changes is clicked three times and does not touch unchanged scores", async () => {
			await renderEdit();
			holds = ["PATCH /games/g1"];

			await userEvent.tripleClick(button("Save Changes"));
			answerPending();
			expect(heldKeys("PATCH /games/g1")).toHaveLength(1);
			expect(button("Saving...")).toBeDisabled();
			expect(button("Split game")).toBeDisabled();
			expect(button("Mark as compilation")).toBeDisabled();

			releaseAll();
			await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(callsTo("PATCH", "/games/g1")).toHaveLength(1);
			expect(callsTo("PUT", "/games/g1/scores")).toEqual([]);
			expect(callsTo("PUT", "/games/g1/times")).toEqual([]);
		});

		it("replaces scores and times once each when both changed", async () => {
			await renderEdit();

			await replaceText(screen.getByLabelText("metacritic score"), "75");
			await replaceText(screen.getByLabelText("hltb duration"), "30");
			await userEvent.tripleClick(button("Save Changes"));

			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(callsTo("PUT", "/games/g1/scores")).toHaveLength(1);
			expect(callsTo("PUT", "/games/g1/scores")[0].body).toEqual({
				scores: [{ source: "metacritic", score: 75 }]
			});
			expect(callsTo("PUT", "/games/g1/times")[0].body).toEqual({
				times: [{ source: "hltb", duration: 30 }]
			});
		});

		it("does not resend scores when the admin changes a value and puts it back", async () => {
			await renderEdit();

			await replaceText(screen.getByLabelText("metacritic score"), "75");
			await replaceText(screen.getByLabelText("metacritic score"), "90");
			await userEvent.click(button("Save Changes"));

			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(callsTo("PUT", "/games/g1/scores")).toEqual([]);
		});

		it("removes a score and sends an empty list", async () => {
			await renderEdit();

			await userEvent.click(button("Remove metacritic score"));
			await userEvent.click(button("Remove hltb duration"));
			await userEvent.click(button("Save Changes"));

			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(callsTo("PUT", "/games/g1/scores")[0].body).toEqual({
				scores: []
			});
			expect(callsTo("PUT", "/games/g1/times")[0].body).toEqual({
				times: []
			});
		});

		it("sends the franchise chosen in the picker and null when it is set back to none", async () => {
			await renderEdit();
			const franchise = screen.getByRole("combobox", {
				name: "Franchise"
			});

			await userEvent.selectOptions(franchise, "Mass Effect");
			await userEvent.click(button("Save Changes"));
			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			await userEvent.selectOptions(franchise, "— None —");
			await userEvent.click(button("Save Changes"));
			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(2));

			expect(
				callsTo("PATCH", "/games/g1").map(
					call => call.body?.["franchiseId"]
				)
			).toEqual(["f2", null]);
		});

		it.each([
			["a 500", 500, {}, "Failed to update game."],
			["a network error", 0, {}, "Failed to update game."],
			[
				"a 429",
				429,
				{},
				"Rate limit reached. Changes were NOT saved. Try again in a moment."
			],
			[
				"a 409 unique constraint",
				409,
				{ type: "GAME_UNIQUE_CONSTRAINT" },
				"Another game already uses this title or code. Choose a different title."
			],
			[
				"a 404 game not found",
				404,
				{ type: "GAME_NOT_FOUND" },
				"This game no longer exists or is already inactive. Refresh the page to see its current state."
			],
			[
				"a 422 variant required",
				422,
				{ type: "GAME_VARIANT_REQUIRED" },
				"Another game shares this external id. Set a variant label on both games."
			]
		])(
			"shows the message after %s and saves once the title is changed",
			async (_label, status, body, message) => {
				await renderEdit();
				failures["PATCH /games/g1"] = { status, body };
				await userEvent.click(button("Save Changes"));
				await untilVisible(() =>
					expect(screen.getByRole("alert")).toHaveTextContent(message)
				);
				expect(saved).not.toHaveBeenCalled();

				delete failures["PATCH /games/g1"];
				await userEvent.type(titleInput(), " Remastered");
				await userEvent.click(button("Save Changes"));

				await untilVisible(() =>
					expect(saved).toHaveBeenCalledTimes(1)
				);
				expect(screen.queryByRole("alert")).toBeNull();
				expect(
					callsTo("PATCH", "/games/g1").at(-1)?.body?.["title"]
				).toBe("Hades Remastered");
			}
		);

		it("reports a partial save when scores fail after the game info was saved, and retries both", async () => {
			await renderEdit();
			failures["PUT /games/g1/scores"] = { status: 500 };
			await replaceText(screen.getByLabelText("metacritic score"), "70");
			await userEvent.click(button("Save Changes"));
			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Game updated but some scores/times failed to save."
				)
			);
			expect(saved).not.toHaveBeenCalled();
			expect(button("Save Changes")).toBeEnabled();

			delete failures["PUT /games/g1/scores"];
			await userEvent.click(button("Save Changes"));

			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(callsTo("PUT", "/games/g1/scores")).toHaveLength(2);
		});

		it("explains a rate limit hit by the scores request", async () => {
			await renderEdit();
			failures["PUT /games/g1/times"] = { status: 429 };
			await replaceText(screen.getByLabelText("hltb duration"), "40");

			await userEvent.click(button("Save Changes"));

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Game info saved but scores/times hit the rate limit."
				)
			);
		});

		it("explains a score above the scale reported by the server", async () => {
			await renderEdit();
			failures["PUT /games/g1/scores"] = {
				status: 422,
				body: {
					type: "GAME_SCORE_OUT_OF_RANGE",
					context: { raw: { source: "metacritic", scale: 100 } }
				}
			};
			await replaceText(screen.getByLabelText("metacritic score"), "70");

			await userEvent.click(button("Save Changes"));

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Game info saved, but scores/times were not: The metacritic score must be between 0 and 100."
				)
			);
		});

		it("refuses to save while a value is invalid and saves after it is corrected", async () => {
			await renderEdit();
			await replaceText(screen.getByLabelText("hltb duration"), "0");

			await userEvent.click(button("Save Changes"));
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Fix the highlighted scores and durations before saving."
			);
			expect(callsTo("PATCH", "/games/g1")).toEqual([]);

			await replaceText(screen.getByLabelText("hltb duration"), "8");
			await userEvent.click(button("Save Changes"));

			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(screen.queryByRole("alert")).toBeNull();
		});

		it("offers no structure actions while creating", async () => {
			await renderCreate();

			expect(
				screen.queryByRole("button", { name: "Split game" })
			).toBeNull();
			expect(
				screen.queryByRole("button", { name: "Mark as compilation" })
			).toBeNull();
		});
	});

	describe("split dialog", () => {
		it("opens with the current title and variant in the first row and an empty second row", async () => {
			await renderEdit({ ...existingGame, variant: "Pearl" } as Game);

			const dialog = await openSplit();

			expect(splitTitle(dialog, 1)).toHaveValue("Hades");
			expect(splitLabel(dialog, 0)).toHaveValue("Pearl");
			expect(splitTitle(dialog, 2)).toHaveValue("");
			expect(
				within(dialog).getByRole("button", { name: "Remove variant 1" })
			).toBeDisabled();
		});

		it("rejects empty rows and rows with only spaces without sending anything", async () => {
			await renderEdit();
			const dialog = await openSplit();

			await userEvent.click(splitSubmit(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"All variants need a title and a variant label."
			);

			await fillSplit(dialog, [
				{ title: "Hades", variant: "   " },
				{ title: "   ", variant: "Two" }
			]);
			await userEvent.click(splitSubmit(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"All variants need a title and a variant label."
			);
			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
		});

		it("rejects titles that only differ by case or surrounding spaces", async () => {
			await renderEdit();
			const dialog = await openSplit();

			await fillSplit(dialog, [
				{ title: "Pearl", variant: "A" },
				{ title: "  pEARL ", variant: "B" }
			]);
			await userEvent.click(splitSubmit(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Variant titles must be unique."
			);
			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
		});

		it("rejects variant labels that only differ by case or surrounding spaces, without sending anything", async () => {
			await renderEdit();
			const dialog = await openSplit();

			await fillSplit(dialog, [
				{ title: "Pearl Edition", variant: "Pearl" },
				{ title: "Diamond Edition", variant: "  pEARL " }
			]);
			await userEvent.click(splitSubmit(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Variant labels must be unique."
			);
			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
			expect(splitSubmit(dialog)).toBeEnabled();
		});

		it("clears the repeated-label error as soon as a label or a title is edited", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl Edition", variant: "Pearl" },
				{ title: "Diamond Edition", variant: "pearl" }
			]);
			await userEvent.click(splitSubmit(dialog));
			expect(within(dialog).getByRole("alert")).toBeInTheDocument();

			await userEvent.type(splitLabel(dialog, 1), "x");
			expect(within(dialog).queryByRole("alert")).toBeNull();

			await userEvent.type(splitLabel(dialog, 1), "{Backspace}");
			await userEvent.click(splitSubmit(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Variant labels must be unique."
			);

			await userEvent.type(splitTitle(dialog, 2), "!");
			expect(within(dialog).queryByRole("alert")).toBeNull();
			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
		});

		it("sends nothing on a triple click with repeated labels and a single POST once corrected", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl Edition", variant: "Pearl" },
				{ title: "Diamond Edition", variant: " PEARL" }
			]);
			holds = ["POST /games/g1/split"];

			await userEvent.tripleClick(splitSubmit(dialog));
			answerPending();

			expect(heldKeys("POST /games/g1/split")).toHaveLength(0);
			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Variant labels must be unique."
			);

			await replaceText(splitLabel(dialog, 1), "Diamond");
			await userEvent.tripleClick(splitSubmit(dialog));
			answerPending();

			expect(heldKeys("POST /games/g1/split")).toHaveLength(1);
			releaseAll();
			await waitForDialogGone("Split game into variants");
			expect(callsTo("POST", "/games/g1/split")).toHaveLength(1);
			expect(callsTo("POST", "/games/g1/split")[0].body).toEqual({
				variants: [
					{ title: "Pearl Edition", variant: "Pearl" },
					{ title: "Diamond Edition", variant: "Diamond" }
				]
			});
		});

		it("sends the trimmed variants once, even with three clicks, and closes after emitting the first game", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: " Pearl ", variant: " Pearl " },
				{ title: "Diamond", variant: "Diamond" }
			]);
			holds = ["POST /games/g1/split"];

			await userEvent.tripleClick(splitSubmit(dialog));
			answerPending();

			expect(heldKeys("POST /games/g1/split")).toHaveLength(1);
			releaseAll();
			await waitForDialogGone("Split game into variants");
			expect(callsTo("POST", "/games/g1/split")).toHaveLength(1);
			expect(callsTo("POST", "/games/g1/split")[0].body).toEqual({
				variants: [
					{ title: "Pearl", variant: "Pearl" },
					{ title: "Diamond", variant: "Diamond" }
				]
			});
			expect(split).toHaveBeenCalledTimes(1);
			expect(split.mock.calls[0][0]).toMatchObject({ title: "Pearl" });
		});

		it("cannot be dismissed while the split is in flight", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);
			holds = ["POST /games/g1/split"];
			await userEvent.click(splitSubmit(dialog));
			answerPending();

			expect(
				within(dialog).getByRole("button", { name: "Cancel" })
			).toBeDisabled();
			expect(
				within(dialog).getByRole("button", { name: "Splitting..." })
			).toBeDisabled();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await userEvent.keyboard("{Escape}");
			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Close Split game into variants"
				})
			);
			expect(
				screen.getByRole("dialog", { name: "Split game into variants" })
			).toBeInTheDocument();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove variant 2" })
			);

			releaseAll();
			await waitForDialogGone("Split game into variants");
			expect(callsTo("POST", "/games/g1/split")).toHaveLength(1);
		});

		it.each([
			[
				"a 429",
				429,
				{},
				"Rate limit reached. Split was NOT applied. Try again in a moment."
			],
			[
				"a 409 unique constraint",
				409,
				{ type: "GAME_UNIQUE_CONSTRAINT" },
				"A target title collides with an existing game. Use unique titles."
			],
			[
				"a 422 invalid split",
				422,
				{ type: "GAME_SPLIT_INVALID" },
				"Invalid split request."
			],
			["a 500", 500, {}, "Failed to split the game."],
			["a network error", 0, {}, "Failed to split the game."]
		])(
			"shows the message after %s, keeps the dialog open and allows a corrected retry",
			async (_label, status, body, message) => {
				await renderEdit();
				const dialog = await openSplit();
				await fillSplit(dialog, [
					{ title: "Pearl", variant: "Pearl" },
					{ title: "Diamond", variant: "Diamond" }
				]);
				failures["POST /games/g1/split"] = { status, body };
				await userEvent.click(splitSubmit(dialog));
				await untilVisible(() =>
					expect(within(dialog).getByRole("alert")).toHaveTextContent(
						message
					)
				);
				expect(splitSubmit(dialog)).toBeEnabled();
				expect(split).not.toHaveBeenCalled();

				delete failures["POST /games/g1/split"];
				await replaceText(splitTitle(dialog, 2), "Diamond Edition");
				await userEvent.click(splitSubmit(dialog));

				await waitForDialogGone("Split game into variants");
				expect(split).toHaveBeenCalledTimes(1);
				expect(
					callsTo("POST", "/games/g1/split").at(-1)?.body
				).toMatchObject({
					variants: [{ title: "Pearl" }, { title: "Diamond Edition" }]
				});
			}
		);

		it("does not carry typed rows or an old error into the next time it is opened", async () => {
			await renderEdit();
			let dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "" },
				{ title: "Diamond", variant: "Diamond" }
			]);
			await userEvent.click(splitSubmit(dialog));
			expect(within(dialog).getByRole("alert")).toBeInTheDocument();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Add variant" })
			);
			expect(splitTitle(dialog, 3)).toBeInTheDocument();

			await userEvent.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await waitForDialogGone("Split game into variants");
			dialog = await openSplit();

			expect(within(dialog).queryByRole("alert")).toBeNull();
			expect(splitTitle(dialog, 1)).toHaveValue("Hades");
			expect(splitTitle(dialog, 2)).toHaveValue("");
			expect(splitTitleOrNull(dialog, 3)).toBeNull();
		});

		it("closes with Escape, the close button and the backdrop, and reopens cleanly each time", async () => {
			await renderEdit();

			for (const closer of ["escape", "x", "cancel", "backdrop"]) {
				const dialog = await openSplit();
				if (closer === "escape") await userEvent.keyboard("{Escape}");
				if (closer === "x")
					await userEvent.click(
						within(dialog).getByRole("button", {
							name: "Close Split game into variants"
						})
					);
				if (closer === "cancel")
					await userEvent.click(
						within(dialog).getByRole("button", { name: "Cancel" })
					);
				if (closer === "backdrop") {
					const backdrop = dialog.parentElement!
						.firstElementChild as HTMLElement;
					const openedAt = performance.now();
					const clock = vi
						.spyOn(performance, "now")
						.mockReturnValue(openedAt + 1000);
					await userEvent.pointer([
						{ keys: "[MouseLeft>]", target: backdrop },
						{ keys: "[/MouseLeft]", target: backdrop }
					]);
					clock.mockRestore();
				}
				await waitForDialogGone("Split game into variants");
			}

			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
		});

		it("returns focus to the Split game button after the dialog closes", async () => {
			await renderEdit();
			await openSplit();

			await userEvent.keyboard("{Escape}");
			await waitForDialogGone("Split game into variants");

			await waitFor(() => expect(button("Split game")).toHaveFocus());
		});

		it("adds variants up to 10 and removes them down to 2 keeping what was typed in the others", async () => {
			await renderEdit();
			const dialog = await openSplit();
			const add = () =>
				within(dialog).getByRole("button", { name: "Add variant" });

			for (let i = 0; i < 12; i++) {
				if (add().hasAttribute("disabled")) break;
				await userEvent.click(add());
			}
			expect(splitTitle(dialog, 10)).toBeInTheDocument();
			expect(splitTitleOrNull(dialog, 11)).toBeNull();
			expect(add()).toBeDisabled();

			await replaceText(splitTitle(dialog, 2), "Second");
			await replaceText(splitTitle(dialog, 3), "Third");
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove variant 2" })
			);

			expect(splitTitle(dialog, 2)).toHaveValue("Third");
			expect(splitTitle(dialog, 9)).toBeInTheDocument();
			expect(add()).toBeEnabled();
			for (let i = 0; i < 9; i++)
				await userEvent.click(
					within(dialog).getByRole("button", {
						name: "Remove variant 2"
					})
				);
			expect(splitTitleOrNull(dialog, 3)).toBeNull();
			expect(
				within(dialog).getByRole("button", { name: "Remove variant 2" })
			).toBeDisabled();
		});

		it("shows a slug preview and caps titles at 200 and labels at 100 characters", async () => {
			await renderEdit();
			const dialog = await openSplit();

			await replaceText(splitTitle(dialog, 2), "Mass Effect: 2!");
			expect(
				within(dialog).getByText("mass-effect-2")
			).toBeInTheDocument();
			await pasteInto(splitTitle(dialog, 2), "t".repeat(260));
			await pasteInto(splitLabel(dialog, 1), "v".repeat(160));

			expect(splitTitle(dialog, 2)).toHaveValue("t".repeat(200));
			expect(splitLabel(dialog, 1)).toHaveValue("v".repeat(100));
		});

		it("previews the same slug the server will generate for accented titles", async () => {
			await renderEdit();
			const dialog = await openSplit();

			await replaceText(splitTitle(dialog, 2), "Pokémon Pearl");

			expect(
				within(dialog).getByText("pokemon-pearl")
			).toBeInTheDocument();
		});

		it("closes without emitting when the server answers with no games", async () => {
			await renderEdit();
			splitResponse = [];
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);

			await userEvent.click(splitSubmit(dialog));

			await waitForDialogGone("Split game into variants");
			expect(split).not.toHaveBeenCalled();
		});

		it("can be completed with the keyboard alone", async () => {
			await renderEdit();
			const dialog = await openSplit();
			splitTitle(dialog, 2).focus();
			await userEvent.keyboard("Diamond");
			await userEvent.tab();
			await userEvent.keyboard("Diamond");
			splitLabel(dialog, 0).focus();
			await userEvent.keyboard("Pearl");
			splitSubmit(dialog).focus();
			await userEvent.keyboard("{Enter}");

			await waitForDialogGone("Split game into variants");
			expect(callsTo("POST", "/games/g1/split")[0].body).toEqual({
				variants: [
					{ title: "Hades", variant: "Pearl" },
					{ title: "Diamond", variant: "Diamond" }
				]
			});
		});

		it("works in the mobile bottom-sheet layout", async () => {
			stubViewport(true);
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);

			await userEvent.click(splitSubmit(dialog));

			await waitForDialogGone("Split game into variants");
			expect(split).toHaveBeenCalledTimes(1);
		});

		it("does not submit when Enter is pressed in the variant fields, however many times", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);

			await userEvent.type(splitTitle(dialog, 2), "{Enter}{Enter}");
			await userEvent.type(
				splitLabel(dialog, 1),
				"{Enter}{Enter}{Enter}"
			);
			answerPending();

			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
			expect(
				screen.getByRole("dialog", { name: "Split game into variants" })
			).toBeInTheDocument();
		});

		it("survives adding and removing rows very fast, also while the split is in flight", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);
			const add = () =>
				within(dialog).getByRole("button", { name: "Add variant" });
			await userEvent.tripleClick(add());
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove variant 3" })
			);
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove variant 3" })
			);
			expect(
				within(dialog).getAllByPlaceholderText("Pearl")
			).toHaveLength(3);
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove variant 3" })
			);
			holds = ["POST /games/g1/split"];

			await userEvent.click(splitSubmit(dialog));
			answerPending();
			await userEvent.tripleClick(add());
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove variant 1" })
			);
			releaseAll();

			await waitForDialogGone("Split game into variants");
			expect(callsTo("POST", "/games/g1/split")).toHaveLength(1);
			expect(callsTo("POST", "/games/g1/split")[0].body).toEqual({
				variants: [
					{ title: "Pearl", variant: "Pearl" },
					{ title: "Diamond", variant: "Diamond" }
				]
			});
		});

		it("sends the title typed after deleting it and typing the same text again", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);

			await userEvent.clear(splitTitle(dialog, 2));
			expect(within(dialog).queryByText("diamond")).toBeNull();
			await userEvent.type(splitTitle(dialog, 2), "Diamond");
			expect(within(dialog).getByText("diamond")).toBeInTheDocument();
			await userEvent.click(splitSubmit(dialog));

			await waitForDialogGone("Split game into variants");
			expect(callsTo("POST", "/games/g1/split")).toHaveLength(1);
			expect(callsTo("POST", "/games/g1/split")[0].body).toMatchObject({
				variants: [{ title: "Pearl" }, { title: "Diamond" }]
			});
		});

		it("drops the server error as soon as a title is corrected and resubmits without reopening", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);
			failures["POST /games/g1/split"] = {
				status: 409,
				body: { type: "GAME_UNIQUE_CONSTRAINT" }
			};
			await userEvent.click(splitSubmit(dialog));
			await untilVisible(() =>
				expect(within(dialog).getByRole("alert")).toBeInTheDocument()
			);

			await userEvent.type(splitTitle(dialog, 2), " Edition");
			expect(within(dialog).queryByRole("alert")).toBeNull();
			delete failures["POST /games/g1/split"];
			await userEvent.click(splitSubmit(dialog));

			await waitForDialogGone("Split game into variants");
			expect(callsTo("POST", "/games/g1/split")).toHaveLength(2);
			expect(split).toHaveBeenCalledTimes(1);
		});

		it("keeps the dialog usable and its state intact after a 422 and a second failure", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);
			failures["POST /games/g1/split"] = {
				status: 422,
				body: { type: "GAME_SPLIT_INVALID" }
			};

			await userEvent.click(splitSubmit(dialog));
			await untilVisible(() =>
				expect(within(dialog).getByRole("alert")).toHaveTextContent(
					"Invalid split request."
				)
			);
			await userEvent.click(splitSubmit(dialog));
			await untilVisible(() =>
				expect(callsTo("POST", "/games/g1/split")).toHaveLength(2)
			);

			expect(splitTitle(dialog, 2)).toHaveValue("Diamond");
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Invalid split request."
			);
		});

		it("rejects titles that collapse to the same slug even when they look different", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl!", variant: "A" },
				{ title: "Pearl?", variant: "B" }
			]);

			await userEvent.click(splitSubmit(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Variant titles must be unique."
			);
			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
		});

		it("rejects a title made only of symbols or emoji", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "A" },
				{ title: "💥💥!!", variant: "B" }
			]);

			await userEvent.click(splitSubmit(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Variant titles need letters or numbers to build a slug."
			);
			expect(callsTo("POST", "/games/g1/split")).toEqual([]);
		});

		it("sends accents, emoji and HTML as plain text and flattens pasted line breaks", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);

			await pasteInto(splitTitle(dialog, 1), "<b>x</b> Édition 💥");
			expect(
				within(dialog).getByText("b-x-b-edition")
			).toBeInTheDocument();
			await pasteInto(splitTitle(dialog, 2), "Line one\nLine two");
			await pasteInto(splitLabel(dialog, 1), "<i>y</i>");
			await userEvent.click(splitSubmit(dialog));

			await waitForDialogGone("Split game into variants");
			const variants = (
				callsTo("POST", "/games/g1/split")[0].body as {
					variants: { title: string; variant: string }[];
				}
			).variants;
			expect(variants[0].title).toBe("<b>x</b> Édition 💥");
			expect(variants[1].title).not.toContain("\n");
			expect(variants[1].variant).toBe("<i>y</i>");
			expect(document.body.querySelector("b")).toBeNull();
		});

		it("does not share data between the Split and Compilation dialogs", async () => {
			await renderEdit();
			let splitDialog = await openSplit();
			await replaceText(splitTitle(splitDialog, 2), "Zzz");
			await userEvent.keyboard("{Escape}");
			await waitForDialogGone("Split game into variants");

			let compilationDialog = await openCompilation(
				"Mark as compilation"
			);
			await userEvent.type(searchBox(compilationDialog, 0), "mass");
			await userEvent.keyboard("{Escape}");
			await waitForDialogGone("Mark as compilation");

			splitDialog = await openSplit();
			expect(splitTitle(splitDialog, 2)).toHaveValue("");
			expect(splitTitle(splitDialog, 1)).toHaveValue("Hades");
			expect(within(splitDialog).queryByRole("alert")).toBeNull();
			await userEvent.keyboard("{Escape}");
			await waitForDialogGone("Split game into variants");
			compilationDialog = await openCompilation("Mark as compilation");

			expect(searchBox(compilationDialog, 0)).toHaveValue("");
			expect(
				screen.queryByRole("dialog", {
					name: "Split game into variants"
				})
			).toBeNull();
		});

		it("opens one Split dialog and keeps what was typed when the button behind it is clicked again", async () => {
			await renderEdit();
			const dialog = await openSplit();
			await replaceText(splitTitle(dialog, 2), "Typed");

			await userEvent.tripleClick(button("Split game"));

			expect(
				screen.getAllByRole("dialog", {
					name: "Split game into variants"
				})
			).toHaveLength(1);
			expect(splitTitle(dialog, 2)).toHaveValue("Typed");
		});

		it("splits from an editor rendered in embedded mode", async () => {
			await renderEmbedded();
			const dialog = await openSplit();
			await fillSplit(dialog, [
				{ title: "Pearl", variant: "Pearl" },
				{ title: "Diamond", variant: "Diamond" }
			]);

			await userEvent.click(splitSubmit(dialog));

			await waitForDialogGone("Split game into variants");
			expect(split).toHaveBeenCalledTimes(1);
		});

		describe("on mobile", () => {
			class StubPointerEvent extends MouseEvent {
				pointerId: number;
				constructor(type: string, init?: PointerEventInit) {
					super(type, init);
					this.pointerId = init?.pointerId ?? 1;
				}
			}

			beforeEach(() => {
				stubViewport(true);
				vi.stubGlobal("PointerEvent", StubPointerEvent);
				Element.prototype.setPointerCapture = vi.fn();
			});

			afterEach(() => {
				Reflect.deleteProperty(Element.prototype, "setPointerCapture");
			});

			function swipeDown(dialog: HTMLElement, distance: number) {
				const handle = within(dialog).getByRole("heading", {
					name: "Split game into variants"
				});
				fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
				fireEvent.pointerMove(handle, {
					clientY: 100 + distance,
					pointerId: 1
				});
				fireEvent.pointerUp(handle, {
					clientY: 100 + distance,
					pointerId: 1
				});
			}

			it("closes the dialog by dragging it down and reopens it clean", async () => {
				await renderEdit();
				const dialog = await openSplit();
				await replaceText(splitTitle(dialog, 2), "Typed");

				swipeDown(dialog, 200);

				await waitForDialogGone("Split game into variants");
				const reopened = await openSplit();
				expect(splitTitle(reopened, 2)).toHaveValue("");
			});

			it("ignores a short drag", async () => {
				await renderEdit();
				const dialog = await openSplit();

				swipeDown(dialog, 10);

				expect(
					screen.getByRole("dialog", {
						name: "Split game into variants"
					})
				).toBeInTheDocument();
			});

			it("cannot be dragged away while the split is in flight", async () => {
				await renderEdit();
				const dialog = await openSplit();
				await fillSplit(dialog, [
					{ title: "Pearl", variant: "Pearl" },
					{ title: "Diamond", variant: "Diamond" }
				]);
				holds = ["POST /games/g1/split"];
				await userEvent.click(splitSubmit(dialog));
				answerPending();

				swipeDown(dialog, 300);

				expect(
					screen.getByRole("dialog", {
						name: "Split game into variants"
					})
				).toBeInTheDocument();
				releaseAll();
				await waitForDialogGone("Split game into variants");
				expect(callsTo("POST", "/games/g1/split")).toHaveLength(1);
			});
		});
	});

	describe("compilation dialog", () => {
		it("starts with two empty link rows for a game that is not a compilation and no clear button", async () => {
			await renderEdit();

			const dialog = await openCompilation("Mark as compilation");

			expect(
				within(dialog).getAllByRole("textbox", {
					name: "Search existing game"
				})
			).toHaveLength(2);
			expect(
				within(dialog).queryByRole("button", {
					name: "Clear compilation"
				})
			).toBeNull();
			expect(
				within(dialog).getByRole("button", { name: "Remove item 1" })
			).toBeEnabled();
		});

		it("starts with the linked games of an existing compilation and offers to clear it", async () => {
			await renderEdit(compilationGame);

			const dialog = await openCompilation("Edit compilation");

			expect(within(dialog).getByText("Mass Effect")).toBeInTheDocument();
			expect(
				within(dialog).getByText("Mass Effect 2")
			).toBeInTheDocument();
			expect(
				within(dialog).getAllByRole("button", {
					name: "Clear linked game"
				})
			).toHaveLength(2);
			expect(
				within(dialog).getByRole("button", {
					name: "Clear compilation"
				})
			).toBeInTheDocument();
		});

		it("rejects link rows without a selected game and create rows without a title", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");

			await userEvent.click(compilationSave(dialog));
			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"All linked rows must have a selected game."
			);

			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			);
			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[1]
			);
			await userEvent.type(
				within(dialog).getAllByRole("textbox", {
					name: "Title for the new game"
				})[0],
				"   "
			);
			await userEvent.click(compilationSave(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"All create rows must have a title."
			);
			expect(callsTo("PUT", "/games/g1/compilation-items")).toEqual([]);
		});

		it("does not search for one character or whitespace and searches trimmed text from two characters", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");

			await userEvent.type(searchBox(dialog, 0), "m");
			await userEvent.clear(searchBox(dialog, 0));
			await userEvent.type(searchBox(dialog, 0), "      ");
			answerPending();
			expect(searchCalls()).toEqual([]);

			await userEvent.clear(searchBox(dialog, 0));
			await userEvent.type(searchBox(dialog, 0), " ma ");
			await untilVisible(() =>
				expect(searchCalls().length).toBeGreaterThan(0)
			);

			expect(searchCalls().at(-1)?.path).toBe(
				"/games/search?query=ma&local_only=true"
			);
		});

		it("shows at most eight results and picking one links the game", async () => {
			searchLimit = 12;
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await userEvent.type(searchBox(dialog, 0), "ma");
			await untilVisible(() =>
				expect(
					within(dialog).getByRole("button", {
						name: resultName("Mass Effect", "mass-effect")
					})
				).toBeInTheDocument()
			);

			await userEvent.click(
				within(dialog).getByRole("button", {
					name: resultName("Mass Effect", "mass-effect")
				})
			);

			expect(within(dialog).getByText("mass-effect")).toBeInTheDocument();
			expect(
				within(dialog).getByRole("button", {
					name: "Clear linked game"
				})
			).toBeInTheDocument();
			expect(
				within(dialog).queryByRole("button", {
					name: resultName("Mario Kart", "mario-kart")
				})
			).toBeNull();
		});

		it("returns to an empty search box after clearing a linked game", async () => {
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");

			await userEvent.click(
				within(dialog).getAllByRole("button", {
					name: "Clear linked game"
				})[0]
			);

			expect(searchBox(dialog, 0)).toHaveValue("");
			expect(within(dialog).queryByText("Mass Effect")).toBeNull();
		});

		it("clears the results when the search text is erased or gets shorter than two characters", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await userEvent.type(searchBox(dialog, 0), "mass");
			await untilVisible(() =>
				expect(
					within(dialog).getByRole("button", {
						name: resultName("Mass Effect", "mass-effect")
					})
				).toBeInTheDocument()
			);

			await userEvent.type(
				searchBox(dialog, 0),
				"{Backspace}{Backspace}{Backspace}"
			);

			expect(
				within(dialog).queryByRole("button", {
					name: resultName("Mass Effect", "mass-effect")
				})
			).toBeNull();
			expect(within(dialog).queryByText("Searching...")).toBeNull();
		});

		it("keeps the results of the latest text when an older search answers after a newer one", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			holds = ["GET /games/search"];

			await userEvent.type(searchBox(dialog, 0), "mass");
			answerPending();
			releaseHeld("GET /games/search?query=mass&local_only=true");
			await untilVisible(() =>
				expect(
					within(dialog).getByRole("button", {
						name: resultName("Mass Effect", "mass-effect")
					})
				).toBeInTheDocument()
			);
			releaseHeld("GET /games/search?query=ma&local_only=true");
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(
				within(dialog).queryByRole("button", {
					name: resultName("Mario Kart", "mario-kart")
				})
			).toBeNull();
		});

		it("does not show a late search answer under a different row after a row above it was removed", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			holds = ["GET /games/search"];

			await userEvent.type(searchBox(dialog, 0), "ma");
			answerPending();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove item 1" })
			);
			releaseAll();
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(
				within(dialog).queryByRole("button", {
					name: resultName("Mass Effect", "mass-effect")
				})
			).toBeNull();
		});

		it("cancels the search of the previous keystroke so only the latest text is answered", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");

			await userEvent.type(searchBox(dialog, 0), "mass");
			answerPending();

			expect(searchCalls().map(call => call.path)).toEqual([
				"/games/search?query=mass&local_only=true"
			]);
		});

		it("shows nothing and does not break when a search fails or has no results", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			failures["GET /games/search?query=zz&local_only=true"] = {
				status: 500
			};
			await userEvent.type(searchBox(dialog, 0), "zz");
			await untilVisible(() => expect(searchCalls()).toHaveLength(1));

			await userEvent.clear(searchBox(dialog, 0));
			await userEvent.type(searchBox(dialog, 0), "qq");
			await untilVisible(() => expect(searchCalls()).toHaveLength(2));

			expect(within(dialog).queryByText("Searching...")).toBeNull();
			expect(within(dialog).queryByRole("alert")).toBeNull();
		});

		it("handles pasted, unicode and uppercase search text", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");

			await pasteInto(searchBox(dialog, 0), "MASS ünï 💥");
			await untilVisible(() => expect(searchCalls()).toHaveLength(1));

			expect(searchCalls()[0].path).toBe(
				`/games/search?query=${encodeURIComponent("MASS ünï 💥")}&local_only=true`
			);
		});

		it("resets a row when its mode is switched back and forth", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");
			expect(within(dialog).getByText("mass-effect")).toBeInTheDocument();

			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			);
			await userEvent.type(
				within(dialog).getByRole("textbox", {
					name: "Title for the new game"
				}),
				"Legendary Edition"
			);
			expect(
				within(dialog).getByText("legendary-edition")
			).toBeInTheDocument();
			await userEvent.click(
				within(dialog).getAllByRole("button", {
					name: "Link existing"
				})[0]
			);

			expect(searchBox(dialog, 0)).toHaveValue("");
			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			);
			expect(
				within(dialog).getByRole("textbox", {
					name: "Title for the new game"
				})
			).toHaveValue("");
		});

		it("rejects the same game linked twice", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");
			await pickLinked(dialog, "mass", "Mass Effect");

			await userEvent.click(compilationSave(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Linked games must be unique."
			);
			expect(callsTo("PUT", "/games/g1/compilation-items")).toEqual([]);
		});

		it("rejects created titles that collapse to the same slug", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			);
			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[1]
			);
			const titles = within(dialog).getAllByRole("textbox", {
				name: "Title for the new game"
			});
			await userEvent.type(titles[0], "Mass Effect");
			await userEvent.type(titles[1], "mass  effect!");

			await userEvent.click(compilationSave(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Created titles must produce unique slugs."
			);
		});

		it("rejects a created title made only of symbols or emoji that has no slug", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			);
			await pasteInto(
				within(dialog).getByRole("textbox", {
					name: "Title for the new game"
				}),
				"💥💥"
			);
			await pickLinked(dialog, "mass", "Mass Effect");

			await userEvent.click(compilationSave(dialog));
			answerPending();

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"Created titles need letters or numbers to build a slug."
			);
			expect(callsTo("PUT", "/games/g1/compilation-items")).toEqual([]);
		});

		it("sends mixed linked and created items once with three clicks and closes with a saved event", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");
			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[1]
			);
			await userEvent.type(
				within(dialog).getByRole("textbox", {
					name: "Title for the new game"
				}),
				"  Legendary Edition  "
			);
			holds = ["PUT /games/g1/compilation-items"];

			await userEvent.tripleClick(compilationSave(dialog));
			answerPending();
			expect(heldKeys("PUT /games/g1/compilation-items")).toHaveLength(1);
			releaseAll();

			await waitForDialogGone("Mark as compilation");
			expect(saved).toHaveBeenCalledTimes(1);
			expect(callsTo("PUT", "/games/g1/compilation-items")).toHaveLength(
				1
			);
			expect(
				callsTo("PUT", "/games/g1/compilation-items")[0].body
			).toEqual({
				items: [
					{ mode: "link", gameId: "m1" },
					{ mode: "create", title: "Legendary Edition" }
				]
			});
		});

		it("cannot be dismissed or edited into a second request while saving", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");
			await pickLinked(dialog, "mario", "Mario Kart");
			holds = ["PUT /games/g1/compilation-items"];
			await userEvent.click(compilationSave(dialog));
			answerPending();

			expect(
				within(dialog).getByRole("button", { name: "Cancel" })
			).toBeDisabled();
			expect(
				within(dialog).getByRole("button", { name: "Saving..." })
			).toBeDisabled();
			await userEvent.keyboard("{Escape}");
			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Close Mark as compilation"
				})
			);
			expect(
				screen.getByRole("dialog", { name: "Mark as compilation" })
			).toBeInTheDocument();

			releaseAll();
			await waitForDialogGone("Mark as compilation");
			expect(callsTo("PUT", "/games/g1/compilation-items")).toHaveLength(
				1
			);
		});

		it.each([
			[
				"a 429",
				429,
				{},
				"Rate limit reached. Compilation was NOT saved. Try again in a moment."
			],
			[
				"a 409 unique constraint",
				409,
				{ type: "GAME_UNIQUE_CONSTRAINT" },
				"A new title collides with an existing game code."
			],
			[
				"a 422 invalid compilation",
				422,
				{ type: "GAME_COMPILATION_INVALID" },
				"Invalid compilation: duplicates or self-reference."
			],
			[
				"a 404 game not found",
				404,
				{ type: "GAME_NOT_FOUND" },
				"Parent or a linked game not found."
			],
			["a 500", 500, {}, "Failed to save compilation."],
			["a network error", 0, {}, "Failed to save compilation."]
		])(
			"shows the message after %s, keeps the rows and saves on retry",
			async (_label, status, body, message) => {
				await renderEdit();
				const dialog = await openCompilation("Mark as compilation");
				await pickLinked(dialog, "mass", "Mass Effect");
				await pickLinked(dialog, "mario", "Mario Kart");
				failures["PUT /games/g1/compilation-items"] = { status, body };
				await userEvent.click(compilationSave(dialog));
				await untilVisible(() =>
					expect(within(dialog).getByRole("alert")).toHaveTextContent(
						message
					)
				);
				expect(
					within(dialog).getByText("mass-effect")
				).toBeInTheDocument();
				expect(saved).not.toHaveBeenCalled();

				delete failures["PUT /games/g1/compilation-items"];
				await userEvent.click(compilationSave(dialog));

				await waitForDialogGone("Mark as compilation");
				expect(saved).toHaveBeenCalledTimes(1);
			}
		);

		it("does not carry rows or errors into the next time the dialog is opened", async () => {
			await renderEdit();
			let dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");
			await userEvent.click(compilationSave(dialog));
			expect(within(dialog).getByRole("alert")).toBeInTheDocument();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Add item" })
			);
			expect(
				within(dialog).getByRole("button", { name: "Remove item 3" })
			).toBeInTheDocument();

			await userEvent.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await waitForDialogGone("Mark as compilation");
			dialog = await openCompilation("Mark as compilation");

			expect(within(dialog).queryByRole("alert")).toBeNull();
			expect(within(dialog).queryByText("mass-effect")).toBeNull();
			expect(
				within(dialog).queryByRole("button", { name: "Remove item 3" })
			).toBeNull();
		});

		it("clears the validation error once the rows are corrected", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await userEvent.click(compilationSave(dialog));
			expect(within(dialog).getByRole("alert")).toBeInTheDocument();

			await pickLinked(dialog, "mass", "Mass Effect");
			await pickLinked(dialog, "mario", "Mario Kart");

			expect(within(dialog).queryByRole("alert")).toBeNull();
		});

		it("adds rows up to 50 and removes them down to one", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			const add = () =>
				within(dialog).getByRole("button", { name: "Add item" });

			for (let i = 0; i < 50; i++) {
				if (add().hasAttribute("disabled")) break;
				await userEvent.click(add());
			}
			expect(
				within(dialog).getAllByRole("textbox", {
					name: "Search existing game"
				})
			).toHaveLength(50);
			expect(add()).toBeDisabled();

			for (let i = 0; i < 49; i++)
				await userEvent.click(
					within(dialog).getByRole("button", {
						name: "Remove item 1"
					})
				);

			expect(
				within(dialog).getByRole("button", { name: "Remove item 1" })
			).toBeDisabled();
			expect(add()).toBeEnabled();
		}, 30000);

		it("removes a middle row and keeps the others in order", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Add item" })
			);
			await pickLinked(dialog, "mass", "Mass Effect");
			await pickLinked(dialog, "mario", "Mario Kart");
			await pickLinked(dialog, "madd", "Madden");

			await userEvent.click(
				within(dialog).getByRole("button", { name: "Remove item 2" })
			);

			expect(within(dialog).getByText("mass-effect")).toBeInTheDocument();
			expect(within(dialog).getByText("madden")).toBeInTheDocument();
			expect(within(dialog).queryByText("mario-kart")).toBeNull();
		});

		it("clears a compilation with one DELETE even when the button is clicked three times", async () => {
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");
			holds = ["DELETE /games/g1/compilation-items"];

			await userEvent.tripleClick(
				within(dialog).getByRole("button", {
					name: "Clear compilation"
				})
			);
			answerPending();

			expect(heldKeys("DELETE /games/g1/compilation-items")).toHaveLength(
				1
			);
			expect(
				within(dialog).getByRole("button", { name: "Clearing..." })
			).toBeDisabled();
			expect(
				within(dialog).getByRole("button", { name: "Cancel" })
			).toBeDisabled();
			expect(compilationSave(dialog)).toBeDisabled();
			releaseAll();
			await waitForDialogGone("Edit compilation");
			expect(saved).toHaveBeenCalledTimes(1);
			expect(
				callsTo("DELETE", "/games/g1/compilation-items")
			).toHaveLength(1);
		});

		it("keeps the dialog open with an error when clearing fails and works on retry", async () => {
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");
			failures["DELETE /games/g1/compilation-items"] = { status: 500 };
			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Clear compilation"
				})
			);
			await untilVisible(() =>
				expect(within(dialog).getByRole("alert")).toHaveTextContent(
					"Failed to clear compilation."
				)
			);
			expect(saved).not.toHaveBeenCalled();

			delete failures["DELETE /games/g1/compilation-items"];
			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Clear compilation"
				})
			);

			await waitForDialogGone("Edit compilation");
			expect(saved).toHaveBeenCalledTimes(1);
		});

		it("saves an edited compilation with the existing links unchanged", async () => {
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");

			await userEvent.click(compilationSave(dialog));

			await waitForDialogGone("Edit compilation");
			expect(
				callsTo("PUT", "/games/g1/compilation-items")[0].body
			).toEqual({
				items: [
					{ mode: "link", gameId: "m1" },
					{ mode: "link", gameId: "m4" }
				]
			});
		});

		it("exposes accessible names for the row controls and works with Space on the mode toggle", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");

			const create = within(dialog).getAllByRole("button", {
				name: "Create new"
			})[0];
			expect(create).toHaveAttribute("aria-pressed", "false");
			create.focus();
			await userEvent.keyboard(" ");

			expect(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			).toHaveAttribute("aria-pressed", "true");
			expect(
				within(dialog).getByRole("button", { name: "Remove item 1" })
			).toBeInTheDocument();
			expect(
				within(dialog).getByRole("button", {
					name: "Close Mark as compilation"
				})
			).toBeInTheDocument();
		});

		it("closes with Escape and returns focus to the compilation button", async () => {
			await renderEdit();
			await openCompilation("Mark as compilation");

			await userEvent.keyboard("{Escape}");
			await waitForDialogGone("Mark as compilation");

			await waitFor(() =>
				expect(button("Mark as compilation")).toHaveFocus()
			);
		});

		it("works in the mobile bottom-sheet layout", async () => {
			stubViewport(true);
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");

			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Clear compilation"
				})
			);

			await waitForDialogGone("Edit compilation");
			expect(saved).toHaveBeenCalledTimes(1);
		});

		it("does not offer the game being edited in the search results", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");

			await userEvent.type(searchBox(dialog, 0), "had");
			await untilVisible(() =>
				expect(searchCalls().length).toBeGreaterThan(0)
			);
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(
				within(dialog).queryByRole("button", {
					name: resultName("Hades", "hades")
				})
			).toBeNull();
		});

		it("refuses to save a compilation that contains itself", async () => {
			await renderEdit({
				...compilationGame,
				compilationItems: [
					{
						id: "c1",
						position: 1,
						game: summary("g1", "Hades", "hades")
					},
					{
						id: "c2",
						position: 2,
						game: summary("m1", "Mass Effect", "mass-effect")
					}
				]
			} as unknown as Game);
			const dialog = await openCompilation("Edit compilation");

			await userEvent.click(compilationSave(dialog));

			expect(within(dialog).getByRole("alert")).toHaveTextContent(
				"A compilation can't contain itself."
			);
			expect(callsTo("PUT", "/games/g1/compilation-items")).toEqual([]);
		});

		it("links a game that already belongs to another compilation and lets the server decide", async () => {
			searchLimit = 8;
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");
			await pickLinked(dialog, "mario", "Mario Kart");

			await userEvent.click(compilationSave(dialog));

			await waitForDialogGone("Mark as compilation");
			expect(
				callsTo("PUT", "/games/g1/compilation-items")[0].body
			).toEqual({
				items: [
					{ mode: "link", gameId: "m1" },
					{ mode: "link", gameId: "m2" }
				]
			});
		});

		it("replaces a picked game by clearing it and searching again", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");
			expect(
				within(dialog).getAllByRole("textbox", {
					name: "Search existing game"
				})
			).toHaveLength(1);

			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Clear linked game"
				})
			);
			await pickLinked(dialog, "mario", "Mario Kart");
			await pickLinked(dialog, "madd", "Madden");
			await userEvent.click(compilationSave(dialog));

			await waitForDialogGone("Mark as compilation");
			expect(
				callsTo("PUT", "/games/g1/compilation-items")[0].body
			).toEqual({
				items: [
					{ mode: "link", gameId: "m2" },
					{ mode: "link", gameId: "m3" }
				]
			});
		});

		it("drops a pending search when the row switches mode and back", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			holds = ["GET /games/search"];
			await userEvent.type(searchBox(dialog, 0), "ma");
			answerPending();

			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			);
			await userEvent.click(
				within(dialog).getAllByRole("button", {
					name: "Link existing"
				})[0]
			);
			releaseAll();
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(within(dialog).queryByText("Searching...")).toBeNull();
			expect(
				within(dialog).queryByRole("button", {
					name: resultName("Mass Effect", "mass-effect")
				})
			).toBeNull();
		});

		it("keeps the results of each row apart when two rows are typed at the same time", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			holds = ["GET /games/search"];

			await userEvent.type(searchBox(dialog, 0), "ma");
			await userEvent.type(searchBox(dialog, 1), "mar");
			answerPending();
			releaseHeld("GET /games/search?query=mar&local_only=true");
			releaseHeld("GET /games/search?query=ma&local_only=true");
			const firstRow = searchBox(dialog, 0).parentElement as HTMLElement;
			const secondRow = searchBox(dialog, 1).parentElement as HTMLElement;
			await waitFor(() =>
				expect(
					within(firstRow).getByRole("button", {
						name: resultName("Mass Effect", "mass-effect")
					})
				).toBeInTheDocument()
			);

			expect(
				within(secondRow).getByRole("button", {
					name: resultName("Mario Kart", "mario-kart")
				})
			).toBeInTheDocument();
			expect(
				within(secondRow).queryByRole("button", {
					name: resultName("Mass Effect", "mass-effect")
				})
			).toBeNull();
		});

		it("flattens 50 pasted titles into a single title capped at 200 characters", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await userEvent.click(
				within(dialog).getAllByRole("button", { name: "Create new" })[0]
			);
			const pasted = Array.from(
				{ length: 50 },
				(_, i) => `Title ${i}`
			).join("\n");

			await pasteInto(
				within(dialog).getByRole("textbox", {
					name: "Title for the new game"
				}),
				pasted
			);

			const value = (
				within(dialog).getByRole("textbox", {
					name: "Title for the new game"
				}) as HTMLInputElement
			).value;
			expect(value.length).toBeLessThanOrEqual(200);
			expect(value).not.toContain("\n");
		});

		it("keeps the original rows after a failed Clear compilation and Cancel", async () => {
			await renderEdit(compilationGame);
			let dialog = await openCompilation("Edit compilation");
			failures["DELETE /games/g1/compilation-items"] = { status: 500 };
			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Clear compilation"
				})
			);
			await untilVisible(() =>
				expect(within(dialog).getByRole("alert")).toBeInTheDocument()
			);

			await userEvent.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);
			await waitForDialogGone("Edit compilation");
			dialog = await openCompilation("Edit compilation");

			expect(within(dialog).queryByRole("alert")).toBeNull();
			expect(
				within(dialog).getByText("Mass Effect 2")
			).toBeInTheDocument();
			expect(saved).not.toHaveBeenCalled();
		});

		it("cannot clear the compilation while a save is in flight", async () => {
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");
			holds = ["PUT /games/g1/compilation-items"];
			await userEvent.click(compilationSave(dialog));
			answerPending();

			const clear = within(dialog).getByRole("button", {
				name: "Clear compilation"
			});
			expect(clear).toBeDisabled();
			await userEvent.click(clear);
			releaseAll();

			await waitForDialogGone("Edit compilation");
			expect(callsTo("DELETE", "/games/g1/compilation-items")).toEqual(
				[]
			);
			expect(callsTo("PUT", "/games/g1/compilation-items")).toHaveLength(
				1
			);
		});

		it("cannot save while a clear is in flight", async () => {
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");
			holds = ["DELETE /games/g1/compilation-items"];
			await userEvent.click(
				within(dialog).getByRole("button", {
					name: "Clear compilation"
				})
			);
			answerPending();

			expect(compilationSave(dialog)).toBeDisabled();
			await userEvent.click(compilationSave(dialog));
			releaseAll();

			await waitForDialogGone("Edit compilation");
			expect(callsTo("PUT", "/games/g1/compilation-items")).toEqual([]);
			expect(
				callsTo("DELETE", "/games/g1/compilation-items")
			).toHaveLength(1);
		});

		it("ignores a search answer that arrives after Escape closed the dialog and starts clean when reopened", async () => {
			await renderEdit();
			let dialog = await openCompilation("Mark as compilation");
			holds = ["GET /games/search"];
			await userEvent.type(searchBox(dialog, 0), "mass");
			answerPending();

			await userEvent.keyboard("{Escape}");
			await waitForDialogGone("Mark as compilation");
			releaseAll();
			dialog = await openCompilation("Mark as compilation");
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(searchBox(dialog, 0)).toHaveValue("");
			expect(within(dialog).queryByText("Searching...")).toBeNull();
			expect(
				within(dialog).queryByRole("button", {
					name: resultName("Mass Effect", "mass-effect")
				})
			).toBeNull();
		});

		it("does not submit when Enter is pressed in the search field", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");

			await userEvent.type(searchBox(dialog, 0), "mass{Enter}{Enter}");
			answerPending();

			expect(callsTo("PUT", "/games/g1/compilation-items")).toEqual([]);
			expect(
				screen.getByRole("dialog", { name: "Mark as compilation" })
			).toBeInTheDocument();
		});

		it("opens a single Compilation dialog when its button is clicked repeatedly and keeps what was typed", async () => {
			await renderEdit();
			const dialog = await openCompilation("Mark as compilation");
			await pickLinked(dialog, "mass", "Mass Effect");

			await userEvent.tripleClick(button("Mark as compilation"));

			expect(
				screen.getAllByRole("dialog", { name: "Mark as compilation" })
			).toHaveLength(1);
			expect(within(dialog).getByText("mass-effect")).toBeInTheDocument();
		});

		it("saves an existing compilation twice without changes, sending the same items", async () => {
			await renderEdit(compilationGame);
			let dialog = await openCompilation("Edit compilation");
			await userEvent.click(compilationSave(dialog));
			await waitForDialogGone("Edit compilation");
			dialog = await openCompilation("Edit compilation");

			await userEvent.click(compilationSave(dialog));

			await waitForDialogGone("Edit compilation");
			const bodies = callsTo("PUT", "/games/g1/compilation-items").map(
				call => call.body
			);
			expect(bodies).toHaveLength(2);
			expect(bodies[1]).toEqual(bodies[0]);
			expect(saved).toHaveBeenCalledTimes(2);
		});

		it("keeps the rows and says a linked game is missing when the server answers 404", async () => {
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");
			failures["PUT /games/g1/compilation-items"] = {
				status: 404,
				body: { type: "GAME_NOT_FOUND" }
			};

			await userEvent.click(compilationSave(dialog));
			await untilVisible(() =>
				expect(within(dialog).getByRole("alert")).toHaveTextContent(
					"Parent or a linked game not found."
				)
			);

			expect(
				within(dialog).getByText("Mass Effect 2")
			).toBeInTheDocument();
			expect(compilationSave(dialog)).toBeEnabled();
			expect(saved).not.toHaveBeenCalled();
		});

		it("closes normally when the server answers with the items in another order", async () => {
			compilationItemsResponse = [
				{ id: "c2", position: 1, childGameId: "m4", childGame: null },
				{ id: "c1", position: 2, childGameId: "m1", childGame: null }
			];
			await renderEdit(compilationGame);
			const dialog = await openCompilation("Edit compilation");

			await userEvent.click(compilationSave(dialog));

			await waitForDialogGone("Edit compilation");
			expect(saved).toHaveBeenCalledTimes(1);
		});
	});
});
