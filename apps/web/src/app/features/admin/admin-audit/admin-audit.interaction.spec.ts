import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type AuditLogEntry } from "../services/audit.service";
import { AdminAudit } from "./admin-audit";

const api = environment.apiUrl;

interface AuditQuery {
	limit: string | null;
	offset: string | null;
	action: string | null;
	targetType: string | null;
}

const ACTIONS = ["game_created", "user_edited"];
const TARGET_TYPES = ["game", "user", "job"];

function buildLogs(count: number): AuditLogEntry[] {
	return Array.from({ length: count }, (_, i) => {
		const targetType = TARGET_TYPES[i % 3];
		return {
			id: `l${i}`,
			user:
				i % 17 === 16
					? null
					: {
							id: `u${i}`,
							username: `admin${i}`,
							name: `Admin ${i}`
						},
			action: ACTIONS[i % 2],
			targetType,
			targetId: `0123456789abcdef-${i}`,
			target:
				targetType === "game"
					? {
							type: "game",
							id: `g${i}`,
							label: `Game ${i}`,
							code: `game-${i}`
						}
					: targetType === "user"
						? {
								type: "user",
								id: `t${i}`,
								label: `Target ${i}`,
								username: `target${i}`
							}
						: undefined,
			createdAt: "2026-04-02T09:30:00Z"
		};
	});
}

describe("AdminAudit interaction", () => {
	let httpTesting: HttpTestingController;
	let allLogs: AuditLogEntry[];
	let queries: AuditQuery[];
	let failure: { status: number; body?: object } | null;
	let hold: boolean;
	let held: { req: TestRequest; query: AuditQuery }[];
	let unexpectedRequests: string[];

	function readQuery(req: TestRequest): AuditQuery {
		const { params } = req.request;
		return {
			limit: params.get("limit"),
			offset: params.get("offset"),
			action: params.get("action"),
			targetType: params.get("targetType")
		};
	}

	function pageFor(query: AuditQuery) {
		const filtered = allLogs.filter(
			log =>
				(!query.action || log.action === query.action) &&
				(!query.targetType || log.targetType === query.targetType)
		);
		const offset = Number(query.offset);
		return {
			logs: filtered.slice(offset, offset + Number(query.limit)),
			total: filtered.length
		};
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method === "GET" && url === `${api}/admin/audit`) {
			const query = readQuery(req);
			if (hold) return void held.push({ req, query });
			queries.push(query);
			if (failure)
				return req.flush(failure.body ?? {}, {
					status: failure.status,
					statusText: "err"
				});
			return req.flush({ data: pageFor(query) });
		}
		unexpectedRequests.push(`${method} ${url}`);
	}

	function answerHeld(index: number) {
		const { req, query } = held[index];
		queries.push(query);
		req.flush({ data: pageFor(query) });
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

	async function renderAudit() {
		await render(AdminAudit, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([])
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
	}

	async function renderLoaded() {
		await renderAudit();
		await untilVisible(() =>
			expect(screen.queryByLabelText("Loading audit log")).toBeNull()
		);
	}

	function stubViewport(isMobile: boolean) {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: isMobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	}

	function picker(label: "Action" | "Target") {
		return screen.getAllByRole("button", {
			name: new RegExp(`^${label}:`)
		})[0];
	}

	async function chooseOption(
		label: "Action" | "Target",
		sheetHeading: string,
		option: string
	) {
		await userEvent.click(picker(label));
		const sheet = await screen.findByRole("dialog", { name: sheetHeading });
		await userEvent.click(
			within(sheet).getByRole("button", { name: option })
		);
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: sheetHeading })
			).toBeNull()
		);
	}

	const chooseAction = (option: string) =>
		chooseOption("Action", "Filter by action", option);
	const chooseTarget = (option: string) =>
		chooseOption("Target", "Filter by target type", option);

	function bodyRows() {
		return within(screen.getByRole("table")).getAllByRole("row").slice(1);
	}

	function lastQuery() {
		return queries[queries.length - 1];
	}

	beforeEach(() => {
		allLogs = buildLogs(120);
		queries = [];
		failure = null;
		hold = false;
		held = [];
		unexpectedRequests = [];
		stubViewport(true);
	});

	afterEach(() => {
		if (httpTesting) {
			hold = false;
			answerPending();
			httpTesting.verify();
		}
		vi.unstubAllGlobals();
		expect(unexpectedRequests).toEqual([]);
	});

	it("loads the first page with the default limit and no filters", async () => {
		await renderLoaded();

		expect(queries).toEqual([
			{ limit: "50", offset: "0", action: null, targetType: null }
		]);
		expect(bodyRows()).toHaveLength(50);
		expect(screen.getByText("120")).toBeInTheDocument();
		expect(screen.getByText(/entries/)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Clear filters" })
		).toBeNull();
	});

	it("links game and user targets and truncates other target ids", async () => {
		await renderLoaded();

		const [first, second, third] = bodyRows();
		expect(
			within(first).getByRole("link", { name: "Game 0" })
		).toHaveAttribute("href", "/games/game-0");
		expect(
			within(second).getByRole("link", { name: "Target 1" })
		).toHaveAttribute("href", "/user/target1");
		expect(within(third).queryByRole("link")).toBeNull();
		expect(within(third).getByText("01234567...")).toBeInTheDocument();
	});

	it("labels entries without an actor as Unknown", async () => {
		await renderLoaded();

		const row = bodyRows()[16];
		expect(within(row).getByText("Unknown")).toBeInTheDocument();
	});

	it("shows the singular label for a single entry", async () => {
		allLogs = buildLogs(1);
		await renderLoaded();

		expect(screen.getByText(/^\s*entry\s*$/)).toBeInTheDocument();
	});

	it("shows the empty state, without a clear button, when nothing was ever logged", async () => {
		allLogs = [];
		await renderLoaded();

		expect(screen.getByText("No audit entries yet")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Clear filters" })
		).toBeNull();
	});

	it("filters by action and goes back to the first page", async () => {
		await renderLoaded();
		await userEvent.click(
			screen.getByRole("button", { name: "Next page" })
		);
		await untilVisible(() => expect(lastQuery().offset).toBe("50"));

		await chooseAction("user_edited");
		await untilVisible(() =>
			expect(lastQuery()).toEqual({
				limit: "50",
				offset: "0",
				action: "user_edited",
				targetType: null
			})
		);

		await untilVisible(() => expect(bodyRows()).toHaveLength(50));
		expect(picker("Action")).toHaveAccessibleName("Action: user_edited");
		expect(screen.getByText("60")).toBeInTheDocument();
	});

	it("keeps both filters when they are combined and resets paging on each change", async () => {
		await renderLoaded();

		await chooseAction("game_created");
		await untilVisible(() =>
			expect(lastQuery().action).toBe("game_created")
		);
		await chooseTarget("job");

		await untilVisible(() =>
			expect(lastQuery()).toEqual({
				limit: "50",
				offset: "0",
				action: "game_created",
				targetType: "job"
			})
		);
	});

	it("walks the pages forward and back with a single request per click", async () => {
		await renderLoaded();

		await userEvent.click(
			screen.getByRole("button", { name: "Next page" })
		);
		await untilVisible(() => expect(lastQuery().offset).toBe("50"));
		await userEvent.click(
			screen.getByRole("button", { name: "Last page" })
		);
		await untilVisible(() => expect(lastQuery().offset).toBe("100"));
		await untilVisible(() => expect(bodyRows()).toHaveLength(20));
		await userEvent.click(
			screen.getByRole("button", { name: "First page" })
		);
		await untilVisible(() => expect(lastQuery().offset).toBe("0"));

		expect(queries.map(q => q.offset)).toEqual(["0", "50", "100", "0"]);
	});

	it("does not send a request when the selected filter option is chosen again", async () => {
		await renderLoaded();
		await chooseAction("user_edited");
		await untilVisible(() => expect(queries).toHaveLength(2));

		await chooseAction("user_edited");
		answerPending();

		expect(queries).toHaveLength(2);
	});

	it("shows a no-matches state for an impossible combination and recovers with Clear filters", async () => {
		allLogs = allLogs.filter(
			log => !(log.action === "game_created" && log.targetType === "user")
		);
		await renderLoaded();
		await chooseAction("game_created");
		await untilVisible(() => expect(queries).toHaveLength(2));
		await chooseTarget("user");
		await untilVisible(() =>
			expect(
				screen.getByText("No audit entries match the filters.")
			).toBeInTheDocument()
		);
		const clearButtons = screen.getAllByRole("button", {
			name: "Clear filters"
		});
		expect(clearButtons).toHaveLength(2);

		await userEvent.click(clearButtons[1]);
		await untilVisible(() => expect(bodyRows()).toHaveLength(50));

		expect(lastQuery()).toEqual({
			limit: "50",
			offset: "0",
			action: null,
			targetType: null
		});
		expect(picker("Action")).toHaveAccessibleName("Action: All actions");
		expect(picker("Target")).toHaveAccessibleName("Target: All targets");
		expect(
			screen.queryByRole("button", { name: "Clear filters" })
		).toBeNull();
	});

	it("clears both filters from the toolbar button after a combined search with no results", async () => {
		allLogs = buildLogs(120).filter(log => log.targetType !== "job");
		await renderLoaded();
		await chooseTarget("job");
		await untilVisible(() =>
			expect(
				screen.getByText("No audit entries match the filters.")
			).toBeInTheDocument()
		);

		await userEvent.click(
			screen.getAllByRole("button", { name: "Clear filters" })[0]
		);

		await untilVisible(() => expect(bodyRows()).toHaveLength(50));
	});

	it("shows the loading skeleton and hides pagination while a request is pending", async () => {
		await renderLoaded();
		hold = true;

		await userEvent.click(
			screen.getByRole("button", { name: "Next page" })
		);
		answerPending();

		expect(screen.getByLabelText("Loading audit log")).toHaveAttribute(
			"aria-busy",
			"true"
		);
		expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
		expect(held).toHaveLength(1);
	});

	it.each([
		["a 500", 500],
		["a 404", 404],
		["a 422", 422],
		["a network error", 0]
	])(
		"offers Try again after %s and keeps the active filter",
		async (_label, status) => {
			await renderLoaded();
			await chooseAction("user_edited");
			await untilVisible(() => expect(queries).toHaveLength(2));
			failure = { status };
			await userEvent.click(
				screen.getByRole("button", { name: "Next page" })
			);
			await untilVisible(() =>
				expect(
					screen.getByText("Couldn't load the audit log")
				).toBeInTheDocument()
			);
			expect(
				screen.getByRole("button", { name: "Clear filters" })
			).toBeInTheDocument();

			failure = null;
			hold = true;
			await userEvent.tripleClick(
				screen.getByRole("button", { name: "Try again" })
			);
			answerPending();
			expect(held).toHaveLength(1);
			expect(held[0].query).toEqual({
				limit: "50",
				offset: "50",
				action: "user_edited",
				targetType: null
			});

			hold = false;
			answerHeld(0);
			await untilVisible(() =>
				expect(bodyRows().length).toBeGreaterThan(0)
			);
			expect(
				screen.queryByText("Couldn't load the audit log")
			).toBeNull();
		}
	);

	it("recovers from a failed load by changing a filter instead of retrying", async () => {
		failure = { status: 500 };
		await renderAudit();
		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't load the audit log")
			).toBeInTheDocument()
		);

		failure = null;
		await chooseAction("game_created");

		await untilVisible(() => expect(bodyRows()).toHaveLength(50));
		expect(screen.queryByText("Couldn't load the audit log")).toBeNull();
	});

	it("clears filters while a failed load is on screen", async () => {
		await renderLoaded();
		await chooseTarget("game");
		await untilVisible(() => expect(queries).toHaveLength(2));
		failure = { status: 500 };
		await chooseAction("user_edited");
		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't load the audit log")
			).toBeInTheDocument()
		);

		failure = null;
		await userEvent.click(
			screen.getByRole("button", { name: "Clear filters" })
		);

		await untilVisible(() => expect(bodyRows()).toHaveLength(50));
		expect(lastQuery().action).toBeNull();
		expect(lastQuery().targetType).toBeNull();
	});

	it("keeps the results of the latest filter when an older request answers after a newer one", async () => {
		await renderLoaded();
		hold = true;

		await chooseAction("game_created");
		answerPending();
		await chooseAction("user_edited");
		answerPending();
		expect(held).toHaveLength(2);

		answerHeld(1);
		await untilVisible(() => expect(bodyRows()).toHaveLength(50));
		if (!held[0].req.cancelled) answerHeld(0);
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(picker("Action")).toHaveAccessibleName("Action: user_edited");
		expect(bodyRows()[0]).toHaveTextContent("admin1");
	});

	it("drops a response that arrives after Clear filters was pressed while it was in flight", async () => {
		await renderLoaded();
		hold = true;

		await chooseAction("user_edited");
		answerPending();
		await userEvent.click(
			screen.getByRole("button", { name: "Clear filters" })
		);
		answerPending();
		expect(held).toHaveLength(2);

		answerHeld(1);
		await untilVisible(() => expect(bodyRows()).toHaveLength(50));
		if (!held[0].req.cancelled) answerHeld(0);
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(picker("Action")).toHaveAccessibleName("Action: All actions");
		expect(bodyRows()[0]).toHaveTextContent("admin0");
	});

	it("opens and dismisses the filter sheet repeatedly with Escape without changing the filter", async () => {
		await renderLoaded();

		for (let i = 0; i < 3; i++) {
			await userEvent.click(picker("Action"));
			expect(
				await screen.findByRole("dialog", { name: "Filter by action" })
			).toBeInTheDocument();
			await userEvent.keyboard("{Escape}");
			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Filter by action" })
				).toBeNull()
			);
		}

		answerPending();
		expect(queries).toHaveLength(1);
		expect(picker("Action")).toHaveAccessibleName("Action: All actions");
	});

	it("dismisses the filter sheet from its backdrop button", async () => {
		await renderLoaded();
		await userEvent.click(picker("Target"));
		await screen.findByRole("dialog", { name: "Filter by target type" });
		const openedAt = performance.now();
		const clock = vi
			.spyOn(performance, "now")
			.mockReturnValue(openedAt + 1000);

		await userEvent.click(
			screen.getByRole("button", { name: "Close Filter by target type" })
		);
		clock.mockRestore();

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Filter by target type" })
			).toBeNull()
		);
		expect(queries).toHaveLength(1);
	});

	it("picks a filter by keyboard only", async () => {
		await renderLoaded();
		picker("Action").focus();

		await userEvent.keyboard("{Enter}");
		const sheet = await screen.findByRole("dialog", {
			name: "Filter by action"
		});
		const option = within(sheet).getByRole("button", {
			name: "game_deleted"
		});
		option.focus();
		await userEvent.keyboard("{Enter}");

		await untilVisible(() =>
			expect(lastQuery().action).toBe("game_deleted")
		);
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Filter by action" })
			).toBeNull()
		);
	});

	it("marks the current option as pressed inside the sheet", async () => {
		await renderLoaded();
		await chooseTarget("job");
		await untilVisible(() => expect(queries).toHaveLength(2));

		await userEvent.click(picker("Target"));
		const sheet = await screen.findByRole("dialog", {
			name: "Filter by target type"
		});

		expect(
			within(sheet).getByRole("button", { name: "job" })
		).toHaveAttribute("aria-pressed", "true");
		expect(
			within(sheet).getByRole("button", { name: "All targets" })
		).toHaveAttribute("aria-pressed", "false");
	});

	it("exposes both pickers and the pagination controls with accessible names", async () => {
		await renderLoaded();

		expect(picker("Action")).toBeInTheDocument();
		expect(picker("Target")).toBeInTheDocument();
		for (const name of [
			"First page",
			"Previous page",
			"Next page",
			"Last page"
		]) {
			expect(screen.getByRole("button", { name })).toBeInTheDocument();
		}
		expect(screen.getAllByRole("columnheader")).toHaveLength(4);
	});

	it("lists the entries as stacked cards as well as table rows", async () => {
		await renderLoaded();

		const cards = within(screen.getByRole("list")).getAllByRole("listitem");
		expect(cards).toHaveLength(50);
		expect(
			within(cards[0]).getByRole("link", { name: "Game 0" })
		).toHaveAttribute("href", "/games/game-0");
	});

	it("keeps the filter toolbar usable when the first page is smaller than the limit", async () => {
		allLogs = buildLogs(7);
		await renderLoaded();

		expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
		await chooseAction("user_edited");
		await untilVisible(() => expect(bodyRows()).toHaveLength(3));
	});
});
