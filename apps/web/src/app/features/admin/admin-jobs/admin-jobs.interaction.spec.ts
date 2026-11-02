import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastService } from "../../../core/services/toast";
import { type JobEntry } from "../services/jobs.model";
import { AdminJobs } from "./admin-jobs";

const api = environment.apiUrl;

const job = (overrides: Partial<JobEntry> & { id: string }): JobEntry => ({
	type: "calculate_ratings",
	status: "completed",
	createdAt: "2026-03-01T10:00:00Z",
	...overrides
});

describe("AdminJobs interaction", () => {
	let httpTesting: HttpTestingController;
	let jobs: JobEntry[];
	let starts: string[];
	let cancels: string[];
	let failures: Record<string, { status: number; body?: object }>;
	let heldLoads: TestRequest[];
	let holdLoads: boolean;
	let holdStarts: boolean;
	let holdCancels: boolean;
	let heldCancels: TestRequest[];
	let toastWarning: ReturnType<typeof vi.fn<(message: string) => void>>;
	let heldStarts: TestRequest[];
	let nextId: number;
	let unexpectedRequests: string[];

	function fail(req: TestRequest, status: number, body: object = {}) {
		req.flush(body, { status, statusText: "err" });
	}

	function startResponse(req: TestRequest) {
		const type = req.request.url.split("/").pop()!.split("?")[0];
		const created = job({
			id: `j${nextId++}`,
			type: type.replace(/-/g, "_"),
			status: "running"
		});
		jobs = [created, ...jobs];
		starts.push(req.request.urlWithParams.replace(api, ""));
		req.flush(
			{ data: { job: created } },
			{ status: 201, statusText: "OK" }
		);
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		const key = `${method} ${url.replace(api, "")}`;
		const failure = failures[key];
		if (method === "GET" && url === `${api}/admin/jobs`) {
			if (holdLoads) return void heldLoads.push(req);
			if (failure) return fail(req, failure.status, failure.body);
			return req.flush({ data: { jobs } });
		}
		if (method === "POST" && url.startsWith(`${api}/admin/jobs/`)) {
			if (holdStarts) return void heldStarts.push(req);
			if (failure) return fail(req, failure.status, failure.body);
			return startResponse(req);
		}
		if (method === "DELETE" && url.startsWith(`${api}/admin/jobs/`)) {
			if (holdCancels) return void heldCancels.push(req);
			if (failure) return fail(req, failure.status, failure.body);
			const id = url.split("/").pop()!;
			cancels.push(id);
			jobs = jobs.map(j =>
				j.id === id ? { ...j, status: "failed" } : j
			);
			return req.flush(null, { status: 204, statusText: "No Content" });
		}
		unexpectedRequests.push(`${method} ${url}`);
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

	async function renderJobs() {
		await render(AdminJobs, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: { warning: toastWarning } }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
	}

	async function renderLoaded() {
		await renderJobs();
		await untilVisible(() =>
			expect(screen.queryByLabelText("Loading jobs")).toBeNull()
		);
	}

	function desktopTable() {
		return screen.getByRole("table");
	}

	function mobileList() {
		return screen.getByRole("list");
	}

	function runJobButton() {
		return screen.getByRole("button", { name: "Run job" });
	}

	async function jobItem(name: string) {
		const open = screen.queryByRole("menu", { name: "Run a job" });
		if (!open || open.hasAttribute("data-exit")) {
			await waitFor(() =>
				expect(screen.queryByRole("menu")).not.toBeInTheDocument()
			);
			await userEvent.click(runJobButton());
		}
		const menu = await screen.findByRole("menu", { name: "Run a job" });
		return within(menu).getByRole("menuitem", { name });
	}

	async function startJob(name: string) {
		await userEvent.click(await jobItem(name));
	}

	async function expectJobBlocked(name: string) {
		expect(await jobItem(name)).toBeDisabled();
	}

	function expectNoJobStarting() {
		expect(runJobButton()).not.toHaveAttribute("aria-busy");
	}

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		jobs = [
			job({
				id: "j1",
				type: "populate_rawg",
				status: "running",
				result: "12 games updated"
			}),
			job({
				id: "j2",
				type: "calculate_ratings",
				status: "completed",
				completedAt: "2026-03-01T10:05:00Z"
			})
		];
		starts = [];
		cancels = [];
		failures = {};
		heldLoads = [];
		heldStarts = [];
		heldCancels = [];
		holdCancels = false;
		toastWarning = vi.fn();
		holdLoads = false;
		holdStarts = false;
		nextId = 10;
		unexpectedRequests = [];
	});

	afterEach(() => {
		if (httpTesting) {
			holdLoads = false;
			holdStarts = false;
			holdCancels = false;
			answerPending();
			httpTesting.verify();
		}
		expect(unexpectedRequests).toEqual([]);
		vi.unstubAllGlobals();
	});

	it("lists the recorded jobs with their status and result", async () => {
		await renderLoaded();

		const rows = within(desktopTable()).getAllByRole("row");
		expect(rows).toHaveLength(3);
		expect(within(rows[1]).getByText("populate_rawg")).toBeInTheDocument();
		expect(within(rows[1]).getByText("running")).toBeInTheDocument();
		expect(
			within(rows[1]).getByText("12 games updated")
		).toBeInTheDocument();
		expect(within(rows[2]).getByText("completed")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("shows the empty state when no job has run and the singular label for one job", async () => {
		jobs = [];
		await renderLoaded();
		expect(
			screen.getByText("No jobs have been run yet")
		).toBeInTheDocument();

		jobs = [job({ id: "only" })];
		await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
		await untilVisible(() =>
			expect(
				screen.getByText(/job recorded|jobs recorded/)
			).toHaveTextContent(/^1\s+job\s+recorded$/)
		);
	});

	it("renders an unknown status and a missing result without breaking the row", async () => {
		jobs = [
			job({ id: "x1", status: "queued", result: undefined }),
			job({
				id: "x2",
				status: "exploded",
				result: "💥 ünïcode ".repeat(60)
			})
		];
		await renderLoaded();

		expect(within(desktopTable()).getByText("queued")).toBeInTheDocument();
		expect(
			within(desktopTable()).getByText("exploded")
		).toBeInTheDocument();
		expect(
			within(desktopTable()).queryByRole("button", { name: "Cancel" })
		).toBeNull();
		expect(within(desktopTable()).getAllByText("-").length).toBeGreaterThan(
			0
		);
	});

	it("sends a single start request when a job is picked three times in a row", async () => {
		await renderLoaded();
		holdStarts = true;

		await userEvent.tripleClick(await jobItem("Calculate Ratings"));
		answerPending();
		await userEvent.click(await jobItem("Calculate Ratings"));
		answerPending();

		expect(heldStarts).toHaveLength(1);
		expect(runJobButton()).toHaveAttribute("aria-busy", "true");

		holdStarts = false;
		startResponse(heldStarts[0]);
		await untilVisible(() => expectNoJobStarting());
		expect(starts).toEqual(["/admin/jobs/calculate-ratings"]);
	});

	it("blocks every other job button while one is starting", async () => {
		await renderLoaded();
		holdStarts = true;

		await startJob("Calculate Ratings");
		answerPending();

		await expectJobBlocked("Populate RAWG IDs");
		await expectJobBlocked("Calculate Durations");
		await userEvent.click(await jobItem("Populate RAWG IDs"));
		await userEvent.click(await jobItem("Calculate Durations"));
		answerPending();
		expect(heldStarts).toHaveLength(1);

		holdStarts = false;
		startResponse(heldStarts[0]);
		await untilVisible(() => expectNoJobStarting());
		expect(await jobItem("Populate RAWG IDs")).toBeEnabled();
	});

	it("asks the server for a limit of 2 when populating RAWG IDs", async () => {
		await renderLoaded();

		await startJob("Populate RAWG IDs");
		await untilVisible(() => expect(starts).toHaveLength(1));

		expect(starts).toEqual(["/admin/jobs/populate-rawg?limit=2"]);
	});

	describe("filling missing Metacritic and HLTB data", () => {
		const label = "Fill missing Metacritic & HLTB";

		it("starts the full run without a hidden limit and shows the new job after reloading", async () => {
			await renderLoaded();

			await startJob(label);

			await untilVisible(() =>
				expect(
					within(desktopTable()).getByText("populate_external_data")
				).toBeInTheDocument()
			);
			expect(starts).toEqual(["/admin/jobs/populate-external-data"]);
			expect(
				within(mobileList()).getByText("populate_external_data")
			).toBeInTheDocument();
		});

		it("sends a single request on a triple click and blocks the other jobs while starting", async () => {
			await renderLoaded();
			holdStarts = true;

			await userEvent.tripleClick(await jobItem(label));
			answerPending();

			expect(heldStarts).toHaveLength(1);
			expect(runJobButton()).toHaveAttribute("aria-busy", "true");
			await expectJobBlocked("Populate RAWG IDs");
			await expectJobBlocked("Calculate Ratings");
			await userEvent.click(await jobItem("Calculate Ratings"));
			answerPending();
			expect(heldStarts).toHaveLength(1);

			holdStarts = false;
			startResponse(heldStarts[0]);
			await untilVisible(() => expectNoJobStarting());
			expect(starts).toEqual(["/admin/jobs/populate-external-data"]);
		});

		it("shows the readable result of a finished run in the history", async () => {
			jobs = [
				job({
					id: "ext1",
					type: "populate_external_data",
					status: "completed",
					result: "Metacritic: 4 updated, 1 not found · HLTB: 2 updated",
					completedAt: "2026-03-01T10:30:00Z"
				})
			];
			await renderLoaded();

			expect(
				within(desktopTable()).getByText(
					"Metacritic: 4 updated, 1 not found · HLTB: 2 updated"
				)
			).toBeInTheDocument();
			expect(
				within(mobileList()).getByText(
					"Metacritic: 4 updated, 1 not found · HLTB: 2 updated"
				)
			).toBeInTheDocument();
		});

		it("re-enables the button after a conflict and starts on the retry", async () => {
			await renderLoaded();
			failures["POST /admin/jobs/populate-external-data"] = {
				status: 409,
				body: { type: "JOB_ALREADY_RUNNING" }
			};

			await startJob(label);
			await untilVisible(() => expectNoJobStarting());
			expect(starts).toEqual([]);

			delete failures["POST /admin/jobs/populate-external-data"];
			await startJob(label);
			await untilVisible(() => expect(starts).toHaveLength(1));
			expect(starts).toEqual(["/admin/jobs/populate-external-data"]);
		});
	});

	it("reloads the list after a job starts and shows the new running job", async () => {
		await renderLoaded();

		await startJob("Calculate Durations");

		await untilVisible(() =>
			expect(
				within(desktopTable()).getByText("calculate_durations")
			).toBeInTheDocument()
		);
		expect(
			within(desktopTable()).getAllByRole("button", { name: "Cancel" })
		).toHaveLength(2);
	});

	it.each([
		["a 500", 500],
		["a 409 conflict", 409],
		["a 422", 422],
		["a network error", 0]
	])(
		"re-enables the buttons and lets the admin retry after %s on start",
		async (_label, status) => {
			await renderLoaded();
			failures["POST /admin/jobs/calculate-ratings"] = {
				status,
				body: { type: "JOB_ALREADY_RUNNING" }
			};

			await startJob("Calculate Ratings");
			await untilVisible(() => expectNoJobStarting());
			expect(starts).toEqual([]);
			expect(
				within(desktopTable()).queryByText("calculate_ratings", {
					selector: "td"
				})
			).toBeInTheDocument();

			delete failures["POST /admin/jobs/calculate-ratings"];
			await startJob("Calculate Ratings");
			await untilVisible(() => expect(starts).toHaveLength(1));
		}
	);

	it("shows the load error when the list cannot be reloaded after starting a job", async () => {
		await renderLoaded();
		await startJob("Calculate Ratings");
		await untilVisible(() => expect(starts).toHaveLength(1));
		failures["GET /admin/jobs"] = { status: 500 };
		await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't load the jobs")
			).toBeInTheDocument()
		);
		expectNoJobStarting();
		expect(runJobButton()).toBeEnabled();
	});

	it("disables Refresh while the list is loading so repeated clicks send one request", async () => {
		await renderLoaded();
		holdLoads = true;
		const refresh = screen.getByRole("button", { name: "Refresh" });

		await userEvent.tripleClick(refresh);
		answerPending();

		expect(heldLoads).toHaveLength(1);
		expect(refresh).toBeDisabled();
		expect(screen.getByLabelText("Loading jobs")).toHaveAttribute(
			"aria-busy",
			"true"
		);

		holdLoads = false;
		heldLoads[0].flush({ data: { jobs } });
		await waitFor(() => expect(refresh).toBeEnabled());
	});

	it.each([
		["a 500", 500],
		["a 404", 404],
		["a network error", 0]
	])(
		"recovers with Try again after %s while loading",
		async (_label, status) => {
			failures["GET /admin/jobs"] = { status };
			await renderJobs();
			await untilVisible(() =>
				expect(
					screen.getByText("Couldn't load the jobs")
				).toBeInTheDocument()
			);

			delete failures["GET /admin/jobs"];
			holdLoads = true;
			await userEvent.tripleClick(
				screen.getByRole("button", { name: "Try again" })
			);
			answerPending();
			expect(heldLoads).toHaveLength(1);

			holdLoads = false;
			heldLoads[0].flush({ data: { jobs } });
			await waitFor(() =>
				expect(
					within(desktopTable()).getByText("populate_rawg")
				).toBeInTheDocument()
			);
			expect(screen.queryByText("Couldn't load the jobs")).toBeNull();
		}
	);

	it("fails again on Try again and keeps offering the retry", async () => {
		failures["GET /admin/jobs"] = { status: 500 };
		await renderJobs();
		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't load the jobs")
			).toBeInTheDocument()
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Try again" })
		);
		await untilVisible(() =>
			expect(
				screen.getByRole("button", { name: "Try again" })
			).toBeInTheDocument()
		);
	});

	it("cancels a running job and reloads the list", async () => {
		await renderLoaded();

		await userEvent.click(
			within(desktopTable()).getByRole("button", { name: "Cancel" })
		);
		await untilVisible(() => expect(cancels).toEqual(["j1"]));
		await untilVisible(() =>
			expect(
				within(desktopTable()).queryByRole("button", { name: "Cancel" })
			).toBeNull()
		);
	});

	it("cancels from the mobile card the same way as from the table", async () => {
		await renderLoaded();

		await userEvent.click(
			within(mobileList()).getByRole("button", { name: "Cancel" })
		);
		await untilVisible(() => expect(cancels).toEqual(["j1"]));
	});

	it("sends a single DELETE when Cancel is clicked three times before the server answers", async () => {
		await renderLoaded();
		holdCancels = true;
		const cancel = within(desktopTable()).getByRole("button", {
			name: "Cancel"
		});

		await userEvent.tripleClick(cancel);
		answerPending();

		expect(heldCancels).toHaveLength(1);
		expect(cancel).toBeDisabled();
		expect(cancel).toHaveAttribute("aria-busy", "true");
	});

	it.each([
		["a 404", 404],
		["a 500", 500],
		["a network error", 0]
	])(
		"warns the admin and keeps the page usable when cancelling fails with %s",
		async (_label, status) => {
			await renderLoaded();
			failures["DELETE /admin/jobs/j1"] = { status };

			await userEvent.click(
				within(desktopTable()).getByRole("button", { name: "Cancel" })
			);
			await untilVisible(() =>
				expect(toastWarning).toHaveBeenCalledTimes(1)
			);

			expect(toastWarning).toHaveBeenCalledWith(
				"Couldn't cancel the job. It may have already finished."
			);
			expect(
				within(desktopTable()).getByRole("button", { name: "Cancel" })
			).toBeEnabled();

			delete failures["DELETE /admin/jobs/j1"];
			await userEvent.click(
				within(desktopTable()).getByRole("button", { name: "Cancel" })
			);
			await untilVisible(() => expect(cancels).toEqual(["j1"]));
		}
	);

	it("keeps the newest job list when an older reload answers after a newer one", async () => {
		await renderLoaded();
		holdLoads = true;

		await startJob("Calculate Ratings");
		answerPending();
		await startJob("Calculate Durations");
		answerPending();
		expect(heldLoads).toHaveLength(2);

		const afterFirst = [jobs.find(j => j.type === "calculate_ratings")!];
		const afterBoth = jobs;
		holdLoads = false;
		heldLoads[1].flush({ data: { jobs: afterBoth } });
		if (!heldLoads[0].cancelled)
			heldLoads[0].flush({ data: { jobs: afterFirst } });
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(screen.getByText(/jobs? recorded/)).toHaveTextContent(
			/^4\s+jobs\s+recorded$/
		);
	});

	it("activates Refresh and Run job from the keyboard", async () => {
		await renderLoaded();
		await userEvent.tab();
		expect(screen.getByRole("button", { name: "Refresh" })).toHaveFocus();

		holdLoads = true;
		await userEvent.keyboard("{Enter}");
		answerPending();
		expect(heldLoads).toHaveLength(1);
		holdLoads = false;
		heldLoads[0].flush({ data: { jobs } });
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Refresh" })
			).toBeEnabled()
		);

		runJobButton().focus();
		await userEvent.keyboard(" ");
		const menu = await screen.findByRole("menu", { name: "Run a job" });
		await waitFor(() =>
			expect(
				within(menu).getByRole("menuitem", {
					name: "Populate RAWG IDs"
				})
			).toHaveFocus()
		);
		await userEvent.keyboard("{Enter}");
		await untilVisible(() => expect(starts).toHaveLength(1));
		expect(starts).toEqual(["/admin/jobs/populate-rawg?limit=2"]);
	});

	it("reaches every action by Tab in a sensible order", async () => {
		await renderLoaded();

		const order: string[] = [];
		for (let i = 0; i < 3; i++) {
			await userEvent.tab();
			const active = document.activeElement;
			order.push(
				active?.getAttribute("aria-label") ??
					active?.textContent?.trim() ??
					""
			);
		}

		expect(order).toEqual([
			"Refresh",
			expect.stringContaining("Run job"),
			"Cancel"
		]);
	});

	it("keeps icon glyphs out of the accessible names of the buttons", async () => {
		await renderLoaded();

		expect(
			screen.getByRole("button", { name: "Refresh" })
		).toBeInTheDocument();
		expect(runJobButton()).toBeInTheDocument();
		for (const name of [
			"Populate RAWG IDs",
			"Fill missing Metacritic & HLTB",
			"Calculate Ratings",
			"Calculate Durations"
		]) {
			expect(await jobItem(name)).toBeInTheDocument();
		}
	});
});
