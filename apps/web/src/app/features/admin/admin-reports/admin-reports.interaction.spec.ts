import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter
} from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastService } from "../../../core/services/toast";
import { AdminReports } from "./admin-reports";

const api = environment.apiUrl;
const toast = { success: vi.fn(), warning: vi.fn() };
const REPORTS_URL = `${api}/admin/game-reports`;

function makeReport(
	id: string,
	gameId: string,
	title: string,
	message: string
) {
	return {
		id,
		gameId,
		userId: `user-${id}`,
		message,
		status: "pending",
		createdAt: "2026-03-01T10:00:00.000Z",
		updatedAt: "2026-03-01T10:00:00.000Z",
		Game: { id: gameId, title, code: `${title.toLowerCase()}-code` },
		User: { id: `user-${id}`, username: `reporter-${id}` }
	};
}

const REPORTS = [
	makeReport("r1", "g1", "Celeste", "Wrong cover"),
	makeReport("r2", "g2", "Hades", "Duplicated entry"),
	makeReport("r3", "g1", "Celeste", "Wrong duration")
];

describe("Admin reports interaction", () => {
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		toast.success.mockReset();
		toast.warning.mockReset();
	});

	async function renderReports(gameId: string | null = null) {
		const view = await render(AdminReports, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: ToastService, useValue: toast },
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							queryParamMap: convertToParamMap(
								gameId ? { gameId } : {}
							)
						}
					}
				}
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return view;
	}

	function listRequests() {
		return httpTesting.match(
			req => req.url === REPORTS_URL && req.method === "GET"
		);
	}

	function patchRequests() {
		return httpTesting.match(
			req =>
				req.url.startsWith(`${REPORTS_URL}/`) && req.method === "PATCH"
		);
	}

	function flushList(request: TestRequest, reports = REPORTS) {
		request.flush({ data: { reports } });
	}

	async function renderLoaded(
		reports = REPORTS,
		gameId: string | null = null
	) {
		const view = await renderReports(gameId);
		const [first] = listRequests();
		flushList(first!, reports);
		await screen.findByRole("list");
		return view;
	}

	afterEach(() => {
		httpTesting
			.match(() => true)
			.forEach(req => {
				if (!req.cancelled) req.flush(null);
			});
	});

	it("lists the reports and counts them in the subtitle", async () => {
		await renderLoaded();
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		expect(
			screen.getByText(/reports waiting for review/)
		).toBeInTheDocument();
	});

	it("singularizes the subtitle when only one report is left", async () => {
		await renderLoaded([REPORTS[0]!]);
		expect(
			screen.getByText(/report waiting for review/)
		).toBeInTheDocument();
		expect(screen.queryByText(/reports waiting/)).not.toBeInTheDocument();
	});

	it("shows skeleton rows while loading and disables Refresh", async () => {
		await renderReports();
		expect(screen.getByLabelText("Loading reports")).toHaveAttribute(
			"aria-busy",
			"true"
		);
		expect(screen.getByRole("button", { name: /Refresh/ })).toBeDisabled();
	});

	it("shows the empty state when nothing is pending", async () => {
		const view = await renderReports();
		flushList(listRequests()[0]!, []);
		expect(
			await screen.findByText("No pending reports")
		).toBeInTheDocument();
		view.fixture.detectChanges();
	});

	it("approves a report and removes only that card", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const second = screen.getAllByRole("listitem")[1]!;
		await user.click(
			within(second).getByRole("button", { name: /Approve/ })
		);

		const [patch] = patchRequests();
		expect(patch!.request.url).toBe(`${REPORTS_URL}/r2`);
		expect(patch!.request.body).toEqual({ status: "approved" });
		patch!.flush({
			data: { report: { ...REPORTS[1], status: "approved" } }
		});

		await waitFor(() =>
			expect(screen.getAllByRole("listitem")).toHaveLength(2)
		);
		expect(screen.queryByText("Duplicated entry")).not.toBeInTheDocument();
		expect(screen.getByText("Wrong cover")).toBeInTheDocument();
	});

	it("rejects a report with the rejected status", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const first = screen.getAllByRole("listitem")[0]!;
		await user.click(within(first).getByRole("button", { name: /Reject/ }));

		const [patch] = patchRequests();
		expect(patch!.request.url).toBe(`${REPORTS_URL}/r1`);
		expect(patch!.request.body).toEqual({ status: "rejected" });
		patch!.flush({
			data: { report: { ...REPORTS[0], status: "rejected" } }
		});

		await waitFor(() =>
			expect(screen.queryByText("Wrong cover")).not.toBeInTheDocument()
		);
	});

	it("shows the last report's empty state after resolving every card", async () => {
		const user = userEvent.setup();
		await renderLoaded([REPORTS[0]!]);

		await user.click(screen.getByRole("button", { name: /Approve/ }));
		patchRequests()[0]!.flush({ data: { report: REPORTS[0] } });

		expect(
			await screen.findByText("No pending reports")
		).toBeInTheDocument();
	});

	it("sends a single PATCH when Approve is double or triple clicked while the request is pending", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const first = screen.getAllByRole("listitem")[0]!;
		await user.tripleClick(
			within(first).getByRole("button", { name: /Approve/ })
		);

		expect(patchRequests()).toHaveLength(1);
	});

	it("disables Approve and Reject on a card while its request is in flight so they cannot contradict each other", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const items = screen.getAllByRole("listitem");
		await user.click(
			within(items[0]!).getByRole("button", { name: /Approve/ })
		);
		expect(
			within(items[0]!).getByRole("button", { name: /Approve/ })
		).toBeDisabled();
		expect(
			within(items[0]!).getByRole("button", { name: /Reject/ })
		).toBeDisabled();
		await user.click(
			within(items[0]!).getByRole("button", { name: /Reject/ })
		);
		expect(patchRequests()).toHaveLength(1);
		expect(
			within(items[1]!).getByRole("button", { name: /Approve/ })
		).toBeEnabled();
	});

	it.each([
		["500", () => ({ status: 500 })],
		["404", () => ({ status: 404 })],
		["network", () => ({ status: 0 })]
	])(
		"surfaces a failed Approve or Reject (%s) as a warning and keeps the card",
		async (_label, make) => {
			const user = userEvent.setup();
			await renderLoaded();

			const first = screen.getAllByRole("listitem")[0]!;
			await user.click(
				within(first).getByRole("button", { name: /Reject/ })
			);
			const { status } = make();
			const [request] = patchRequests();
			if (status === 0) request!.error(new ProgressEvent("error"));
			else request!.flush(null, { status, statusText: "Error" });

			expect(toast.warning).toHaveBeenCalledWith(
				"Could not update the report."
			);
			expect(screen.getAllByRole("listitem")).toHaveLength(3);
			await waitFor(() =>
				expect(
					within(first).getByRole("button", { name: /Reject/ })
				).toBeEnabled()
			);

			await user.click(
				within(first).getByRole("button", { name: /Approve/ })
			);
			patchRequests()[0]!.flush({ data: { report: REPORTS[0] } });
			await waitFor(() =>
				expect(screen.getAllByRole("listitem")).toHaveLength(2)
			);
		}
	);

	it("resolving different cards back to back removes both", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const items = screen.getAllByRole("listitem");
		await user.click(
			within(items[0]!).getByRole("button", { name: /Approve/ })
		);
		await user.click(
			within(items[1]!).getByRole("button", { name: /Reject/ })
		);

		const patches = patchRequests();
		expect(patches.map(p => p.request.url)).toEqual([
			`${REPORTS_URL}/r1`,
			`${REPORTS_URL}/r2`
		]);
		patches[1]!.flush({ data: { report: REPORTS[1] } });
		patches[0]!.flush({ data: { report: REPORTS[0] } });

		await waitFor(() =>
			expect(screen.getAllByRole("listitem")).toHaveLength(1)
		);
		expect(screen.getByText("Wrong duration")).toBeInTheDocument();
	});

	it("shows the error state on a 500 and recovers with Try again", async () => {
		const user = userEvent.setup();
		await renderReports();
		listRequests()[0]!.flush(null, {
			status: 500,
			statusText: "Server Error"
		});

		expect(
			await screen.findByText("Couldn't load reports")
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Try again" }));
		expect(screen.getByLabelText("Loading reports")).toBeInTheDocument();

		flushList(listRequests()[0]!);
		expect(await screen.findAllByRole("listitem")).toHaveLength(3);
		expect(
			screen.queryByText("Couldn't load reports")
		).not.toBeInTheDocument();
	});

	it("shows the error state on a network failure (status 0)", async () => {
		await renderReports();
		listRequests()[0]!.error(new ProgressEvent("error"), { status: 0 });
		expect(
			await screen.findByText("Couldn't load reports")
		).toBeInTheDocument();
	});

	it("fails again on Try again and stays on the error state", async () => {
		const user = userEvent.setup();
		await renderReports();
		listRequests()[0]!.flush(null, {
			status: 500,
			statusText: "Server Error"
		});
		await user.click(
			await screen.findByRole("button", { name: "Try again" })
		);
		listRequests()[0]!.flush(null, {
			status: 503,
			statusText: "Unavailable"
		});

		expect(
			await screen.findByText("Couldn't load reports")
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
	});

	it("does not fire a second list request when Refresh is clicked repeatedly", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const refresh = screen.getByRole("button", { name: /Refresh/ });
		await user.tripleClick(refresh);

		expect(listRequests()).toHaveLength(1);
	});

	it("keeps the list in place of the skeleton only after the refresh answers", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		await user.click(screen.getByRole("button", { name: /Refresh/ }));
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		flushList(listRequests()[0]!, [REPORTS[1]!]);

		expect(await screen.findAllByRole("listitem")).toHaveLength(1);
		expect(screen.getByRole("button", { name: /Refresh/ })).toBeEnabled();
	});

	it("shows a refreshed list that no longer contains a report resolved elsewhere", async () => {
		const user = userEvent.setup();
		await renderLoaded();
		await user.click(screen.getByRole("button", { name: /Refresh/ }));
		flushList(listRequests()[0]!, []);
		expect(
			await screen.findByText("No pending reports")
		).toBeInTheDocument();
	});

	it("filters by the gameId query param and offers Show all", async () => {
		await renderLoaded(REPORTS, "g1");
		expect(screen.getByText("Filtered by game")).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.queryByText("Duplicated entry")).not.toBeInTheDocument();
	});

	it("Show all reloads and lists every report, hiding the filter banner", async () => {
		const user = userEvent.setup();
		await renderLoaded(REPORTS, "g1");

		await user.click(screen.getByRole("button", { name: "Show all" }));
		expect(screen.queryByText("Filtered by game")).not.toBeInTheDocument();
		flushList(listRequests()[0]!);

		expect(await screen.findAllByRole("listitem")).toHaveLength(3);
	});

	it("shows the empty state for a filter with no reports and Show all brings them back", async () => {
		const user = userEvent.setup();
		await renderReports("unknown-game");
		flushList(listRequests()[0]!);
		expect(
			await screen.findByText("No pending reports")
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Show all" }));
		flushList(listRequests()[0]!);
		expect(await screen.findAllByRole("listitem")).toHaveLength(3);
	});

	it("double clicking Show all does not break the banner state", async () => {
		const user = userEvent.setup();
		await renderLoaded(REPORTS, "g1");
		await user.dblClick(screen.getByRole("button", { name: "Show all" }));
		expect(
			screen.queryByRole("button", { name: "Show all" })
		).not.toBeInTheDocument();
		listRequests().forEach(req => flushList(req));
		expect(await screen.findAllByRole("listitem")).toHaveLength(3);
	});

	it("ignores a list response that arrives after a newer one when Show all is clicked while the first load is still pending", async () => {
		const user = userEvent.setup();
		await renderReports("g1");
		const [stale] = listRequests();

		await user.click(screen.getByRole("button", { name: "Show all" }));
		const [fresh] = listRequests();

		flushList(fresh!, REPORTS);
		expect(stale!.cancelled).toBe(true);
		await waitFor(() =>
			expect(screen.getAllByRole("listitem")).toHaveLength(3)
		);
	});

	it("links each title to the game page and exposes it as a link", async () => {
		await renderLoaded();
		const links = screen.getAllByRole("link", { name: "Celeste" });
		expect(links[0]).toHaveAttribute("href", "/games/celeste-code");
	});

	it("renders very long messages, unicode and angle brackets as plain text", async () => {
		const long = "ñandú ✨🎮 <b>bold</b> ".repeat(80);
		await renderLoaded([makeReport("rx", "g9", "Ünïcode", long)]);
		expect(screen.getByText(long.trim())).toBeInTheDocument();
		expect(document.querySelector("b")).toBeNull();
	});

	it("keyboard: Enter activates Approve and Space activates Reject on another card", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const items = screen.getAllByRole("listitem");
		within(items[0]!)
			.getByRole("button", { name: /Approve/ })
			.focus();
		await user.keyboard("{Enter}");
		within(items[1]!)
			.getByRole("button", { name: /Reject/ })
			.focus();
		await user.keyboard(" ");

		expect(
			patchRequests().map(p => [p.request.url, p.request.body.status])
		).toEqual([
			[`${REPORTS_URL}/r1`, "approved"],
			[`${REPORTS_URL}/r2`, "rejected"]
		]);
	});

	it("keyboard: Tab order inside a card goes link, Approve, Reject", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const first = screen.getAllByRole("listitem")[0]!;
		within(first).getByRole("link").focus();
		await user.tab();
		expect(
			within(first).getByRole("button", { name: /Approve/ })
		).toHaveFocus();
		await user.tab();
		expect(
			within(first).getByRole("button", { name: /Reject/ })
		).toHaveFocus();
	});

	it("keeps the icon glyphs out of the accessible names", async () => {
		await renderLoaded();
		const first = screen.getAllByRole("listitem")[0]!;
		expect(
			within(first).getByRole("button", { name: "Approve" })
		).toBeInTheDocument();
		expect(
			within(first).getByRole("button", { name: "Reject" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Refresh" })
		).toBeInTheDocument();
	});
});
