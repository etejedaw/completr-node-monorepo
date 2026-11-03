import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { getDebugNode } from "@angular/core";
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
import { ToastService } from "../../../core/services/toast";
import { type UiDatePicker } from "../../../shared/ui";
import { type PremiumPromotion } from "../services/premium-promotions-admin.model";
import { AdminPromotions } from "./admin-promotions";

const api = environment.apiUrl;
const base = `${api}/admin/premium-promotions`;
const DAY_MS = 86_400_000;

type RequestKind = "load" | "create" | "update" | "revoke";

interface Failure {
	status: number;
	body?: object;
}

function localInput(date: Date) {
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

function daysFromNow(days: number) {
	return new Date(Date.now() + days * DAY_MS);
}

function promotion(
	overrides: Partial<PremiumPromotion> & { id: string }
): PremiumPromotion {
	return {
		code: overrides.id,
		feature: "rewind.premium",
		startsAt: daysFromNow(-1).toISOString(),
		endsAt: daysFromNow(10).toISOString(),
		claimCount: 0,
		createdAt: "2026-11-01T00:00:00.000Z",
		updatedAt: "2026-11-01T00:00:00.000Z",
		...overrides
	};
}

describe("AdminPromotions interaction", () => {
	let httpTesting: HttpTestingController;
	let backend: PremiumPromotion[];
	let failures: Partial<Record<RequestKind, Failure[]>>;
	let hold: Set<RequestKind>;
	let held: Record<RequestKind, TestRequest[]>;
	let requests: string[];
	let unexpectedRequests: string[];
	let toastSuccess: ReturnType<typeof vi.fn<(message: string) => void>>;
	let nextId: number;

	function kindOf(req: TestRequest): RequestKind | null {
		const { method, url } = req.request;
		if (method === "GET" && url === base) return "load";
		if (method === "POST" && url === base) return "create";
		if (method === "PATCH" && url.startsWith(`${base}/`)) return "update";
		if (method === "POST" && url.endsWith("/revoke")) return "revoke";
		return null;
	}

	function promotionIdOf(req: TestRequest) {
		return req.request.url.replace(`${base}/`, "").split("/")[0];
	}

	function fail(req: TestRequest, failure: Failure) {
		req.flush(failure.body ?? {}, {
			status: failure.status,
			statusText: "err"
		});
	}

	function conflict(type: string, title: string): Failure {
		return { status: 409, body: { type, title, status: 409 } };
	}

	function respond(req: TestRequest, kind: RequestKind) {
		requests.push(
			`${req.request.method} ${req.request.url.replace(api, "")}`
		);
		const failure = failures[kind]?.shift();
		if (failure) return fail(req, failure);
		if (kind === "load")
			return req.flush({ data: { promotions: backend } });
		if (kind === "create") {
			const body = req.request.body as Partial<PremiumPromotion>;
			if (backend.some(item => item.code === body.code))
				return fail(
					req,
					conflict(
						"PREMIUM_PROMOTION_CODE_CONFLICT",
						"A premium promotion with this code already exists"
					)
				);
			const created = promotion({
				...(body as PremiumPromotion),
				id: `new-${nextId++}`
			});
			backend = [created, ...backend];
			return req.flush(
				{ data: { promotion: created } },
				{ status: 201, statusText: "Created" }
			);
		}
		const target = backend.find(item => item.id === promotionIdOf(req));
		if (!target)
			return fail(req, {
				status: 404,
				body: { type: "PREMIUM_PROMOTION_NOT_FOUND" }
			});
		if (kind === "update") {
			if (new Date(target.endsAt) <= new Date())
				return fail(
					req,
					conflict(
						"PREMIUM_PROMOTION_ENDED",
						"An ended promotion cannot be edited"
					)
				);
			const updated = { ...target, ...(req.request.body as object) };
			backend = backend.map(item =>
				item.id === target.id ? updated : item
			);
			return req.flush({ data: { promotion: updated } });
		}
		const revoked =
			new Date(target.endsAt) <= new Date()
				? target
				: {
						...target,
						endsAt: new Date(Date.now() - 1000).toISOString()
					};
		backend = backend.map(item => (item.id === target.id ? revoked : item));
		return req.flush({ data: { promotion: revoked } });
	}

	function answer(req: TestRequest) {
		if (req.cancelled) return;
		const kind = kindOf(req);
		if (!kind) {
			unexpectedRequests.push(`${req.request.method} ${req.request.url}`);
			return;
		}
		if (hold.has(kind)) return void held[kind].push(req);
		respond(req, kind);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) break;
			pending.forEach(answer);
		}
	}

	function release(kind: RequestKind) {
		hold.delete(kind);
		const pending = held[kind].splice(0);
		pending.forEach(req => {
			if (!req.cancelled) respond(req, kind);
		});
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	async function renderPromotions() {
		const result = await render(AdminPromotions, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: ToastService,
					useValue: { success: toastSuccess, warning: vi.fn() }
				}
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return result;
	}

	async function renderLoaded() {
		const result = await renderPromotions();
		await untilVisible(() =>
			expect(screen.queryByLabelText("Loading promotions")).toBeNull()
		);
		return result;
	}

	function table() {
		return screen.getByRole("table");
	}

	function rowOf(code: string) {
		return within(table())
			.getByText(code)
			.closest("tr") as HTMLTableRowElement;
	}

	function dialog() {
		return screen.getByRole("dialog");
	}

	function setField(label: RegExp | string, value: string) {
		fireEvent.input(within(dialog()).getByLabelText(label), {
			target: { value }
		});
	}

	function datePicker(label: RegExp) {
		const trigger = within(dialog()).getByRole("button", { name: label });
		return getDebugNode(trigger.closest("ui-date-picker"))
			?.componentInstance as UiDatePicker;
	}

	function pickDate(label: RegExp, value: string) {
		const picker = datePicker(label);
		picker.value.set(value);
		picker.touch.emit();
	}

	function submitButton(name: string | RegExp) {
		return within(dialog()).getByRole("button", { name });
	}

	async function openCreate() {
		await userEvent.click(
			screen.getByRole("button", { name: /New promotion/ })
		);
		await screen.findByRole("dialog", { name: "New promotion" });
	}

	function featurePicker() {
		return within(dialog()).getByRole("button", { name: /^Feature:/ });
	}

	async function chooseFeature(label: string) {
		await userEvent.click(featurePicker());
		const menu = await screen.findByRole("menu");
		await userEvent.click(
			within(menu).getByRole("menuitemradio", { name: label })
		);
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
	}

	async function fillValidCreate(code = "launch-gift") {
		await chooseFeature("Premium Rewind");
		setField(/^Code/, code);
		pickDate(/^Starts at/, localInput(daysFromNow(1)));
		pickDate(/^Ends at/, localInput(daysFromNow(15)));
	}

	async function openEdit(code: string) {
		await userEvent.click(
			within(rowOf(code)).getByRole("button", { name: `Edit ${code}` })
		);
		await screen.findByRole("dialog", { name: "Edit dates" });
	}

	async function openRevoke(code: string) {
		await userEvent.click(
			within(rowOf(code)).getByRole("button", {
				name: `End ${code} early`
			})
		);
		await screen.findByRole("dialog", { name: "End promotion early?" });
	}

	beforeEach(() => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
		backend = [
			promotion({ id: "active-one", claimCount: 3 }),
			promotion({
				id: "scheduled-one",
				feature: "export.json",
				startsAt: daysFromNow(5).toISOString(),
				endsAt: daysFromNow(20).toISOString()
			}),
			promotion({
				id: "ended-one",
				feature: "*",
				claimCount: 7,
				startsAt: daysFromNow(-20).toISOString(),
				endsAt: daysFromNow(-2).toISOString()
			})
		];
		failures = {};
		hold = new Set();
		held = { load: [], create: [], update: [], revoke: [] };
		requests = [];
		unexpectedRequests = [];
		toastSuccess = vi.fn();
		nextId = 1;
	});

	afterEach(() => {
		if (httpTesting) {
			(Object.keys(held) as RequestKind[]).forEach(release);
			answerPending();
			httpTesting.verify();
		}
		vi.unstubAllGlobals();
		expect(unexpectedRequests).toEqual([]);
	});

	describe("listing", () => {
		it("shows code, feature, derived status, dates and claims in API order", async () => {
			await renderLoaded();

			const rows = within(table()).getAllByRole("row");
			expect(rows).toHaveLength(4);
			expect(within(rows[1]).getByText("active-one")).toBeInTheDocument();
			expect(within(rows[1]).getByText("Active")).toBeInTheDocument();
			expect(
				within(rows[1]).getByText("Premium Rewind")
			).toBeInTheDocument();
			expect(within(rows[1]).getByText("3")).toBeInTheDocument();
			expect(within(rows[2]).getByText("Scheduled")).toBeInTheDocument();
			expect(
				within(rows[2]).getByText("JSON export")
			).toBeInTheDocument();
			expect(within(rows[3]).getByText("Ended")).toBeInTheDocument();
			expect(
				within(rows[3]).getByText("Full premium")
			).toBeInTheDocument();
			expect(within(rows[3]).getByText("7")).toBeInTheDocument();
		});

		it("offers no edit or end actions for an ended promotion", async () => {
			await renderLoaded();

			const ended = within(rowOf("ended-one"));
			expect(ended.queryByRole("button", { name: /Edit/ })).toBeNull();
			expect(ended.queryByRole("button", { name: /End/ })).toBeNull();
			expect(
				within(rowOf("active-one")).getByRole("button", {
					name: "Edit active-one"
				})
			).toBeInTheDocument();
			expect(
				within(rowOf("scheduled-one")).getByRole("button", {
					name: "End scheduled-one early"
				})
			).toBeInTheDocument();
		});

		it("renders the same promotions as touch-friendly cards on narrow screens", async () => {
			await renderLoaded();

			const cards = within(screen.getByRole("list")).getAllByRole(
				"listitem"
			);
			expect(cards).toHaveLength(3);
			expect(
				within(cards[0]).getByRole("button", {
					name: "Actions for active-one"
				})
			).toBeInTheDocument();
			expect(within(cards[2]).queryByRole("button")).toBeNull();
		});

		it("opens Edit dates and End early from the card menu", async () => {
			await renderLoaded();
			const card = () =>
				within(screen.getByRole("list")).getAllByRole("listitem")[0];

			await userEvent.click(
				within(card()).getByRole("button", {
					name: "Actions for active-one"
				})
			);
			await userEvent.click(
				await screen.findByRole("menuitem", { name: "Edit dates" })
			);
			await screen.findByRole("dialog", { name: "Edit dates" });
			await userEvent.click(
				within(dialog()).getByRole("button", { name: "Cancel" })
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);

			await userEvent.click(
				within(card()).getByRole("button", {
					name: "Actions for active-one"
				})
			);
			await userEvent.click(
				await screen.findByRole("menuitem", { name: "End early" })
			);
			await screen.findByRole("dialog", { name: "End promotion early?" });
		});

		it("opens a single dialog when the card menu item is double clicked", async () => {
			await renderLoaded();

			await userEvent.click(
				screen.getAllByRole("button", {
					name: "Actions for active-one"
				})[0]
			);
			await userEvent.dblClick(
				await screen.findByRole("menuitem", { name: "Edit dates" })
			);

			await screen.findByRole("dialog", { name: "Edit dates" });
			expect(screen.getAllByRole("dialog")).toHaveLength(1);
		});

		it("shows the empty state and the singular label", async () => {
			backend = [];
			await renderLoaded();
			expect(screen.getByText("No promotions yet")).toBeInTheDocument();

			backend = [promotion({ id: "only" })];
			await userEvent.click(
				screen.getByRole("button", { name: "Refresh" })
			);
			await untilVisible(() =>
				expect(screen.getByText(/^promotion$/)).toBeInTheDocument()
			);
		});

		it("recovers from a server error with Try again", async () => {
			failures.load = [{ status: 500 }];
			await renderPromotions();
			await untilVisible(() =>
				expect(
					screen.getByText("Couldn't load the promotions")
				).toBeInTheDocument()
			);
			expect(
				screen.getByRole("button", { name: /New promotion/ })
			).toBeDisabled();

			await userEvent.click(
				screen.getByRole("button", { name: "Try again" })
			);
			await untilVisible(() =>
				expect(
					within(table()).getByText("active-one")
				).toBeInTheDocument()
			);
		});
	});

	describe("creating", () => {
		it("sends the trimmed code, the feature and ISO dates, then lists the new promotion first", async () => {
			await renderLoaded();
			await openCreate();
			await fillValidCreate("  launch-gift  ");
			const startsAt = localInput(daysFromNow(1));
			const endsAt = localInput(daysFromNow(15));

			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);

			const created = backend[0];
			expect(created.code).toBe("launch-gift");
			expect(created.feature).toBe("rewind.premium");
			expect(localInput(new Date(created.startsAt))).toBe(startsAt);
			expect(localInput(new Date(created.endsAt))).toBe(endsAt);
			expect(within(table()).getAllByRole("row")[1]).toHaveTextContent(
				"launch-gift"
			);
			expect(toastSuccess).toHaveBeenCalledWith(
				"Promotion launch-gift created."
			);
		});

		it("blocks an empty submit and explains every missing field without calling the API", async () => {
			await renderLoaded();
			await openCreate();
			requests.length = 0;

			await userEvent.click(submitButton("Create promotion"));

			expect(
				within(dialog()).getByText("Choose a feature.")
			).toBeInTheDocument();
			expect(
				within(dialog()).getByText("Code is required.")
			).toBeInTheDocument();
			expect(requests).toEqual([]);
			expect(dialog()).toBeInTheDocument();
		});

		it("links the feature picker to its error and clears it once a feature is chosen", async () => {
			await renderLoaded();
			await openCreate();

			await userEvent.click(submitButton("Create promotion"));

			const error = within(dialog()).getByText("Choose a feature.");
			expect(featurePicker()).toHaveAttribute("aria-invalid", "true");
			expect(featurePicker().getAttribute("aria-describedby")).toBe(
				error.closest("ui-field-error")?.id
			);

			await chooseFeature("JSON export");

			expect(featurePicker()).toHaveAccessibleName(
				"Feature: JSON export"
			);
			expect(featurePicker()).not.toHaveAttribute("aria-invalid");
			expect(
				within(dialog()).queryByText("Choose a feature.")
			).toBeNull();
		});

		it("keeps the last feature when the admin changes their mind and sends only that one", async () => {
			await renderLoaded();
			await openCreate();
			await chooseFeature("Full premium");
			await chooseFeature("Unlimited queue");
			await chooseFeature("Premium themes");
			setField(/^Code/, "mind-change");
			pickDate(/^Starts at/, localInput(daysFromNow(1)));
			pickDate(/^Ends at/, localInput(daysFromNow(15)));

			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);

			expect(backend[0].feature).toBe("themes.premium");
			expect(
				requests.filter(request => request.startsWith("POST"))
			).toHaveLength(1);
		});

		it("survives double clicks on the feature picker and on its options", async () => {
			await renderLoaded();
			await openCreate();
			requests.length = 0;

			await userEvent.dblClick(featurePicker());
			await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

			await userEvent.click(featurePicker());
			const menu = await screen.findByRole("menu");
			await userEvent.dblClick(
				within(menu).getByRole("menuitemradio", {
					name: "Unlimited lists"
				})
			);
			await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

			expect(screen.getAllByRole("dialog")).toHaveLength(1);
			expect(featurePicker()).toHaveAccessibleName(
				"Feature: Unlimited lists"
			);
			expect(requests).toEqual([]);
		});

		it("does not open the picker menu twice or leave it behind when the dialog is closed with Escape", async () => {
			await renderLoaded();
			await openCreate();

			await userEvent.click(featurePicker());
			await screen.findByRole("menu");
			await userEvent.keyboard("{Escape}");
			await userEvent.keyboard("{Escape}");

			await waitFor(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(screen.queryByRole("menu")).toBeNull();
		});

		it.each([
			["Uppercase", /lowercase letters/],
			["has spaces", /lowercase letters/],
			["-leading", /lowercase letters/],
			["double--hyphen", /lowercase letters/],
			["💥💥💥", /lowercase letters/],
			["ab", /at least 3/],
			["a".repeat(81), /at most 80/],
			["   ", /Code is required/]
		])("rejects the garbage code %j", async (code, message) => {
			await renderLoaded();
			await openCreate();
			await fillValidCreate();
			requests.length = 0;
			setField(/^Code/, code);

			await userEvent.click(submitButton("Create promotion"));

			expect(within(dialog()).getByText(message)).toBeInTheDocument();
			expect(requests).toEqual([]);
		});

		it("rejects an end before the start, an end in the past and an unreadable date", async () => {
			await renderLoaded();
			await openCreate();
			await fillValidCreate();
			requests.length = 0;

			pickDate(/^Ends at/, localInput(daysFromNow(0.5)));
			await userEvent.click(submitButton("Create promotion"));
			expect(
				within(dialog()).getByText("The end must be after the start.")
			).toBeInTheDocument();

			pickDate(/^Starts at/, localInput(daysFromNow(-30)));
			pickDate(/^Ends at/, localInput(daysFromNow(-3)));
			await userEvent.click(submitButton("Create promotion"));
			expect(
				within(dialog()).getByText("The end must be in the future.")
			).toBeInTheDocument();

			pickDate(/^Ends at/, "not-a-date");
			await userEvent.click(submitButton("Create promotion"));
			expect(
				within(dialog()).getByText("Choose a valid end date.")
			).toBeInTheDocument();

			pickDate(/^Starts at/, "");
			await userEvent.click(submitButton("Create promotion"));
			expect(
				within(dialog()).getByText("Choose a valid start date.")
			).toBeInTheDocument();
			expect(requests).toEqual([]);
		});

		it("sends a single request when the submit button is clicked three times", async () => {
			await renderLoaded();
			await openCreate();
			await fillValidCreate();
			hold.add("create");

			await userEvent.tripleClick(submitButton("Create promotion"));
			answerPending();

			expect(held.create).toHaveLength(1);
			expect(submitButton("Creating...")).toBeDisabled();
			release("create");
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(
				requests.filter(request => request.startsWith("POST"))
			).toHaveLength(1);
			expect(
				backend.filter(item => item.code === "launch-gift")
			).toHaveLength(1);
		});

		it("cannot be dismissed by Cancel, Escape or the close button while the request is in flight", async () => {
			await renderLoaded();
			await openCreate();
			await fillValidCreate();
			hold.add("create");
			await userEvent.click(submitButton("Create promotion"));
			answerPending();

			await userEvent.click(submitButton("Cancel"));
			await userEvent.keyboard("{Escape}");
			await userEvent.click(
				within(dialog()).getByRole("button", { name: /^Close/ })
			);
			expect(dialog()).toBeInTheDocument();

			release("create");
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(
				within(table()).getByText("launch-gift")
			).toBeInTheDocument();
		});

		it("closes cleanly with Cancel and starts from an empty form the next time", async () => {
			await renderLoaded();
			await openCreate();
			setField(/^Code/, "half-typed");
			await userEvent.click(submitButton("Cancel"));
			expect(screen.queryByRole("dialog")).toBeNull();

			await openCreate();
			expect(within(dialog()).getByLabelText(/^Code/)).toHaveValue("");
			expect(
				within(dialog()).queryByText("Code is required.")
			).toBeNull();
		});

		it("keeps the dialog open on a duplicate or reserved code and lets the admin fix it", async () => {
			await renderLoaded();
			await openCreate();
			await fillValidCreate("active-one");

			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(
					within(dialog()).getByText(
						/already used by another promotion or reserved/
					)
				).toBeInTheDocument()
			);
			expect(submitButton("Create promotion")).toBeEnabled();

			setField(/^Code/, "active-two");
			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(within(table()).getByText("active-two")).toBeInTheDocument();
		});

		it("shows server validation issues and generic failures, and allows retrying", async () => {
			await renderLoaded();
			await openCreate();
			await fillValidCreate();

			failures.create = [
				{
					status: 400,
					body: {
						type: "COMMON_SCHEMA_INVALID",
						issues: [
							{ path: "code", message: "Code is too short" },
							{ path: "endsAt", message: "Invalid date" }
						]
					}
				},
				{ status: 500, body: { title: "Internal server error" } },
				{ status: 500 }
			];
			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(
					within(dialog()).getByText(
						"Code is too short · Invalid date"
					)
				).toBeInTheDocument()
			);

			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(
					within(dialog()).getByText("Internal server error")
				).toBeInTheDocument()
			);

			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(
					within(dialog()).getByText(
						"Could not create the promotion."
					)
				).toBeInTheDocument()
			);

			await userEvent.click(submitButton("Create promotion"));
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(
				within(table()).getByText("launch-gift")
			).toBeInTheDocument();
		});

		it("drops the in-flight request when the page is left", async () => {
			const { fixture } = await renderLoaded();
			await openCreate();
			await fillValidCreate();
			hold.add("create");
			await userEvent.click(submitButton("Create promotion"));
			answerPending();
			const inFlight = held.create[0];

			fixture.destroy();

			expect(inFlight.cancelled).toBe(true);
		});
	});

	describe("editing", () => {
		it("only exposes the dates and sends only the one that changed", async () => {
			await renderLoaded();
			await openEdit("active-one");

			expect(within(dialog()).queryByLabelText(/^Code/)).toBeNull();
			expect(
				within(dialog()).queryByRole("button", { name: /^Feature:/ })
			).toBeNull();
			expect(
				within(dialog()).getByText(/active-one · Premium Rewind/)
			).toBeInTheDocument();

			const newEnd = localInput(daysFromNow(40));
			pickDate(/^Ends at/, newEnd);
			await userEvent.click(submitButton("Save dates"));
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);

			expect(requests).toContain(
				`PATCH /admin/premium-promotions/active-one`
			);
			expect(localInput(new Date(backend[0].endsAt))).toBe(newEnd);
			expect(toastSuccess).toHaveBeenCalledWith(
				"Promotion active-one updated."
			);
		});

		it("refuses to save when nothing changed", async () => {
			await renderLoaded();
			await openEdit("active-one");
			requests.length = 0;

			await userEvent.click(submitButton("Save dates"));

			expect(
				within(dialog()).getByText(
					"Change at least one date before saving."
				)
			).toBeInTheDocument();
			expect(requests).toEqual([]);
		});

		it("validates garbage dates before calling the API", async () => {
			await renderLoaded();
			await openEdit("scheduled-one");
			requests.length = 0;

			pickDate(/^Ends at/, localInput(daysFromNow(2)));
			await userEvent.click(submitButton("Save dates"));
			expect(
				within(dialog()).getByText("The end must be after the start.")
			).toBeInTheDocument();

			pickDate(/^Ends at/, "garbage");
			await userEvent.click(submitButton("Save dates"));
			expect(
				within(dialog()).getByText("Choose a valid end date.")
			).toBeInTheDocument();

			pickDate(/^Ends at/, localInput(daysFromNow(-1)));
			pickDate(/^Starts at/, localInput(daysFromNow(-5)));
			await userEvent.click(submitButton("Save dates"));
			expect(
				within(dialog()).getByText("The end must be in the future.")
			).toBeInTheDocument();
			expect(requests).toEqual([]);
		});

		it("sends one request on a triple click and keeps the dialog open until the answer", async () => {
			await renderLoaded();
			await openEdit("active-one");
			pickDate(/^Ends at/, localInput(daysFromNow(30)));
			hold.add("update");

			await userEvent.tripleClick(submitButton("Save dates"));
			answerPending();
			expect(held.update).toHaveLength(1);

			await userEvent.keyboard("{Escape}");
			expect(dialog()).toBeInTheDocument();
			expect(submitButton("Cancel")).toBeDisabled();

			release("update");
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(
				requests.filter(request => request.startsWith("PATCH"))
			).toHaveLength(1);
		});

		it("shows the error, closes the dialog and reloads when the promotion ended meanwhile", async () => {
			await renderLoaded();
			await openEdit("active-one");
			backend = backend.map(item =>
				item.id === "active-one"
					? { ...item, endsAt: daysFromNow(-1).toISOString() }
					: item
			);
			pickDate(/^Ends at/, localInput(daysFromNow(30)));

			await userEvent.click(submitButton("Save dates"));

			await untilVisible(() =>
				expect(
					screen.getByText(
						/already ended, so it can no longer be edited/
					)
				).toBeInTheDocument()
			);
			expect(screen.queryByRole("dialog")).toBeNull();
			await untilVisible(() =>
				expect(
					within(rowOf("active-one")).queryByRole("button", {
						name: /Edit/
					})
				).toBeNull()
			);
			expect(
				within(rowOf("active-one")).getByText("Ended")
			).toBeInTheDocument();
		});

		it("reports a promotion deleted by someone else and refreshes the list", async () => {
			await renderLoaded();
			await openEdit("active-one");
			backend = backend.filter(item => item.id !== "active-one");
			pickDate(/^Ends at/, localInput(daysFromNow(30)));

			await userEvent.click(submitButton("Save dates"));

			await untilVisible(() =>
				expect(
					screen.getByText("That promotion no longer exists.")
				).toBeInTheDocument()
			);
			await untilVisible(() =>
				expect(within(table()).queryByText("active-one")).toBeNull()
			);
		});

		it("keeps the form and shows the server message on a generic failure", async () => {
			await renderLoaded();
			await openEdit("active-one");
			pickDate(/^Ends at/, localInput(daysFromNow(30)));
			failures.update = [{ status: 500 }];

			await userEvent.click(submitButton("Save dates"));
			await untilVisible(() =>
				expect(
					within(dialog()).getByText(
						"Could not update the promotion."
					)
				).toBeInTheDocument()
			);
			expect(datePicker(/^Ends at/).value()).toBe(
				localInput(daysFromNow(30))
			);

			await userEvent.click(submitButton("Save dates"));
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
		});
	});

	describe("ending early", () => {
		it("warns that access of people who already claimed it ends too", async () => {
			await renderLoaded();
			await openRevoke("active-one");

			expect(dialog()).toHaveTextContent(
				/also finishes the premium access of everyone who already claimed it \(3 claims\)/
			);
			expect(requests.some(request => request.includes("revoke"))).toBe(
				false
			);
		});

		it("does nothing when the admin keeps the promotion", async () => {
			await renderLoaded();
			await openRevoke("active-one");
			requests.length = 0;

			await userEvent.click(
				within(dialog()).getByRole("button", { name: "Keep promotion" })
			);

			expect(screen.queryByRole("dialog")).toBeNull();
			expect(requests).toEqual([]);
			expect(
				within(rowOf("active-one")).getByText("Active")
			).toBeInTheDocument();
		});

		it("ends the promotion and drops its actions", async () => {
			await renderLoaded();
			await openRevoke("active-one");

			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);

			await untilVisible(() =>
				expect(
					within(rowOf("active-one")).getByText("Ended")
				).toBeInTheDocument()
			);
			expect(
				within(rowOf("active-one")).queryByRole("button", {
					name: /End/
				})
			).toBeNull();
			expect(toastSuccess).toHaveBeenCalledWith(
				"Promotion active-one ended."
			);
		});

		it("sends a single request on a triple click and cannot be dismissed meanwhile", async () => {
			await renderLoaded();
			await openRevoke("active-one");
			hold.add("revoke");

			await userEvent.tripleClick(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			answerPending();
			expect(held.revoke).toHaveLength(1);

			await userEvent.keyboard("{Escape}");
			await userEvent.click(
				within(dialog()).getByRole("button", { name: "Keep promotion" })
			);
			expect(dialog()).toBeInTheDocument();
			expect(
				within(dialog()).getByRole("button", { name: "Ending..." })
			).toBeDisabled();

			release("revoke");
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(
				requests.filter(request => request.endsWith("/revoke"))
			).toHaveLength(1);
		});

		it("blocks every other action while a request is in flight", async () => {
			await renderLoaded();
			await openRevoke("active-one");
			hold.add("revoke");
			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			answerPending();

			expect(
				within(rowOf("scheduled-one")).getByRole("button", {
					name: "Edit scheduled-one"
				})
			).toBeDisabled();
			expect(
				screen.getByRole("button", { name: /New promotion/ })
			).toBeDisabled();
			expect(
				screen.getByRole("button", { name: "Refresh" })
			).toBeDisabled();
		});

		it("shows the failure, reloads, and lets the admin try again", async () => {
			await renderLoaded();
			failures.revoke = [{ status: 500, body: { title: "Boom" } }];
			await openRevoke("active-one");

			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			await untilVisible(() =>
				expect(screen.getByText("Boom")).toBeInTheDocument()
			);
			expect(screen.queryByRole("dialog")).toBeNull();
			expect(
				within(rowOf("active-one")).getByText("Active")
			).toBeInTheDocument();

			await openRevoke("active-one");
			expect(screen.queryByText("Boom")).toBeNull();
			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			await untilVisible(() =>
				expect(
					within(rowOf("active-one")).getByText("Ended")
				).toBeInTheDocument()
			);
		});

		it("explains when the promotion disappeared and refreshes the list", async () => {
			await renderLoaded();
			await openRevoke("active-one");
			backend = backend.filter(item => item.id !== "active-one");

			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);

			await untilVisible(() =>
				expect(
					screen.getByText("That promotion no longer exists.")
				).toBeInTheDocument()
			);
			await untilVisible(() =>
				expect(within(table()).queryByText("active-one")).toBeNull()
			);
		});

		it("keeps the updated row and warns when the follow-up refresh fails", async () => {
			await renderLoaded();
			await openRevoke("active-one");
			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			failures.load = [{ status: 500 }];

			await untilVisible(() =>
				expect(
					screen.getByText(/Could not refresh the list/)
				).toBeInTheDocument()
			);
			expect(
				within(rowOf("active-one")).getByText("Ended")
			).toBeInTheDocument();
		});

		it("applies answers in order when two promotions are ended back to back with slow refreshes", async () => {
			await renderLoaded();
			hold.add("load");

			await openRevoke("active-one");
			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			await waitFor(() => {
				answerPending();
				expect(held.load).toHaveLength(1);
			});
			const firstRefresh = held.load[0];

			await openRevoke("scheduled-one");
			await userEvent.click(
				within(dialog()).getByRole("button", { name: "End promotion" })
			);
			await waitFor(() => {
				answerPending();
				expect(held.load.filter(req => !req.cancelled)).toHaveLength(1);
			});
			expect(firstRefresh.cancelled).toBe(true);

			release("load");
			await untilVisible(() => {
				expect(
					within(rowOf("active-one")).getByText("Ended")
				).toBeInTheDocument();
				expect(
					within(rowOf("scheduled-one")).getByText("Ended")
				).toBeInTheDocument();
			});
		});
	});
});
