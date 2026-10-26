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
import {
	type BacklogEntry,
	type BacklogStatus,
	type GamePlatinum
} from "../../../core/models";
import { BacklogModal, type BacklogModalData } from "./backlog-modal";

const api = environment.apiUrl;
const platinumUrl = `${api}/users/me/games/g1/platinum`;

function buildEntry(
	status: BacklogStatus,
	platinum: GamePlatinum | null
): BacklogEntry {
	return {
		id: "b1",
		status,
		score: 4.5,
		duration: 7,
		isPublic: true,
		finishedAt: "2026-03-10T00:00:00.000Z",
		game: {
			id: "g1",
			code: "gears-of-war",
			title: "Gears of War",
			backgroundUrl: null
		},
		platform: { id: "p1", name: "Xbox 360", code: "x360" },
		platinum
	} as unknown as BacklogEntry;
}

function platinumIn(backlogId: string | null): GamePlatinum {
	return {
		id: "pl1",
		backlogId,
		platformId: "p1",
		platinumedAt: "2026-03-12",
		notes: "Insane run"
	};
}

describe("BacklogModal platinum", () => {
	let httpTesting: HttpTestingController;
	let close: ReturnType<typeof vi.fn>;
	let userPlatinum: GamePlatinum | null;
	const writes: { method: string; url: string; body: unknown }[] = [];

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (method !== "GET") {
			writes.push({ method, url, body });
			if (method === "PATCH")
				return req.flush({ data: { backlog: { id: "b1" } } });
			if (method === "DELETE")
				return req.flush(null, {
					status: 204,
					statusText: "No Content"
				});
			return req.flush({ data: { platinum: platinumIn("b1") } });
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
		if (url === `${api}/games/gears-of-war`)
			return req.flush({
				data: {
					game: {
						id: "g1",
						code: "gears-of-war",
						title: "Gears of War",
						platforms: [],
						genres: [],
						scores: [],
						times: [],
						userPlatinum
					}
				}
			});
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	async function renderEditModal(entry: BacklogEntry) {
		await renderSummary(entry);
		await userEvent.click(
			await screen.findByRole("button", { name: /^edit$/i })
		);
		answerPending();
	}

	async function renderSummary(entry: BacklogEntry) {
		const data: BacklogModalData = {
			entry,
			preselectedGame: null,
			preselectedCompilationParent: null,
			preselectAddToQueue: false
		};
		await render(BacklogModal, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: NgpDialogRef, useValue: { data, close } }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		answerPending();
	}

	async function save() {
		await userEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => {
			answerPending();
			expect(close).toHaveBeenCalledWith("saved");
		});
	}

	function platinumWrites() {
		return writes.filter(write => write.url === platinumUrl);
	}

	beforeEach(() => {
		writes.length = 0;
		close = vi.fn();
		userPlatinum = null;
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

	it("marks a completed run as platinumed with the finished date by default", async () => {
		await renderEditModal(buildEntry("completed", null));

		await userEvent.click(
			screen.getByRole("switch", { name: "Platinumed in this run" })
		);
		expect(screen.getByLabelText("Platinumed on")).toHaveValue(
			"2026-03-10"
		);
		await save();

		expect(platinumWrites()).toEqual([
			{
				method: "PUT",
				url: platinumUrl,
				body: {
					backlogId: "b1",
					platinumedAt: "2026-03-10",
					notes: null
				}
			}
		]);
	});

	it("hides the platinum section while the run is not completed", async () => {
		await renderEditModal(buildEntry("playing", null));

		expect(
			screen.queryByRole("switch", { name: "Platinumed in this run" })
		).not.toBeInTheDocument();
	});

	it("shows the run platinum as checked and removes it when unchecked", async () => {
		userPlatinum = platinumIn("b1");
		await renderEditModal(buildEntry("completed", platinumIn("b1")));

		const toggle = screen.getByRole("switch", {
			name: "Platinumed in this run"
		});
		expect(toggle).toBeChecked();
		expect(screen.getByLabelText("Platinumed on")).toHaveValue(
			"2026-03-12"
		);

		await userEvent.click(toggle);
		await save();

		expect(platinumWrites()).toEqual([
			{ method: "DELETE", url: platinumUrl, body: null }
		]);
	});

	it("does not write the platinum when nothing changed", async () => {
		userPlatinum = platinumIn("b1");
		await renderEditModal(buildEntry("completed", platinumIn("b1")));

		await save();

		expect(platinumWrites()).toEqual([]);
	});

	it("moves a platinum from another run to this one keeping its notes", async () => {
		userPlatinum = platinumIn("b0");
		await renderEditModal(buildEntry("completed", platinumIn("b0")));

		expect(
			screen.getByText(/Platinumed in another run/)
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("switch", {
				name: "Move the platinum to this run"
			})
		);
		await save();

		expect(platinumWrites()).toEqual([
			{
				method: "PUT",
				url: platinumUrl,
				body: {
					backlogId: "b1",
					platinumedAt: "2026-03-10",
					notes: "Insane run"
				}
			}
		]);
	});

	it("uses the game detail platinum when the entry does not carry one", async () => {
		userPlatinum = platinumIn("b0");
		const entry = buildEntry("completed", null);
		delete entry.platinum;
		await renderEditModal(entry);

		expect(
			screen.getByText(/Platinumed in another run/)
		).toBeInTheDocument();
	});

	it("shows the run trophy and the platinum date in the run preview", async () => {
		userPlatinum = platinumIn("b1");
		await renderSummary(buildEntry("completed", platinumIn("b1")));

		expect(
			await screen.findByRole("img", {
				name: "Platinumed in this run on Mar 12, 2026"
			})
		).toBeInTheDocument();
		expect(screen.getByText("This run · Mar 12, 2026")).toBeInTheDocument();
	});

	it("shows the game trophy in the preview of another run", async () => {
		userPlatinum = platinumIn("b0");
		await renderSummary(buildEntry("completed", platinumIn("b0")));

		expect(
			await screen.findByRole("img", { name: "Platinumed" })
		).toBeInTheDocument();
		expect(
			screen.getByText("Another run · Mar 12, 2026")
		).toBeInTheDocument();
	});
});
