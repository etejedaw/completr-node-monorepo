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
import { NgpDialogRef } from "ng-primitives/dialog";

import { environment } from "../../../../environments/environment";
import { type Game } from "../../../core/models";
import { BacklogModal } from "./backlog-modal";
import { type BacklogModalData } from "./backlog-modal.model";

const api = environment.apiUrl;
const backlogUrl = `${api}/users/me/backlog`;

const preselectedGame = {
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
} as Game;

describe("BacklogModal interaction", () => {
	let httpTesting: HttpTestingController;
	let close: ReturnType<typeof vi.fn>;
	const writes: { method: string; url: string; body: unknown }[] = [];
	let createResponse: (req: TestRequest) => void;

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (method !== "GET") {
			writes.push({ method, url, body });
			if (method === "POST" && url === backlogUrl)
				return createResponse(req);
			return req.flush({ data: {} });
		}
		if (url === `${api}/score-sources`)
			return req.flush({
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
		if (url === `${api}/users/me/mood-tags`)
			return req.flush({ data: { tags: [] } });
		if (url === `${api}/users/me/games/g1/mood-tags`)
			return req.flush({ data: { tags: ["cozy"] } });
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

	async function renderModal(overrides: Partial<BacklogModalData> = {}) {
		const data: BacklogModalData = {
			entry: null,
			preselectedGame,
			preselectedCompilationParent: null,
			preselectAddToQueue: false,
			...overrides
		};
		await render(BacklogModal, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: NgpDialogRef, useValue: { data, close } }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await waitFor(() => {
			answerPending();
			expect(addButton()).toBeEnabled();
		});
	}

	function addButton() {
		return screen.getByRole("button", { name: "Add" });
	}

	async function submit() {
		await userEvent.click(addButton());
		await waitFor(() => {
			answerPending();
			expect(writes.length).toBeGreaterThan(0);
		});
	}

	beforeEach(() => {
		writes.length = 0;
		close = vi.fn();
		createResponse = req =>
			req.flush(
				{ data: { backlog: { id: "b1" } } },
				{ status: 201, statusText: "Created" }
			);
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
		vi.unstubAllGlobals();
	});

	it("creates the run with Up Next, shelf, mood tags and progress note in a single request", async () => {
		await renderModal({ preselectAddToQueue: true });

		await userEvent.click(
			screen.getByRole("switch", { name: "Add to My Shelf" })
		);
		await userEvent.click(screen.getByRole("tab", { name: /Notes/ }));
		await userEvent.type(
			screen.getByLabelText("Where I am"),
			"  Chapter 3  "
		);
		await submit();

		expect(writes).toEqual([
			{
				method: "POST",
				url: backlogUrl,
				body: expect.objectContaining({
					gameId: "g1",
					platformId: "p1",
					score: 4.5,
					duration: 20,
					status: "not_started",
					addToQueue: true,
					addToShelf: true,
					moodTags: ["cozy"],
					progressNote: "Chapter 3"
				})
			}
		]);
		expect(
			(writes[0].body as Record<string, unknown>)["review"]
		).toBeUndefined();
		expect(close).toHaveBeenCalledWith("saved");
	});

	it("leaves the extras out of the request when none is chosen", async () => {
		await renderModal();

		await submit();

		expect(writes).toHaveLength(1);
		const body = writes[0].body as Record<string, unknown>;
		expect(body["addToQueue"]).toBeUndefined();
		expect(body["addToShelf"]).toBeUndefined();
		expect(body["progressNote"]).toBeUndefined();
		expect(body["review"]).toBeUndefined();
		expect(close).toHaveBeenCalledWith("saved");
	});

	it("shows the API error and keeps the modal open when the creation fails", async () => {
		createResponse = req =>
			req.flush(
				{
					type: "QUEUE_LIMIT_REACHED",
					title: "Queue limit reached for free users"
				},
				{ status: 402, statusText: "Payment Required" }
			);
		await renderModal({ preselectAddToQueue: true });

		await submit();

		expect(
			await screen.findByText("Queue limit reached for free users")
		).toBeInTheDocument();
		expect(writes).toHaveLength(1);
		expect(close).not.toHaveBeenCalled();
		expect(addButton()).toBeEnabled();
	});
});
