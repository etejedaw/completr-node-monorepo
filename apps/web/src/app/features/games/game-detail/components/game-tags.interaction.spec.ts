import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../../environments/environment";
import { ToastService } from "../../../../core/services/toast";
import { type CommunityTag } from "../../../mood-tags/mood-tags.model";
import { GameTags } from "./game-tags";

const api = environment.apiUrl;

const POPULAR = [
	{ tag: "co-op", games: 12, players: 30 },
	{ tag: "relaxing", games: 8, players: 20 },
	{ tag: "chill", games: 3, players: 6 }
];

describe("GameTags interaction", () => {
	let httpTesting: HttpTestingController;
	let fixture: ComponentFixture<GameTags>;
	let communityByGame: Record<string, CommunityTag[]>;
	let mineByGame: Record<string, string[]>;
	let putBodies: { gameId: string; tags: string[] }[];
	let heldPuts: TestRequest[];
	let holdPuts: boolean;
	let failNextPut: number | null;
	let searches: string[];
	let toast: {
		error: ReturnType<typeof vi.fn<(message: string) => void>>;
		success: ReturnType<typeof vi.fn<(message: string) => void>>;
	};

	function answerPut(req: TestRequest) {
		const gameId = req.request.url.split("/").at(-2) ?? "";
		const tags = req.request.body.tags as string[];
		if (failNextPut !== null) {
			const status = failNextPut;
			failNextPut = null;
			return req.flush(
				{ title: "Nope" },
				{ status, statusText: "Error" }
			);
		}
		mineByGame[gameId] = tags;
		req.flush({ data: { tags } });
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		const communityMatch = url.match(/\/games\/([^/]+)\/tags$/);
		if (method === "GET" && communityMatch)
			return req.flush({
				data: { tags: communityByGame[communityMatch[1]] ?? [] }
			});
		const putMatch = url.match(/\/users\/me\/games\/([^/]+)\/mood-tags$/);
		if (method === "PUT" && putMatch) {
			putBodies.push({
				gameId: putMatch[1],
				tags: [...req.request.body.tags]
			});
			if (holdPuts) {
				heldPuts.push(req);
				return;
			}
			return answerPut(req);
		}
		if (url === `${api}/tags/popular`)
			return req.flush({ data: { tags: POPULAR } });
		if (url === `${api}/tags/search`) {
			const search = req.request.params.get("search") ?? "";
			searches.push(search);
			return req.flush({
				data: {
					tags: POPULAR.filter(item => item.tag.includes(search))
				}
			});
		}
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled && !heldPuts.includes(req));
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

	async function respond() {
		answerPending();
		await fixture.whenStable();
	}

	async function releasePut() {
		const req = heldPuts.shift();
		if (!req) throw new Error("No held PUT");
		answerPut(req);
		await respond();
	}

	async function renderTags(
		inputs: { gameId?: string; readonly?: boolean } = {}
	) {
		const view = await render(GameTags, {
			inputs: { gameId: "g1", readonly: false, ...inputs },
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		fixture = view.fixture;
		await untilVisible(() =>
			expect(
				screen.queryByRole("list", { name: "Loading tags" })
			).not.toBeInTheDocument()
		);
		return view;
	}

	const chip = (name: string | RegExp) =>
		within(
			screen.getByRole("list", { name: "Tags on this game" })
		).getByRole("button", { name });
	const field = () =>
		screen.getByRole("combobox", { name: "Add a tag" }) as HTMLInputElement;

	beforeEach(() => {
		communityByGame = {
			g1: [
				{ tag: "relaxing", players: 4, mine: false },
				{ tag: "short", players: 3, mine: false },
				{ tag: "cozy", players: 2, mine: true },
				{ tag: "podcast game", players: 1, mine: true }
			],
			g2: [{ tag: "brutal", players: 6, mine: false }]
		};
		mineByGame = { g1: ["cozy", "podcast game"], g2: [] };
		putBodies = [];
		heldPuts = [];
		holdPuts = false;
		failNextPut = null;
		searches = [];
		toast = { error: vi.fn(), success: vi.fn() };
	});

	afterEach(() => {
		heldPuts.forEach(req => req.flush({ data: { tags: [] } }));
		heldPuts = [];
		answerPending();
		httpTesting.verify();
	});

	it("shows each tag with its players, marks mine as pressed and links every tag to its page", async () => {
		await renderTags();

		expect(chip("relaxing, 4 players")).toHaveAttribute(
			"aria-pressed",
			"false"
		);
		expect(chip("cozy, 2 players")).toHaveAttribute("aria-pressed", "true");
		expect(chip("podcast game, 1 player")).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		expect(
			screen.getByRole("link", { name: "Games tagged podcast game" })
		).toHaveAttribute("href", "/tags/podcast%20game");
		expect(screen.getByText("2/10")).toBeInTheDocument();
	});

	it("adds my vote at once and a double click sends a single request", async () => {
		const user = userEvent.setup();
		holdPuts = true;
		await renderTags();

		await user.dblClick(chip("relaxing, 4 players"));
		await respond();

		expect(chip("relaxing, 5 players")).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		expect(putBodies).toEqual([
			{ gameId: "g1", tags: ["cozy", "podcast game", "relaxing"] }
		]);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Added your vote for relaxing."
		);
		await releasePut();
		expect(chip("relaxing, 5 players")).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		expect(putBodies).toHaveLength(1);
	});

	it("keeps a tag I just stopped using on screen so I can take the tap back", async () => {
		const user = userEvent.setup();
		await renderTags();

		await user.click(chip("podcast game, 1 player"));
		await respond();

		expect(chip("podcast game, 0 players")).toHaveAttribute(
			"aria-pressed",
			"false"
		);
		expect(putBodies.at(-1)?.tags).toEqual(["cozy"]);

		await user.click(chip("podcast game, 0 players"));
		await respond();

		expect(chip("podcast game, 1 player")).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		expect(putBodies.at(-1)?.tags).toEqual(["cozy", "podcast game"]);
	});

	it("turns rapid taps on different tags into one request at a time that ends in my last choice", async () => {
		const user = userEvent.setup();
		holdPuts = true;
		await renderTags();

		await user.click(chip("relaxing, 4 players"));
		await user.click(chip("short, 3 players"));
		await user.click(chip("cozy, 2 players"));
		await respond();

		expect(putBodies).toHaveLength(1);
		await releasePut();
		expect(putBodies).toHaveLength(2);
		expect(new Set(putBodies[1].tags)).toEqual(
			new Set(["podcast game", "relaxing", "short"])
		);
		await releasePut();
		expect(putBodies).toHaveLength(2);
		expect(new Set(mineByGame["g1"])).toEqual(
			new Set(["podcast game", "relaxing", "short"])
		);
		expect(chip("cozy, 1 player")).toHaveAttribute("aria-pressed", "false");
	});

	it("puts my tags back and warns when the server fails", async () => {
		const user = userEvent.setup();
		failNextPut = 500;
		await renderTags();

		await user.click(chip("relaxing, 4 players"));
		await respond();

		expect(chip("relaxing, 4 players")).toHaveAttribute(
			"aria-pressed",
			"false"
		);
		expect(toast.error).toHaveBeenCalledWith(
			"Couldn't update your tags. Try again."
		);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Your tags weren't saved."
		);
	});

	it("puts my tags back without a second warning when the free plan limit answers", async () => {
		const user = userEvent.setup();
		failNextPut = 402;
		await renderTags();

		await user.click(chip("short, 3 players"));
		await respond();

		expect(chip("short, 3 players")).toHaveAttribute(
			"aria-pressed",
			"false"
		);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("suggests popular tags in an empty field and adds the one I click", async () => {
		const user = userEvent.setup();
		await renderTags();

		await user.click(field());
		await untilVisible(() =>
			expect(
				screen.getByRole("listbox", { name: "Popular tags" })
			).toBeInTheDocument()
		);
		const listbox = screen.getByRole("listbox", { name: "Popular tags" });
		expect(
			within(listbox)
				.getAllByRole("option")
				.map(option => option.textContent?.replace(/\s+/g, " ").trim())
		).toEqual([
			expect.stringContaining("co-op 12 games"),
			expect.stringContaining("relaxing 8 games"),
			expect.stringContaining("chill 3 games")
		]);

		await user.click(
			within(listbox).getByRole("option", { name: /co-op/ })
		);
		await respond();

		expect(chip("co-op, 1 player")).toHaveAttribute("aria-pressed", "true");
		expect(putBodies.at(-1)?.tags).toEqual([
			"cozy",
			"podcast game",
			"co-op"
		]);
		expect(field()).toHaveValue("");
	});

	it("searches once after the typing stops and adds a normalized new tag with Enter", async () => {
		await renderTags();
		fireEvent.focus(field());

		for (const value of ["  C", "  Ch", "  Chi", "  Chill  Vibes "]) {
			fireEvent.input(field(), { target: { value } });
		}
		expect(
			screen.getByRole("option", { name: "Add “chill vibes”" })
		).toBeInTheDocument();
		await untilVisible(() => expect(searches).toEqual(["chill vibes"]));
		expect(field()).toHaveAttribute("aria-expanded", "true");

		fireEvent.keyDown(field(), { key: "Enter" });
		fireEvent.keyDown(field(), { key: "Enter" });
		await respond();

		expect(chip("chill vibes, 1 player")).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		expect(putBodies).toEqual([
			{ gameId: "g1", tags: ["cozy", "podcast game", "chill vibes"] }
		]);
	});

	it("offers search matches next to the new tag and skips tags I already use", async () => {
		const user = userEvent.setup();
		await renderTags();
		fireEvent.focus(field());

		fireEvent.input(field(), { target: { value: "co" } });
		await untilVisible(() =>
			expect(
				screen.getByRole("option", { name: /co-op/ })
			).toBeInTheDocument()
		);
		expect(
			screen.getByRole("option", { name: "Add “co”" })
		).toBeInTheDocument();

		fireEvent.input(field(), { target: { value: "Cozy" } });
		await untilVisible(() =>
			expect(
				screen.getByText("“cozy” is already one of your tags here.")
			).toBeInTheDocument()
		);
		expect(
			screen.queryByRole("option", { name: "Add “cozy”" })
		).not.toBeInTheDocument();
		await user.keyboard("{Escape}");
		await respond();
		expect(putBodies).toEqual([]);
	});

	it("still adds what I typed with Enter after closing the list with Escape", async () => {
		await renderTags();
		fireEvent.focus(field());
		fireEvent.input(field(), { target: { value: "Comfy" } });

		fireEvent.keyDown(field(), { key: "Escape" });
		expect(field()).toHaveAttribute("aria-expanded", "false");
		fireEvent.keyDown(field(), { key: "Enter" });
		await respond();

		expect(chip("comfy, 1 player")).toHaveAttribute("aria-pressed", "true");
		expect(putBodies.at(-1)?.tags).toEqual([
			"cozy",
			"podcast game",
			"comfy"
		]);
	});

	it("does nothing on Enter with an empty field and the list closed", async () => {
		await renderTags();
		fireEvent.focus(field());
		fireEvent.keyDown(field(), { key: "Escape" });

		fireEvent.keyDown(field(), { key: "Enter" });
		await respond();

		expect(putBodies).toEqual([]);
	});

	it("rejects a tag longer than 40 characters without offering to add it", async () => {
		await renderTags();
		fireEvent.focus(field());

		fireEvent.input(field(), { target: { value: "x".repeat(41) } });

		expect(field()).toHaveAttribute("aria-invalid", "true");
		expect(
			screen.getByText("Use 40 characters or fewer.")
		).toBeInTheDocument();
		fireEvent.keyDown(field(), { key: "Enter" });
		await respond();
		expect(putBodies).toEqual([]);
	});

	it("stops adding at 10 tags on a game but still lets me remove one", async () => {
		const user = userEvent.setup();
		const mine = Array.from({ length: 10 }, (_, i) => ({
			tag: `mine ${i}`,
			players: 1,
			mine: true
		}));
		communityByGame["g1"] = [
			{ tag: "relaxing", players: 4, mine: false },
			...mine
		];
		await renderTags();

		expect(chip("relaxing, 4 players")).toBeDisabled();
		expect(field()).toBeDisabled();
		expect(screen.getByText("10/10")).toBeInTheDocument();
		expect(
			screen.getByText(/Remove one to add another/)
		).toBeInTheDocument();

		await user.click(chip("mine 3, 1 player"));
		await respond();

		expect(chip("relaxing, 4 players")).toBeEnabled();
		expect(field()).toBeEnabled();
		expect(putBodies.at(-1)?.tags).toHaveLength(9);
	});

	it("shows visitors the tags as links only, without voting or a field", async () => {
		communityByGame["g1"] = [{ tag: "relaxing", players: 4, mine: false }];
		await renderTags({ readonly: true });

		expect(
			screen.getByRole("link", {
				name: "Games tagged relaxing, 4 players"
			})
		).toHaveAttribute("href", "/tags/relaxing");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});

	it("ignores a late save from the previous game after switching games", async () => {
		const user = userEvent.setup();
		holdPuts = true;
		const view = await renderTags();

		await user.click(chip("relaxing, 4 players"));
		answerPending();
		view.fixture.componentRef.setInput("gameId", "g2");
		await untilVisible(() =>
			expect(chip("brutal, 6 players")).toBeInTheDocument()
		);
		await releasePut();

		expect(screen.queryByRole("button", { name: /relaxing/ })).toBeNull();
		expect(chip("brutal, 6 players")).toHaveAttribute(
			"aria-pressed",
			"false"
		);
		expect(screen.getByText("0/10")).toBeInTheDocument();
		expect(putBodies).toHaveLength(1);
	});

	it("offers a retry when the tags fail to load", async () => {
		const user = userEvent.setup();
		await render(GameTags, {
			inputs: { gameId: "g1" },
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		httpTesting
			.expectOne(`${api}/games/g1/tags`)
			.flush(null, { status: 500, statusText: "Error" });

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(
			"Couldn't load the tags for this game."
		);

		await user.click(
			within(alert).getByRole("button", { name: "Try again" })
		);
		await untilVisible(() =>
			expect(chip("relaxing, 4 players")).toBeInTheDocument()
		);
	});
});
