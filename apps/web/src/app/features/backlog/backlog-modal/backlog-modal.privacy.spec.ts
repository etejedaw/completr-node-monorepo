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
import { type BacklogEntry, type Game } from "../../../core/models";
import { BacklogModal } from "./backlog-modal";
import { type BacklogModalData } from "./backlog-modal.model";

const api = environment.apiUrl;
const backlogUrl = `${api}/users/me/backlog`;

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
} as Game;

function buildEntry(isPublic: boolean): BacklogEntry {
	return {
		id: "b1",
		status: "playing",
		score: 4.5,
		duration: 20,
		isPublic,
		game: {
			id: "g1",
			code: "hades",
			title: "Hades",
			backgroundUrl: null
		},
		platform: { id: "p1", name: "PC", code: "pc" },
		platinum: null
	} as unknown as BacklogEntry;
}

describe("BacklogModal run privacy", () => {
	let httpTesting: HttpTestingController;
	let close: ReturnType<typeof vi.fn>;
	const writes: { method: string; url: string; body: unknown }[] = [];

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (method !== "GET") {
			writes.push({ method, url, body });
			if (method === "POST" && url === backlogUrl)
				return req.flush(
					{ data: { backlog: { id: "b1" } } },
					{ status: 201, statusText: "Created" }
				);
			return req.flush({ data: { backlog: { id: "b1" } } });
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
		if (url.endsWith("/mood-tags"))
			return req.flush({ data: { tags: [] } });
		if (url.endsWith("/progress"))
			return req.flush({ data: { progress: [] } });
		if (url.endsWith("/coop")) return req.flush({ data: { members: [] } });
		if (url.endsWith("/reviews"))
			return req.flush({ data: { reviews: [] } });
		if (url === `${api}/users/me/queue`)
			return req.flush({ data: { queue: [] } });
		if (url === `${api}/games/hades`)
			return req.flush({
				data: { game: { ...hades, userPlatinum: null } }
			});
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

	async function renderModal(data: Partial<BacklogModalData>) {
		await render(BacklogModal, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: NgpDialogRef,
					useValue: {
						data: {
							entry: null,
							preselectedGame: null,
							preselectedCompilationParent: null,
							preselectAddToQueue: false,
							...data
						},
						close
					}
				}
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		answerPending();
	}

	async function renderEditModal(entry: BacklogEntry) {
		await renderModal({ entry });
		await userEvent.click(
			await screen.findByRole("button", { name: /^edit$/i })
		);
		answerPending();
	}

	async function submit(name: "Add" | "Save") {
		await waitFor(() => {
			answerPending();
			expect(screen.getByRole("button", { name })).toBeEnabled();
		});
		await userEvent.click(screen.getByRole("button", { name }));
		await waitFor(() => {
			answerPending();
			expect(close).toHaveBeenCalledWith("saved");
		});
	}

	function sentBody(method: "POST" | "PATCH") {
		const write = writes.find(w => w.method === method);
		return write?.body as Record<string, unknown> | undefined;
	}

	beforeEach(() => {
		writes.length = 0;
		close = vi.fn();
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

	it("creates a public run by default", async () => {
		await renderModal({ preselectedGame: hades });

		expect(
			screen.getByRole("switch", { name: "Public run" })
		).toBeChecked();
		await submit("Add");

		expect(sentBody("POST")).toEqual(
			expect.objectContaining({ isPublic: true })
		);
	});

	it("creates a private run when the switch is turned off, even after toggling back and forth", async () => {
		await renderModal({ preselectedGame: hades });
		const toggle = screen.getByRole("switch", { name: "Public run" });

		await userEvent.click(toggle);
		await userEvent.click(toggle);
		await userEvent.click(toggle);

		expect(toggle).not.toBeChecked();
		expect(
			screen.getByText("Only you can see this run")
		).toBeInTheDocument();
		await submit("Add");

		expect(sentBody("POST")).toEqual(
			expect.objectContaining({ isPublic: false })
		);
	});

	it("loads a private run with the switch off and saves it as public when turned on", async () => {
		await renderEditModal(buildEntry(false));
		const toggle = screen.getByRole("switch", { name: "Public run" });

		expect(toggle).not.toBeChecked();
		await userEvent.click(toggle);
		await submit("Save");

		expect(sentBody("PATCH")).toEqual(
			expect.objectContaining({ isPublic: true })
		);
	});

	it("keeps the privacy of the run when saving without touching it", async () => {
		await renderEditModal(buildEntry(false));

		await submit("Save");

		expect(sentBody("PATCH")).toEqual(
			expect.objectContaining({ isPublic: false })
		);
	});

	it("marks a private run with a lock and its visibility in the run summary", async () => {
		await renderModal({ entry: buildEntry(false) });

		expect(
			await screen.findByRole("img", {
				name: "Private run: only you can see it"
			})
		).toBeInTheDocument();
		expect(screen.getByText("Visibility")).toBeInTheDocument();
		expect(screen.getByText("Private · only you")).toBeInTheDocument();
	});

	it("shows a public run as public without the lock in the run summary", async () => {
		await renderModal({ entry: buildEntry(true) });

		expect(await screen.findByText("Public")).toBeInTheDocument();
		expect(
			screen.queryByRole("img", {
				name: "Private run: only you can see it"
			})
		).not.toBeInTheDocument();
	});
});
