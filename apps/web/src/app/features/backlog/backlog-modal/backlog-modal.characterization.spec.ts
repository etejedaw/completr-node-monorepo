import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { config } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type Game } from "../../../core/models";
import { DialogService } from "../../../core/services/dialog";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "./backlog-modal";

const hades = {
	id: "g1",
	code: "hades",
	title: "Hades",
	isDlc: false,
	platforms: [{ id: "p1", name: "PC", code: "pc", abbreviation: "PC" }],
	genres: [],
	scores: [{ source: "metacritic", score: 90 }],
	times: [{ source: "hltb", duration: 20 }],
	dlcs: [],
	parentGame: null,
	externalLinks: []
} as unknown as Game;

@Component({
	selector: "app-backlog-modal-host",
	template: `<button type="button" (click)="open()">Track Hades</button>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class BacklogModalHost {
	private readonly dialogs = inject(DialogService);

	open() {
		this.dialogs.open<BacklogModalData, BacklogModalResult>(BacklogModal, {
			data: {
				entry: null,
				preselectedGame: hades,
				preselectedCompilationParent: null,
				preselectAddToQueue: false
			}
		});
	}
}

type ResponseBody = Parameters<TestRequest["flush"]>[0];

interface ApiResponse {
	status: number;
	body: ResponseBody;
}

interface StoredRun {
	id: string;
	gameId: string;
	platformId: string;
	status: string;
}

interface CreateRunBody {
	gameId: string;
	platformId: string;
	status?: string;
	addToQueue?: boolean;
	addToShelf?: boolean;
	moodTags?: string[];
	review?: { content?: string; rating?: number };
	progressNote?: string;
}

const api = environment.apiUrl;
const FREE_QUEUE_LIMIT = 10;

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const created = (body: ResponseBody): ApiResponse => ({ status: 201, body });
const failure = (status: number, type: string, title: string): ApiResponse => ({
	status,
	body: { type, title }
});

describe("BacklogModal characterization", () => {
	let httpTesting: HttpTestingController;
	let runs: StoredRun[];
	let queue: string[];
	let shelf: { gameId: string; platformId: string }[];
	let tagsByGame: Record<string, string[]>;
	let progressNotes: { backlogId: string; note: string }[];
	let reviews: { gameId: string; content?: string; rating?: number }[];
	let unexpectedRequests: string[];

	function normalizeTags(tags: string[]) {
		return [...new Set(tags.map(tag => tag.trim().toLowerCase()))];
	}

	function queueLimitReached() {
		return failure(
			402,
			"QUEUE_LIMIT_REACHED",
			"Queue limit reached for free users"
		);
	}

	function insertRun(body: CreateRunBody): StoredRun {
		const run = {
			id: `b${runs.length + 1}`,
			gameId: body.gameId,
			platformId: body.platformId,
			status: body.status ?? "not_started"
		};
		runs = [...runs, run];
		return run;
	}

	function toEntry(run: StoredRun) {
		return {
			id: run.id,
			status: run.status,
			isPublic: true,
			score: 4.5,
			duration: 20,
			game: {
				id: run.gameId,
				code: "hades",
				title: "Hades",
				isDlc: false
			},
			platform: { id: run.platformId, abbreviation: "PC" }
		};
	}

	function createRun(body: CreateRunBody): ApiResponse {
		const status = body.status ?? "not_started";
		if (body.addToQueue && status !== "not_started")
			return failure(
				409,
				"QUEUE_BACKLOG_NOT_STARTED",
				"Only not started runs can be queued"
			);
		if (body.addToQueue && queue.length >= FREE_QUEUE_LIMIT)
			return queueLimitReached();
		const run = insertRun(body);
		if (body.review && !reviews.some(r => r.gameId === body.gameId))
			reviews = [...reviews, { gameId: body.gameId, ...body.review }];
		if (body.moodTags)
			tagsByGame = {
				...tagsByGame,
				[body.gameId]: normalizeTags(body.moodTags)
			};
		if (body.progressNote)
			progressNotes = [
				...progressNotes,
				{ backlogId: run.id, note: body.progressNote }
			];
		if (body.addToQueue) queue = [...queue, run.id];
		const alreadyOnShelf = shelf.some(
			copy =>
				copy.gameId === body.gameId &&
				copy.platformId === body.platformId
		);
		if (body.addToShelf && !alreadyOnShelf)
			shelf = [
				...shelf,
				{ gameId: body.gameId, platformId: body.platformId }
			];
		return created({ data: { backlog: toEntry(run) } });
	}

	function addToQueue(backlogId: string): ApiResponse {
		const run = runs.find(r => r.id === backlogId);
		if (!run) return failure(404, "BACKLOG_NOT_FOUND", "Run not found");
		if (queue.length >= FREE_QUEUE_LIMIT) return queueLimitReached();
		queue = [...queue, backlogId];
		return created({
			data: {
				queue: {
					id: `q-${backlogId}`,
					position: queue.length,
					backlog: toEntry(run)
				}
			}
		});
	}

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url, body } = req.request;
		if (url === `${api}/score-sources`)
			return ok({
				data: {
					sources: [
						{
							code: "metacritic",
							name: "Metacritic",
							scale: 100,
							priority: 1
						}
					]
				}
			});
		if (method === "GET" && url === `${api}/users/me/mood-tags`)
			return ok({
				data: {
					tags: Object.values(tagsByGame)
						.flat()
						.map(tag => ({ tag, count: 1 }))
				}
			});
		const gameTagsMatch = url.match(
			/\/users\/me\/games\/([^/]+)\/mood-tags$/
		);
		if (method === "GET" && gameTagsMatch)
			return ok({ data: { tags: tagsByGame[gameTagsMatch[1]] ?? [] } });
		if (method === "PUT" && gameTagsMatch) {
			tagsByGame = {
				...tagsByGame,
				[gameTagsMatch[1]]: normalizeTags(body.tags)
			};
			return ok({ data: { tags: tagsByGame[gameTagsMatch[1]] } });
		}
		if (method === "POST" && url === `${api}/users/me/backlog`)
			return createRun(body);
		const progressMatch = url.match(
			/\/users\/me\/backlog\/([^/]+)\/progress$/
		);
		if (method === "POST" && progressMatch) {
			progressNotes = [
				...progressNotes,
				{ backlogId: progressMatch[1], note: body.note }
			];
			return created({
				data: {
					progress: {
						id: `n${progressNotes.length}`,
						note: body.note,
						createdAt: "2026-10-21T10:00:00.000Z"
					}
				}
			});
		}
		if (method === "POST" && url === `${api}/users/me/queue?source=backlog`)
			return addToQueue(body.id);
		if (method === "POST" && url === `${api}/users/me/game-shelf`) {
			shelf = [
				...shelf,
				{ gameId: body.gameId, platformId: body.platformId }
			];
			return created({
				data: { gameShelf: { id: `s${shelf.length}`, ...body } }
			});
		}
		const reviewMatch = url.match(/\/games\/([^/]+)\/reviews$/);
		if (method === "POST" && reviewMatch) {
			reviews = [...reviews, { gameId: reviewMatch[1], ...body }];
			return created({
				data: { review: { id: `r${reviews.length}`, ...body } }
			});
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

	async function renderHost() {
		await render(BacklogModalHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: []
		});
		httpTesting = TestBed.inject(HttpTestingController);
	}

	async function openModal() {
		await userEvent.click(
			screen.getByRole("button", { name: "Track Hades" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add to My Games"
		});
		await untilVisible(() =>
			expect(
				within(dialog).getByRole("button", { name: "Add" })
			).toBeEnabled()
		);
		return dialog;
	}

	async function openNotes(dialog: HTMLElement) {
		await userEvent.click(
			within(dialog).getByRole("tab", { name: /Notes/ })
		);
	}

	async function submit(dialog: HTMLElement) {
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Add" })
		);
	}

	async function untilClosed() {
		await untilVisible(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
	}

	beforeEach(() => {
		runs = [];
		queue = [];
		shelf = [];
		tagsByGame = {};
		progressNotes = [];
		reviews = [];
		unexpectedRequests = [];
		config.onUnhandledError = () => undefined;
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
		try {
			answerPending();
			httpTesting.verify();
		} finally {
			config.onUnhandledError = null;
			vi.unstubAllGlobals();
		}
	});

	describe("same behavior", () => {
		it("creates the run with Up Next, shelf, a mood tag and a progress note", async () => {
			await renderHost();
			const dialog = await openModal();

			await userEvent.click(
				within(dialog).getByRole("switch", { name: "Add to Up Next" })
			);
			await userEvent.click(
				within(dialog).getByRole("switch", { name: "Add to My Shelf" })
			);
			await openNotes(dialog);
			await userEvent.type(
				within(dialog).getByRole("textbox", { name: "Tags" }),
				"cozy{Enter}"
			);
			await userEvent.type(
				within(dialog).getByLabelText("Where I am"),
				"Chapter 3"
			);
			await submit(dialog);

			await untilClosed();
			expect(runs).toEqual([
				{
					id: "b1",
					gameId: "g1",
					platformId: "p1",
					status: "not_started"
				}
			]);
			expect(queue).toEqual(["b1"]);
			expect(shelf).toEqual([{ gameId: "g1", platformId: "p1" }]);
			expect(tagsByGame).toEqual({ g1: ["cozy"] });
			expect(progressNotes).toEqual([
				{ backlogId: "b1", note: "Chapter 3" }
			]);
			expect(reviews).toEqual([]);
		});

		it("creates the run alone when no extra is chosen", async () => {
			await renderHost();
			const dialog = await openModal();

			await submit(dialog);

			await untilClosed();
			expect(runs).toEqual([
				{
					id: "b1",
					gameId: "g1",
					platformId: "p1",
					status: "not_started"
				}
			]);
			expect(queue).toEqual([]);
			expect(shelf).toEqual([]);
			expect(tagsByGame["g1"] ?? []).toEqual([]);
			expect(progressNotes).toEqual([]);
			expect(reviews).toEqual([]);
		});

		it("creates a completed run with its review", async () => {
			await renderHost();
			const dialog = await openModal();

			await userEvent.click(
				within(dialog).getByRole("button", { name: /^Status:/ })
			);
			await userEvent.click(
				await screen.findByRole("menuitemradio", { name: /Completed/ })
			);
			await openNotes(dialog);
			await userEvent.type(
				within(dialog).getByLabelText("Review (optional)"),
				"Escaped at last"
			);
			await submit(dialog);

			await untilClosed();
			expect(runs).toEqual([
				{
					id: "b1",
					gameId: "g1",
					platformId: "p1",
					status: "completed"
				}
			]);
			expect(reviews).toEqual([
				{ gameId: "g1", content: "Escaped at last" }
			]);
			expect(queue).toEqual([]);
			expect(shelf).toEqual([]);
		});
	});

	describe("intended change on failure", () => {
		it("creates nothing and shows the error when Up Next is full", async () => {
			queue = Array.from(
				{ length: FREE_QUEUE_LIMIT },
				(_, index) => `old-${index}`
			);
			await renderHost();
			const dialog = await openModal();

			await userEvent.click(
				within(dialog).getByRole("switch", {
					name: "Add to Up Next"
				})
			);
			await submit(dialog);

			await untilVisible(() =>
				expect(
					within(dialog).getByText(
						"Queue limit reached for free users"
					)
				).toBeInTheDocument()
			);
			expect(
				screen.getByRole("dialog", { name: "Add to My Games" })
			).toBeInTheDocument();
			expect(runs).toEqual([]);
			expect(queue).toHaveLength(FREE_QUEUE_LIMIT);
		});

		it("keeps a single shelf copy when two runs of the same game and platform add it", async () => {
			await renderHost();

			for (let attempt = 0; attempt < 2; attempt++) {
				const dialog = await openModal();
				await userEvent.click(
					within(dialog).getByRole("switch", {
						name: "Add to My Shelf"
					})
				);
				await submit(dialog);
				await untilClosed();
			}

			expect(runs).toHaveLength(2);
			expect(shelf).toEqual([{ gameId: "g1", platformId: "p1" }]);
		});
	});
});
