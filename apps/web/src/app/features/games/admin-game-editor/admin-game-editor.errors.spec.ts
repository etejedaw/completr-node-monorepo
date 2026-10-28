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
	body: object;
}

const api = environment.apiUrl;
const scoreSources = [
	{ code: "completr", name: "Completr", scale: 5, priority: 0 },
	{ code: "metacritic", name: "Metacritic", scale: 100, priority: 1 },
	{ code: "opencritic", name: "OpenCritic", scale: 100, priority: 2 }
];

const existingGame = {
	id: "g1",
	code: "hades",
	title: "Hades",
	isDlc: false,
	platforms: [],
	genres: [],
	scores: [{ source: "metacritic", score: 90 }],
	times: [{ source: "hltb", duration: 20 }]
} as unknown as Game;

describe("AdminGameEditor API errors and value validation", () => {
	let httpTesting: HttpTestingController;
	let failures: Record<string, ApiFailure>;
	let unexpectedRequests: string[];

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		const failure = failures[`${method} ${url.replace(api, "")}`];
		if (failure)
			return req.flush(failure.body, {
				status: failure.status,
				statusText: "err"
			});
		if (url === `${api}/score-sources`)
			return req.flush({ data: { sources: scoreSources } });
		if (url === `${api}/platforms`)
			return req.flush({ data: { platforms: [] } });
		if (url === `${api}/genres`) return req.flush({ data: { genres: [] } });
		if (method === "GET" && url === `${api}/franchises`)
			return req.flush({ data: { franchises: [], total: 0 } });
		if (method === "PATCH" && url === `${api}/games/g1`)
			return req.flush({ data: { game: existingGame } });
		if (method === "PUT" && url.startsWith(`${api}/games/g1/`))
			return req.flush({ data: {} });
		unexpectedRequests.push(`${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled);
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

	function section(name: string) {
		return screen.getByRole("heading", { level: 4, name })
			.parentElement as HTMLElement;
	}

	function field(label: string) {
		return screen.getByRole("spinbutton", { name: label });
	}

	async function typeInto(label: string, value: string) {
		const input = field(label);
		await userEvent.tripleClick(input);
		await userEvent.keyboard(value);
	}

	async function renderEditor(game: Game | null) {
		await render(AdminGameEditor, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			inputs: { game }
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(
				screen.getByLabelText("metacritic score")
			).toBeInTheDocument()
		);
	}

	async function renderCreateEditor() {
		await render(AdminGameEditor, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			inputs: { game: null }
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(
				screen.getByRole("button", { name: "Create Game" })
			).toBeInTheDocument()
		);
	}

	async function typeTitle() {
		await userEvent.type(screen.getByLabelText("Title"), "Hades II");
	}

	async function clickSave(name: RegExp | string) {
		await userEvent.click(screen.getByRole("button", { name }));
	}

	async function alertText() {
		const alert = await screen.findByRole("alert");
		return alert.querySelector(".material-icons")
			? alert.lastElementChild?.textContent?.trim()
			: alert.textContent?.trim();
	}

	beforeEach(() => {
		failures = {};
		unexpectedRequests = [];
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
			expect(unexpectedRequests).toEqual([]);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("errors returned by the API", () => {
		it("explains a duplicated title when editing a game", async () => {
			failures["PATCH /games/g1"] = {
				status: 409,
				body: { type: "GAME_UNIQUE_CONSTRAINT", title: "Conflict" }
			};
			await renderEditor(existingGame);

			await clickSave("Save Changes");

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Another game already uses this title or code. Choose a different title."
				)
			);
		});

		it("explains a duplicated title when creating a game", async () => {
			failures["POST /games"] = {
				status: 409,
				body: { type: "GAME_UNIQUE_CONSTRAINT", title: "Conflict" }
			};
			await renderCreateEditor();
			await typeTitle();

			await clickSave("Create Game");

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Another game already uses this title or code. Choose a different title."
				)
			);
		});

		it("names the source and scale when a created game has a score out of range", async () => {
			failures["POST /games"] = {
				status: 422,
				body: {
					type: "GAME_SCORE_OUT_OF_RANGE",
					title: "Score is outside the scale of its source",
					context: {
						raw: { source: "metacritic", score: 101, scale: 100 }
					}
				}
			};
			await renderCreateEditor();
			await typeTitle();

			await clickSave("Create Game");

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"The metacritic score must be between 0 and 100."
				)
			);
		});

		it("explains a score out of range returned by the bulk scores update", async () => {
			failures["PUT /games/g1/scores"] = {
				status: 422,
				body: {
					type: "GAME_SCORE_OUT_OF_RANGE",
					title: "Score is outside the scale of its source",
					context: {
						raw: { source: "metacritic", score: 95, scale: 100 }
					}
				}
			};
			await renderEditor(existingGame);

			await typeInto("metacritic score", "95");
			await clickSave("Save Changes");

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Game info saved, but scores/times were not: The metacritic score must be between 0 and 100."
				)
			);
		});

		it("explains a negative score rejected by the schema", async () => {
			failures["PUT /games/g1/scores"] = {
				status: 422,
				body: {
					type: "COMMON_SCHEMA_INVALID",
					title: "Invalid",
					issues: [
						{
							path: "scores.0.score",
							code: "too_small",
							message: "Too small"
						}
					]
				}
			};
			await renderEditor(existingGame);

			await typeInto("metacritic score", "95");
			await clickSave("Save Changes");

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Game info saved, but scores/times were not: Scores can't be negative."
				)
			);
		});

		it("explains a non positive duration rejected by the schema", async () => {
			failures["PUT /games/g1/times"] = {
				status: 422,
				body: {
					type: "COMMON_SCHEMA_INVALID",
					title: "Invalid",
					issues: [
						{
							path: "times.0.duration",
							code: "too_small",
							message: "Too small"
						}
					]
				}
			};
			await renderEditor(existingGame);

			await typeInto("hltb duration", "25");
			await clickSave("Save Changes");

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Game info saved, but scores/times were not: Durations must be greater than 0."
				)
			);
		});
	});

	describe("form validation", () => {
		it("flags a score above the scale of its source and blocks saving", async () => {
			await renderEditor(existingGame);

			await typeInto("metacritic score", "150");

			expect(
				within(section("Scores")).getByText(
					"Score can't be above 100 for metacritic."
				)
			).toBeInTheDocument();
			expect(field("metacritic score")).toBeInvalid();
			expect(field("metacritic score")).toHaveAccessibleDescription(
				"Score can't be above 100 for metacritic."
			);

			await clickSave("Save Changes");

			expect(await alertText()).toBe(
				"Fix the highlighted scores and durations before saving."
			);
		});

		it("flags a negative score", async () => {
			await renderEditor(existingGame);

			fireEvent.input(field("metacritic score"), {
				target: { value: "-1" }
			});

			expect(
				within(section("Scores")).getByText("Score can't be negative.")
			).toBeInTheDocument();
		});

		it("flags a duration that is zero or less", async () => {
			await renderEditor(existingGame);

			await typeInto("hltb duration", "0");

			expect(
				within(section("Durations")).getByText(
					"Duration must be greater than 0."
				)
			).toBeInTheDocument();
			expect(field("hltb duration")).toBeInvalid();

			await clickSave("Save Changes");

			expect(await alertText()).toBe(
				"Fix the highlighted scores and durations before saving."
			);
		});

		it("clears the error and saves once the value is valid", async () => {
			await renderEditor(existingGame);
			await typeInto("hltb duration", "0");
			await typeInto("hltb duration", "12");

			expect(
				screen.queryByText("Duration must be greater than 0.")
			).not.toBeInTheDocument();

			await clickSave("Save Changes");

			await untilVisible(() =>
				expect(screen.queryByRole("alert")).not.toBeInTheDocument()
			);
		});

		it("keeps the add buttons disabled for a new score above the scale or a new duration of zero", async () => {
			await renderEditor(existingGame);
			const scores = within(section("Scores"));
			await userEvent.selectOptions(
				scores.getByDisplayValue("Source..."),
				"opencritic"
			);
			await userEvent.type(field("New score value"), "101");

			expect(
				scores.getByText("Score can't be above 100 for opencritic.")
			).toBeInTheDocument();
			const addScore = scores.getAllByRole("button").at(-1);
			expect(addScore).toBeDisabled();

			const durations = within(section("Durations"));
			await userEvent.selectOptions(
				durations.getByDisplayValue("Source..."),
				"rawg"
			);
			await userEvent.type(field("New duration in hours"), "0");

			expect(
				durations.getByText("Duration must be greater than 0.")
			).toBeInTheDocument();
			expect(durations.getAllByRole("button").at(-1)).toBeDisabled();
		});
	});
});
