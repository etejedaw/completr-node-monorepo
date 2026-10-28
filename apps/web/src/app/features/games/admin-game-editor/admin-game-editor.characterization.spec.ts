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
	Component,
	input,
	output
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type Game } from "../../../core/models";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { AdminGameEditor } from "./admin-game-editor";

@Component({
	selector: "app-admin-game-editor-host",
	imports: [AdminGameEditor, ToastContainer],
	template: `<app-admin-game-editor
			[game]="game()"
			(saved)="saved.emit()"
		/><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class AdminGameEditorHost {
	readonly game = input.required<Game>();
	readonly saved = output<void>();
}

type ResponseBody = Parameters<TestRequest["flush"]>[0];

interface ApiResponse {
	status: number;
	body: ResponseBody;
}

interface StoredScore {
	source: string;
	score: number;
}

interface StoredTime {
	source: string;
	duration: number;
}

const api = environment.apiUrl;
const scoreSources = [
	{ code: "completr", name: "Completr", scale: 5, priority: 0 },
	{ code: "metacritic", name: "Metacritic", scale: 100, priority: 1 },
	{ code: "opencritic", name: "OpenCritic", scale: 100, priority: 2 }
];

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const failure = (status: number, type: string): ApiResponse => ({
	status,
	body: { type, title: type }
});

describe("AdminGameEditor characterization", () => {
	let httpTesting: HttpTestingController;
	let title: string;
	let scores: StoredScore[];
	let times: StoredTime[];
	let failingScoreSource: string | null;
	let unexpectedRequests: string[];
	let saved: ReturnType<typeof vi.fn<() => void>>;

	function upsertScore(source: string, score: number) {
		scores = scores.some(s => s.source === source)
			? scores.map(s => (s.source === source ? { source, score } : s))
			: [...scores, { source, score }];
	}

	function upsertTime(source: string, duration: number) {
		times = times.some(t => t.source === source)
			? times.map(t => (t.source === source ? { source, duration } : t))
			: [...times, { source, duration }];
	}

	function writeScore(source: string, score?: number): ApiResponse {
		if (source === failingScoreSource)
			return failure(500, "INTERNAL_SERVER_ERROR");
		if (score === undefined) {
			scores = scores.filter(s => s.source !== source);
			return { status: 204, body: "" };
		}
		upsertScore(source, score);
		return ok({ data: { gameScore: { source, score } } });
	}

	function writeTime(source: string, duration?: number): ApiResponse {
		if (duration === undefined) {
			times = times.filter(t => t.source !== source);
			return { status: 204, body: "" };
		}
		upsertTime(source, duration);
		return ok({ data: { gameTime: { source, duration } } });
	}

	function replaceScores(next: StoredScore[]): ApiResponse {
		const touched = new Set([
			...next.map(s => s.source),
			...scores.map(s => s.source)
		]);
		if (failingScoreSource && touched.has(failingScoreSource))
			return failure(500, "INTERNAL_SERVER_ERROR");
		scores = next.map(s => ({ ...s }));
		return ok({ data: { gameScores: scores } });
	}

	function replaceTimes(next: StoredTime[]): ApiResponse {
		times = next.map(t => ({ ...t }));
		return ok({ data: { gameTimes: times } });
	}

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url, body } = req.request;
		if (url === `${api}/score-sources`)
			return ok({ data: { sources: scoreSources } });
		if (url === `${api}/platforms`) return ok({ data: { platforms: [] } });
		if (url === `${api}/genres`) return ok({ data: { genres: [] } });
		if (method === "GET" && url === `${api}/franchises`)
			return ok({ data: { franchises: [], total: 0 } });
		if (method === "PATCH" && url === `${api}/games/g1`) {
			title = body.title;
			return ok({ data: { game: { ...game(), title } } });
		}
		if (method === "PUT" && url === `${api}/games/g1/scores`)
			return replaceScores(body.scores);
		if (method === "PUT" && url === `${api}/games/g1/times`)
			return replaceTimes(body.times);
		if (method === "POST" && url === `${api}/game-scores`)
			return writeScore(body.source, body.score);
		if (method === "POST" && url === `${api}/game-times`)
			return writeTime(body.source, body.duration);
		const scoreMatch = url.match(/\/game-scores\/g1\/([^/]+)$/);
		if (method === "PATCH" && scoreMatch)
			return writeScore(scoreMatch[1], body.score);
		if (method === "DELETE" && scoreMatch) return writeScore(scoreMatch[1]);
		const timeMatch = url.match(/\/game-times\/g1\/([^/]+)$/);
		if (method === "PATCH" && timeMatch)
			return writeTime(timeMatch[1], body.duration);
		if (method === "DELETE" && timeMatch) return writeTime(timeMatch[1]);
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

	function game(): Game {
		return {
			id: "g1",
			code: "hades",
			title,
			isDlc: false,
			platforms: [],
			genres: [],
			scores: scores.map(s => ({ ...s })),
			times: times.map(t => ({ ...t }))
		} as unknown as Game;
	}

	function section(name: string) {
		return screen.getByRole("heading", { level: 4, name })
			.parentElement as HTMLElement;
	}

	function row(sectionName: string, source: string) {
		return within(section(sectionName)).getByText(source)
			.parentElement as HTMLElement;
	}

	async function changeValue(
		sectionName: string,
		source: string,
		value: string
	) {
		const field = within(row(sectionName, source)).getByRole("spinbutton");
		await userEvent.tripleClick(field);
		await userEvent.keyboard(value);
		expect(field).toHaveValue(Number(value));
	}

	async function removeRow(sectionName: string, source: string) {
		await userEvent.click(
			within(row(sectionName, source)).getByRole("button")
		);
	}

	async function addDuration(source: string, hours: string) {
		const durations = within(section("Durations"));
		await userEvent.selectOptions(
			durations.getByDisplayValue("Source..."),
			source
		);
		await userEvent.type(durations.getByPlaceholderText("Hours"), hours);
		const buttons = durations.getAllByRole("button");
		await userEvent.click(buttons[buttons.length - 1]);
	}

	function saveButton() {
		return screen.getByRole("button", { name: /Save Changes|Saving/ });
	}

	async function renderEditor() {
		saved = vi.fn<() => void>();
		const { fixture } = await render(AdminGameEditorHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			inputs: { game: game() },
			on: { saved }
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(row("Scores", "metacritic")).toBeInTheDocument()
		);
	}

	async function save() {
		await userEvent.click(saveButton());
		await untilVisible(() =>
			expect(saveButton()).toHaveTextContent("Save Changes")
		);
	}

	beforeEach(() => {
		title = "Hades";
		scores = [
			{ source: "metacritic", score: 90 },
			{ source: "opencritic", score: 85 }
		];
		times = [{ source: "hltb", duration: 20 }];
		failingScoreSource = null;
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
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("same behavior", () => {
		it("saves a changed score, an added duration and a removed one", async () => {
			await renderEditor();

			await changeValue("Scores", "metacritic", "88");
			await addDuration("rawg", "18");
			await removeRow("Durations", "hltb");
			await save();

			await untilVisible(() =>
				expect(screen.getByText("Game saved.")).toBeInTheDocument()
			);
			expect(saved).toHaveBeenCalledTimes(1);
			expect(scores).toEqual([
				{ source: "metacritic", score: 88 },
				{ source: "opencritic", score: 85 }
			]);
			expect(times).toEqual([{ source: "rawg", duration: 18 }]);
		});

		it("saves the game without touching its scores and durations", async () => {
			await renderEditor();
			const savedToastsBefore =
				screen.queryAllByText("Game saved.").length;

			await save();

			await untilVisible(() => expect(saved).toHaveBeenCalledTimes(1));
			await untilVisible(() =>
				expect(screen.getAllByText("Game saved.")).toHaveLength(
					savedToastsBefore + 1
				)
			);
			expect(
				screen.queryByText(/failed to save|NOT saved/)
			).not.toBeInTheDocument();
			expect(title).toBe("Hades");
			expect(scores).toEqual([
				{ source: "metacritic", score: 90 },
				{ source: "opencritic", score: 85 }
			]);
			expect(times).toEqual([{ source: "hltb", duration: 20 }]);
		});
	});

	describe("intended change on failure", () => {
		it("keeps every score as it was when one of them fails to save", async () => {
			failingScoreSource = "opencritic";
			await renderEditor();

			await changeValue("Scores", "metacritic", "70");
			await changeValue("Scores", "opencritic", "80");
			await save();

			expect(
				screen.getByText(
					"Game updated but some scores/times failed to save."
				)
			).toBeInTheDocument();
			expect(saved).not.toHaveBeenCalled();
			expect(scores).toEqual([
				{ source: "metacritic", score: 90 },
				{ source: "opencritic", score: 85 }
			]);
		});
	});
});
