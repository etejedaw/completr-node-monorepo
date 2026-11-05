import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type Game } from "../../../core/models";
import { AdminGameEditor } from "./admin-game-editor";

interface Call {
	method: string;
	path: string;
	body: Record<string, unknown> | null;
}

const api = environment.apiUrl;

const linkedGame = {
	id: "g1",
	code: "hades",
	title: "Hades",
	description: "Escape the underworld",
	isDlc: false,
	platforms: [],
	genres: [],
	scores: [{ source: "metacritic", score: 90 }],
	times: [{ source: "hltb", duration: 20 }],
	externalLinks: [
		{ source: "rawg", externalId: "3498" },
		{ source: "hltb", externalId: "10270" },
		{ source: "metacritic", externalId: "hades" }
	]
} as unknown as Game;

const unlinkedGame = {
	...linkedGame,
	externalLinks: [{ source: "rawg", externalId: "3498" }]
} as unknown as Game;

const rawgHades = {
	source: "rawg",
	externalId: "3498",
	title: "Hades",
	description: "From RAWG",
	coverUrl: null,
	backgroundUrl: null,
	releaseAt: "2020-09-17",
	platforms: [],
	genres: [],
	scores: [],
	times: []
};

describe("AdminGameEditor external IDs", () => {
	let httpTesting: HttpTestingController;
	let calls: Call[];
	let holdSaves: boolean;
	let held: TestRequest[];
	let unexpectedRequests: string[];
	let saved: ReturnType<typeof vi.fn<() => void>>;
	let created: ReturnType<typeof vi.fn<(game: Game) => void>>;

	function respond(req: TestRequest) {
		if (req.cancelled) return;
		const { method, url } = req.request;
		const path = url.replace(api, "");
		if (path === "/score-sources")
			return req.flush({ data: { sources: [] } });
		if (path === "/platforms")
			return req.flush({
				data: {
					platforms: [
						{ id: "p1", code: "pc", name: "PC", abbreviation: "PC" }
					]
				}
			});
		if (path === "/genres") return req.flush({ data: { genres: [] } });
		if (method === "GET" && path.startsWith("/franchises"))
			return req.flush({ data: { franchises: [], total: 0 } });
		if (method === "GET" && path === "/game-external/rawg/hades")
			return req.flush({ data: { game: rawgHades } });
		if (method === "PATCH" && path === "/games/g1")
			return req.flush({ data: { game: linkedGame } });
		if (method === "POST" && path === "/games")
			return req.flush(
				{ data: { game: { ...unlinkedGame, id: "new1" } } },
				{ status: 201, statusText: "Created" }
			);
		unexpectedRequests.push(`${method} ${path}`);
	}

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		calls.push({ method, path: url.replace(api, ""), body });
		if (holdSaves && (method === "PATCH" || method === "POST")) {
			held.push(req);
			return;
		}
		respond(req);
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

	async function renderEditor(game: Game | null) {
		await render(AdminGameEditor, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			inputs: { game },
			on: { saved, created }
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(
				screen.getByRole("button", { name: "PC" })
			).toBeInTheDocument()
		);
	}

	const hltbInput = () =>
		screen.getByRole("textbox", { name: /^HowLongToBeat ID/ });
	const metacriticInput = () =>
		screen.getByRole("textbox", { name: /^Metacritic slug/ });
	const titleInput = () => screen.getByLabelText("Title");
	const saveButton = () =>
		screen.getByRole("button", { name: /Save Changes|Saving/ });

	async function pasteInto(element: HTMLElement, value: string) {
		await userEvent.click(element);
		await userEvent.clear(element);
		await userEvent.paste(value);
	}

	async function saveAndGetBody() {
		await userEvent.click(saveButton());
		await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
		return callsTo("PATCH", "/games/g1")[0].body!;
	}

	beforeEach(() => {
		calls = [];
		holdSaves = false;
		held = [];
		unexpectedRequests = [];
		saved = vi.fn();
		created = vi.fn();
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
			if (httpTesting) {
				holdSaves = false;
				held.splice(0).forEach(req => respond(req));
				answerPending();
				httpTesting.verify();
			}
			expect(unexpectedRequests).toEqual([]);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("preloading", () => {
		it("fills both fields with the saved HowLongToBeat ID and Metacritic slug", async () => {
			await renderEditor(linkedGame);

			expect(hltbInput()).toHaveValue("10270");
			expect(metacriticInput()).toHaveValue("hades");
		});

		it("leaves both fields empty for a game without those IDs", async () => {
			await renderEditor(unlinkedGame);

			expect(hltbInput()).toHaveValue("");
			expect(metacriticInput()).toHaveValue("");
		});

		it("does not break when the game has no external links at all", async () => {
			await renderEditor({
				...linkedGame,
				externalLinks: undefined
			} as unknown as Game);

			expect(hltbInput()).toHaveValue("");
			expect(metacriticInput()).toHaveValue("");
		});
	});

	describe("normalizing what the admin pastes", () => {
		it("turns a pasted HowLongToBeat URL with spaces and capitals into the bare ID when leaving the field", async () => {
			await renderEditor(unlinkedGame);

			await pasteInto(
				hltbInput(),
				"  HTTPS://WWW.HowLongToBeat.com/game/68151/?ref=x  "
			);
			await userEvent.tab();

			expect(hltbInput()).toHaveValue("68151");
			expect(hltbInput()).not.toHaveAttribute("aria-invalid");
		});

		it("turns a pasted Metacritic URL with capitals into the lowercase slug when leaving the field", async () => {
			await renderEditor(unlinkedGame);

			await pasteInto(
				metacriticInput(),
				" https://www.metacritic.com/game/The-Witcher-3-Wild-Hunt/critic-reviews/ "
			);
			await userEvent.tab();

			expect(metacriticInput()).toHaveValue("the-witcher-3-wild-hunt");
		});

		it("sends the normalized values even when Save is clicked without leaving the field", async () => {
			await renderEditor(unlinkedGame);

			await pasteInto(
				hltbInput(),
				"https://howlongtobeat.com/game/68151"
			);
			await pasteInto(metacriticInput(), "Hades-II");
			const body = await saveAndGetBody();

			expect(body["externalIds"]).toEqual([
				{ source: "hltb", externalId: "68151" },
				{ source: "metacritic", externalId: "hades-ii" }
			]);
		});
	});

	describe("sending only what changed", () => {
		it("sends no external IDs when nothing was touched", async () => {
			await renderEditor(linkedGame);

			const body = await saveAndGetBody();

			expect(body).not.toHaveProperty("externalIds");
		});

		it("sends only the HowLongToBeat ID when only that one changed", async () => {
			await renderEditor(linkedGame);

			await pasteInto(hltbInput(), "68151");
			const body = await saveAndGetBody();

			expect(body["externalIds"]).toEqual([
				{ source: "hltb", externalId: "68151" }
			]);
		});

		it("sends only the Metacritic slug when only that one changed", async () => {
			await renderEditor(linkedGame);

			await pasteInto(metacriticInput(), "hades-2020");
			const body = await saveAndGetBody();

			expect(body["externalIds"]).toEqual([
				{ source: "metacritic", externalId: "hades-2020" }
			]);
		});

		it("sends nothing when the pasted URL points to the ID already saved", async () => {
			await renderEditor(linkedGame);

			await pasteInto(
				hltbInput(),
				"https://www.howlongtobeat.com/game/10270/"
			);
			await pasteInto(
				metacriticInput(),
				"https://www.metacritic.com/game/HADES/"
			);
			const body = await saveAndGetBody();

			expect(body).not.toHaveProperty("externalIds");
		});

		it("sends nothing after the admin changes a value and types the saved one back", async () => {
			await renderEditor(linkedGame);

			await pasteInto(hltbInput(), "68151");
			await pasteInto(hltbInput(), " 010270 ");
			const body = await saveAndGetBody();

			expect(body).not.toHaveProperty("externalIds");
		});

		it("sends the manual IDs together with the RAWG ID when a new game is created", async () => {
			await renderEditor(null);

			await pasteInto(
				screen.getByRole("textbox", { name: "RAWG slug" }),
				"hades"
			);
			await userEvent.click(
				screen.getByRole("button", { name: /Fetch/ })
			);
			await untilVisible(() => expect(titleInput()).toHaveValue("Hades"));
			await pasteInto(
				hltbInput(),
				"https://howlongtobeat.com/game/10270"
			);
			await pasteInto(
				metacriticInput(),
				"https://www.metacritic.com/game/hades/"
			);
			await userEvent.click(
				screen.getByRole("button", { name: "Create Game" })
			);
			await untilVisible(() => expect(created).toHaveBeenCalledTimes(1));

			expect(callsTo("POST", "/games")[0].body!["externalIds"]).toEqual([
				{ source: "rawg", externalId: "3498" },
				{ source: "hltb", externalId: "10270" },
				{ source: "metacritic", externalId: "hades" }
			]);
		});
	});

	describe("clearing a saved ID", () => {
		it("explains that clearing does not delete the saved HowLongToBeat ID and sends nothing for it", async () => {
			await renderEditor(linkedGame);

			await userEvent.clear(hltbInput());
			await userEvent.type(hltbInput(), "   ");

			const note = screen.getByText(
				/Clearing this field doesn't delete the saved ID \(10270\)/
			);
			expect(hltbInput()).toHaveAttribute("aria-describedby", note.id);
			const body = await saveAndGetBody();
			expect(body).not.toHaveProperty("externalIds");
		});

		it("explains it for the Metacritic slug too and still sends a changed HowLongToBeat ID", async () => {
			await renderEditor(linkedGame);

			await userEvent.clear(metacriticInput());
			await pasteInto(hltbInput(), "68151");

			expect(
				screen.getByText(
					/Clearing this field doesn't delete the saved slug \(hades\)/
				)
			).toBeInTheDocument();
			const body = await saveAndGetBody();
			expect(body["externalIds"]).toEqual([
				{ source: "hltb", externalId: "68151" }
			]);
		});

		it("hides the note once the field has a value again", async () => {
			await renderEditor(linkedGame);

			await userEvent.clear(hltbInput());
			await userEvent.type(hltbInput(), "10270");

			expect(
				screen.queryByText(/Clearing this field doesn't delete/)
			).not.toBeInTheDocument();
		});

		it("shows no note when the field was already empty", async () => {
			await renderEditor(unlinkedGame);

			await userEvent.type(hltbInput(), "1");
			await userEvent.clear(hltbInput());

			expect(
				screen.queryByText(/Clearing this field doesn't delete/)
			).not.toBeInTheDocument();
		});
	});

	describe("invalid values", () => {
		it.each([
			"abc",
			"0",
			"-3",
			"12.5",
			"https://howlongtobeat.com/?q=hades"
		])(
			"shows an inline error for the HowLongToBeat ID %j after leaving the field",
			async value => {
				await renderEditor(unlinkedGame);

				await pasteInto(hltbInput(), value);
				expect(
					screen.queryByText(/Enter the HowLongToBeat game ID/)
				).not.toBeInTheDocument();
				await userEvent.tab();

				const error = screen
					.getByText(/Enter the HowLongToBeat game ID/)
					.closest("ui-field-error") as HTMLElement;
				expect(hltbInput()).toHaveAttribute("aria-invalid", "true");
				expect(hltbInput()).toHaveAttribute(
					"aria-describedby",
					error.id
				);
				expect(hltbInput()).toHaveValue(value);
			}
		);

		it("shows an inline error for a Metacritic slug with spaces or symbols", async () => {
			await renderEditor(unlinkedGame);

			await pasteInto(metacriticInput(), "the witcher 3!");
			await userEvent.tab();

			expect(
				screen.getByText(/Use lowercase letters, numbers and hyphens/)
			).toBeInTheDocument();
			expect(metacriticInput()).toHaveAttribute("aria-invalid", "true");
		});

		it("blocks saving, reveals the errors of fields never left and saves once they are fixed", async () => {
			await renderEditor(linkedGame);

			await pasteInto(metacriticInput(), "hades_2");
			await pasteInto(hltbInput(), "ten");
			await userEvent.click(saveButton());
			await userEvent.click(saveButton());
			answerPending();

			expect(callsTo("PATCH", "/games/g1")).toHaveLength(0);
			expect(
				screen.getByText(
					"Fix the highlighted external IDs before saving."
				)
			).toBeInTheDocument();
			expect(
				screen.getByText(/Enter the HowLongToBeat game ID/)
			).toBeInTheDocument();
			expect(
				screen.getByText(/Use lowercase letters, numbers and hyphens/)
			).toBeInTheDocument();

			await pasteInto(hltbInput(), "68151");
			await pasteInto(metacriticInput(), "hades-2");
			expect(
				screen.queryByText(/Enter the HowLongToBeat game ID/)
			).not.toBeInTheDocument();
			const body = await saveAndGetBody();

			expect(callsTo("PATCH", "/games/g1")).toHaveLength(1);
			expect(body["externalIds"]).toEqual([
				{ source: "hltb", externalId: "68151" },
				{ source: "metacritic", externalId: "hades-2" }
			]);
		});

		it("does not create a new game while an external ID is invalid", async () => {
			await renderEditor(null);

			await userEvent.type(titleInput(), "Hades");
			await pasteInto(hltbInput(), "🎮");
			await userEvent.click(
				screen.getByRole("button", { name: "Create Game" })
			);
			answerPending();

			expect(callsTo("POST", "/games")).toHaveLength(0);
			expect(
				screen.getByText(/Enter the HowLongToBeat game ID/)
			).toBeInTheDocument();
		});
	});

	describe("external links", () => {
		it("searches HowLongToBeat in a new tab with the encoded title", async () => {
			await renderEditor(linkedGame);

			await userEvent.clear(titleInput());
			await userEvent.type(titleInput(), "Hades & Co: 100%");

			const link = screen.getByRole("link", {
				name: /Search on HowLongToBeat/
			});
			expect(link).toHaveAttribute(
				"href",
				"https://howlongtobeat.com/?q=Hades%20%26%20Co%3A%20100%25"
			);
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		});

		it("hides the search link while the title is blank", async () => {
			await renderEditor(null);

			await userEvent.type(titleInput(), "   ");

			expect(
				screen.queryByRole("link", { name: /Search on HowLongToBeat/ })
			).not.toBeInTheDocument();
		});

		it("opens the Metacritic page of the current slug and hides the link when the slug is invalid or empty", async () => {
			await renderEditor(linkedGame);

			const link = screen.getByRole("link", {
				name: /Open on Metacritic/
			});
			expect(link).toHaveAttribute(
				"href",
				"https://www.metacritic.com/game/hades/"
			);
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");

			await pasteInto(metacriticInput(), "Hades-II");
			expect(
				screen.getByRole("link", { name: /Open on Metacritic/ })
			).toHaveAttribute(
				"href",
				"https://www.metacritic.com/game/hades-ii/"
			);

			await pasteInto(metacriticInput(), "hades ii");
			expect(
				screen.queryByRole("link", { name: /Open on Metacritic/ })
			).not.toBeInTheDocument();

			await userEvent.clear(metacriticInput());
			expect(
				screen.queryByRole("link", { name: /Open on Metacritic/ })
			).not.toBeInTheDocument();
		});
	});

	describe("double clicks", () => {
		it("sends a single update when Save is double-clicked while the request is in flight", async () => {
			holdSaves = true;
			await renderEditor(linkedGame);

			await pasteInto(hltbInput(), "68151");
			await userEvent.dblClick(saveButton());
			answerPending();

			expect(callsTo("PATCH", "/games/g1")).toHaveLength(1);
			expect(saveButton()).toBeDisabled();

			holdSaves = false;
			held.splice(0).forEach(req => respond(req));
			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			expect(
				callsTo("PATCH", "/games/g1")[0].body!["externalIds"]
			).toEqual([{ source: "hltb", externalId: "68151" }]);
		});

		it("ignores a second save fired before the button is disabled", async () => {
			holdSaves = true;
			await renderEditor(linkedGame);

			const button = saveButton();
			button.click();
			button.click();
			answerPending();

			expect(callsTo("PATCH", "/games/g1")).toHaveLength(1);
		});
	});
});
