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
import { ToastService } from "../../../core/services/toast";
import { pickCalendarRange } from "../../../shared/ui/date-picker/ui-date-picker.testing";
import {
	type AdminRewind,
	type CreateRewindEditionRequest,
	type RewindEdition,
	type UpdateRewindEditionRequest
} from "../services/rewind-admin.model";
import { AdminRewind as AdminRewindPage } from "./admin-rewind";

const api = environment.apiUrl;
const editionsUrl = `${api}/admin/rewind/editions`;
const rewindsUrl = `${api}/admin/rewinds`;

type RequestKind = "editions" | "create" | "update" | "rewinds" | "patch";

interface Failure {
	status: number;
	body?: object;
}

function edition(
	overrides: Partial<RewindEdition> & { year: number }
): RewindEdition {
	const { year } = overrides;
	return {
		opensAt: `${year}-12-01`,
		closesAt: `${year + 1}-01-31`,
		graceStartsAt: `${year + 1}-01-01`,
		graceEndsAt: `${year + 1}-01-07`,
		design: "2026",
		premiumRegenerations: 3,
		giftRegenerations: 1,
		frozenAt: null,
		inProgress: overrides.status === "open",
		status: overrides.inProgress ? "open" : "closed",
		generatedCount: 0,
		...overrides
	};
}

function rewind(
	overrides: Partial<AdminRewind> & { id: string; username: string }
): AdminRewind {
	const { username, ...rest } = overrides;
	return {
		year: 2026,
		user: { id: `user-${username}`, username },
		accessKind: "premium",
		regenerationsLeft: 2,
		graceUsed: false,
		generatedAt: "2026-12-03T10:00:00.000Z",
		frozenAt: null,
		...rest
	};
}

describe("AdminRewind interaction", () => {
	let httpTesting: HttpTestingController;
	let editions: RewindEdition[];
	let rewinds: AdminRewind[];
	let failures: Partial<Record<RequestKind, Failure[]>>;
	let hold: Set<RequestKind>;
	let held: Record<RequestKind, TestRequest[]>;
	let created: CreateRewindEditionRequest[];
	let updated: { year: number; body: UpdateRewindEditionRequest }[];
	let patched: { id: string; body: unknown }[];
	let listed: URLSearchParams[];
	let unexpectedRequests: string[];
	let toastSuccess: ReturnType<typeof vi.fn<(message: string) => void>>;

	function kindOf(req: TestRequest): RequestKind | null {
		const { method, url } = req.request;
		if (method === "GET" && url === editionsUrl) return "editions";
		if (method === "POST" && url === editionsUrl) return "create";
		if (method === "PUT" && url.startsWith(`${editionsUrl}/`))
			return "update";
		if (method === "GET" && url === rewindsUrl) return "rewinds";
		if (method === "PATCH" && url.startsWith(`${rewindsUrl}/`))
			return "patch";
		return null;
	}

	function fail(req: TestRequest, failure: Failure) {
		req.flush(failure.body ?? {}, {
			status: failure.status,
			statusText: "err"
		});
	}

	function overlaps(year: number, opensAt: string, closesAt: string) {
		return editions.some(
			other =>
				other.year !== year &&
				opensAt <= other.closesAt &&
				closesAt >= other.opensAt
		);
	}

	function respond(req: TestRequest, kind: RequestKind) {
		const failure = failures[kind]?.shift();
		if (failure) return fail(req, failure);
		if (kind === "editions")
			return req.flush({ data: { editions, designs: ["2026"] } });
		if (kind === "create") {
			const body = req.request.body as CreateRewindEditionRequest;
			created.push(body);
			if (editions.some(item => item.year === body.year))
				return fail(req, {
					status: 409,
					body: { type: "REWIND_EDITION_EXISTS" }
				});
			if (overlaps(body.year, body.opensAt, body.closesAt))
				return fail(req, {
					status: 409,
					body: { type: "REWIND_EDITION_OVERLAP" }
				});
			const next = edition({ ...body });
			editions = [...editions, next];
			return req.flush(
				{ data: { edition: next } },
				{ status: 201, statusText: "Created" }
			);
		}
		if (kind === "update") {
			const year = Number(req.request.url.split("/").pop());
			const body = req.request.body as UpdateRewindEditionRequest;
			updated.push({ year, body });
			const target = editions.find(item => item.year === year);
			if (!target)
				return fail(req, {
					status: 404,
					body: { type: "REWIND_EDITION_NOT_FOUND" }
				});
			if (target.frozenAt)
				return fail(req, {
					status: 409,
					body: { type: "REWIND_EDITION_FROZEN" }
				});
			const { applyToGenerated, ...settings } = body;
			const next = { ...target, ...settings };
			editions = editions.map(item => (item.year === year ? next : item));
			const affected = applyToGenerated
				? rewinds.filter(
						item => item.year === year && item.accessKind !== "none"
					).length
				: 0;
			return req.flush({
				data: { edition: next, affectedRewinds: affected }
			});
		}
		if (kind === "rewinds") {
			const params = new URLSearchParams(req.request.params.toString());
			listed.push(params);
			const year = Number(params.get("year"));
			const search = params.get("search")?.toLowerCase() ?? "";
			const limit = Number(params.get("limit"));
			const offset = Number(params.get("offset"));
			const matching = rewinds.filter(
				item =>
					item.year === year &&
					item.user.username.toLowerCase().includes(search)
			);
			return req.flush({
				data: {
					rewinds: matching.slice(offset, offset + limit),
					total: matching.length
				}
			});
		}
		const id = req.request.url.split("/").pop()!;
		const body = req.request.body as { regenerationsLeft: unknown };
		patched.push({ id, body });
		const target = rewinds.find(item => item.id === id);
		if (!target)
			return fail(req, {
				status: 404,
				body: { type: "REWIND_NOT_FOUND" }
			});
		const left = body.regenerationsLeft;
		if (typeof left !== "number" || left < 0 || left > 1000)
			return fail(req, {
				status: 422,
				body: {
					type: "COMMON_SCHEMA_INVALID",
					issues: [
						{
							path: "regenerationsLeft",
							message: "Must be between 0 and 1000"
						}
					]
				}
			});
		const next = { ...target, regenerationsLeft: left };
		rewinds = rewinds.map(item => (item.id === id ? next : item));
		return req.flush({ data: { rewind: next } });
	}

	function answer(req: TestRequest) {
		if (req.cancelled) return;
		const kind = kindOf(req);
		if (!kind) {
			unexpectedRequests.push(`${req.request.method} ${req.request.url}`);
			req.flush({}, { status: 500, statusText: "Unexpected request" });
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
		held[kind].splice(0).forEach(req => {
			if (!req.cancelled) respond(req, kind);
		});
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	async function renderLoaded() {
		const result = await render(AdminRewindPage, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: ToastService,
					useValue: {
						success: toastSuccess,
						warning: vi.fn(),
						error: vi.fn()
					}
				}
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() => {
			expect(screen.queryByLabelText("Loading editions")).toBeNull();
			expect(screen.queryByLabelText("Loading Rewinds")).toBeNull();
		});
		return result;
	}

	function editionsSection() {
		return screen.getByRole("region", { name: "Editions" });
	}

	function rewindsSection() {
		return screen.getByRole("region", { name: "Rewinds" });
	}

	function rowByFirstCell(table: HTMLElement, text: string) {
		const row = within(table)
			.getAllByRole("row")
			.find(
				candidate =>
					(
						candidate as HTMLTableRowElement
					).cells[0]?.textContent?.trim() === text
			);
		if (!row) throw new Error(`No row starts with ${text}`);
		return row as HTMLTableRowElement;
	}

	function editionRow(year: number) {
		return rowByFirstCell(
			within(editionsSection()).getByRole("table"),
			String(year)
		);
	}

	function rewindRow(username: string) {
		return rowByFirstCell(
			within(rewindsSection()).getByRole("table"),
			username
		);
	}

	function dialog() {
		return screen.getByRole("dialog");
	}

	function setField(label: string, value: string) {
		fireEvent.input(within(dialog()).getByLabelText(label), {
			target: { value }
		});
	}

	async function openEdition(year: number, action: "Edit" | "View") {
		await userEvent.click(
			within(editionRow(year)).getByRole("button", {
				name: `${action} Rewind ${year}`
			})
		);
	}

	beforeEach(() => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
		editions = [
			edition({ year: 2025, frozenAt: "2026-02-01T00:05:00.000Z" }),
			edition({ year: 2026, inProgress: true, generatedCount: 12 })
		];
		rewinds = [
			rewind({ id: "r-ada", username: "ada", regenerationsLeft: 2 }),
			rewind({
				id: "r-grace",
				username: "grace",
				accessKind: "gift",
				regenerationsLeft: 0,
				graceUsed: true
			}),
			rewind({
				id: "r-linus",
				username: "linus",
				accessKind: "none",
				regenerationsLeft: 0
			}),
			rewind({
				id: "r-old",
				username: "margaret",
				year: 2025,
				frozenAt: "2026-02-01T00:05:00.000Z"
			})
		];
		failures = {};
		hold = new Set();
		held = { editions: [], create: [], update: [], rewinds: [], patch: [] };
		created = [];
		updated = [];
		patched = [];
		listed = [];
		unexpectedRequests = [];
		toastSuccess = vi.fn();
	});

	afterEach(() => {
		if (httpTesting) {
			(Object.keys(held) as RequestKind[]).forEach(release);
			answerPending();
			httpTesting.verify();
		}
		expect(unexpectedRequests).toEqual([]);
		vi.unstubAllGlobals();
	});

	describe("editions", () => {
		it("lists the editions newest first with their status and says the dates are UTC+0", async () => {
			await renderLoaded();

			const rows = within(
				within(editionsSection()).getByRole("table")
			).getAllByRole("row");
			expect(rows[1]).toHaveTextContent("2026");
			expect(rows[1]).toHaveTextContent("In progress");
			expect(rows[1]).toHaveTextContent("2026-12-01 – 2027-01-31");
			expect(rows[2]).toHaveTextContent("2025");
			expect(rows[2]).toHaveTextContent("Frozen");
			expect(
				within(editionsSection()).getByText("Dates in UTC+0")
			).toBeInTheDocument();
			expect(
				within(editionRow(2025)).getByRole("button", {
					name: "View Rewind 2025"
				})
			).toBeInTheDocument();
		});

		it("shows the status the API sends instead of guessing it from the dates", async () => {
			editions = [
				edition({ year: 2024, status: "closed" }),
				edition({ year: 2027, status: "scheduled" }),
				edition({
					year: 2026,
					opensAt: "2099-12-01",
					closesAt: "2100-01-31",
					status: "open"
				}),
				edition({
					year: 2025,
					status: "closed",
					frozenAt: "2026-02-01T00:05:00.000Z"
				})
			];
			await renderLoaded();

			expect(editionRow(2027)).toHaveTextContent("Scheduled");
			expect(editionRow(2026)).toHaveTextContent("In progress");
			expect(editionRow(2025)).toHaveTextContent("Frozen");
			expect(editionRow(2024)).toHaveTextContent("Closed");
			expect(listed[0].get("year")).toBe("2026");
		});

		it("follows the new status after a refresh without reloading the page", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			expect(editionRow(2026)).toHaveTextContent("In progress");

			editions = editions.map(item =>
				item.year === 2026
					? { ...item, inProgress: false, status: "closed" as const }
					: item
			);
			await user.dblClick(
				screen.getByRole("button", { name: "Refresh" })
			);

			await untilVisible(() =>
				expect(editionRow(2026)).toHaveTextContent("Closed")
			);
		});

		it("creates an edition picked with the calendars and sends the exact body once on a triple click", async () => {
			editions = [];
			rewinds = [];
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(
				screen.getByRole("button", { name: /New edition/ })
			);
			await screen.findByRole("dialog", { name: "New Rewind edition" });
			expect(within(dialog()).getByText("Dates in UTC+0")).toBeVisible();

			expect(within(dialog()).getByLabelText("Year")).toHaveValue("2026");
			setField("Year", "2027");
			await pickCalendarRange(
				user,
				within(dialog()).getByRole("button", { name: /^Period:/ }),
				"2026-12-05",
				"2027-01-20"
			);
			await pickCalendarRange(
				user,
				within(dialog()).getByRole("button", {
					name: /^Grace window:/
				}),
				"2027-01-02",
				"2027-01-09"
			);
			setField("Premium AI generations", " 4 ");
			setField("Gift AI generations", "2");

			hold.add("create");
			const submit = within(dialog()).getByRole("button", {
				name: "Create edition"
			});
			await user.tripleClick(submit);
			release("create");

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(created).toEqual([
				{
					year: 2027,
					opensAt: "2026-12-05",
					closesAt: "2027-01-20",
					graceStartsAt: "2027-01-02",
					graceEndsAt: "2027-01-09",
					design: "2026",
					premiumRegenerations: 4,
					giftRegenerations: 2
				}
			]);
			expect(toastSuccess).toHaveBeenCalledWith("Rewind 2027 created.");
			expect(editionRow(2027)).toHaveTextContent(
				"2026-12-05 – 2027-01-20"
			);
		});

		it("rejects garbage quotas, a bad year and a grace window left outside the period without calling the API", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(
				screen.getByRole("button", { name: /New edition/ })
			);
			await screen.findByRole("dialog", { name: "New Rewind edition" });

			setField("Year", "19x9");
			setField("Premium AI generations", "-1");
			setField("Gift AI generations", "1001");
			await pickCalendarRange(
				user,
				within(dialog()).getByRole("button", { name: /^Period:/ }),
				"2027-12-01",
				"2027-12-31"
			);
			await user.click(
				within(dialog()).getByRole("button", { name: "Create edition" })
			);

			for (const message of [
				"Use a year from 2000 to 2100.",
				"The grace window must be inside the period.",
				"Use a whole number, 0 or more.",
				"Use at most 1000."
			])
				expect(
					within(dialog()).getByText(message, {
						selector: "ui-field-error span"
					})
				).toBeInTheDocument();
			expect(created).toEqual([]);
		});

		it("explains a duplicate year, hides it while the year changes and shows it again on the same year", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(
				screen.getByRole("button", { name: /New edition/ })
			);
			await screen.findByRole("dialog", { name: "New Rewind edition" });

			setField("Year", "2026");
			await user.click(
				within(dialog()).getByRole("button", { name: "Create edition" })
			);
			await untilVisible(() =>
				expect(
					within(dialog()).getByText(
						"There is already an edition for that year."
					)
				).toBeInTheDocument()
			);

			setField("Year", "2030");
			expect(
				within(dialog()).queryByText(
					"There is already an edition for that year."
				)
			).toBeNull();
			setField("Year", "2026");
			expect(
				within(dialog()).getByText(
					"There is already an edition for that year."
				)
			).toBeInTheDocument();
		});

		it("explains an overlapping period under the period picker", async () => {
			editions = [
				edition({
					year: 2026,
					closesAt: "2027-12-15",
					graceEndsAt: "2027-12-01"
				})
			];
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(
				screen.getByRole("button", { name: /New edition/ })
			);
			await screen.findByRole("dialog", { name: "New Rewind edition" });

			expect(
				within(dialog()).getByRole("button", { name: /^Period:/ })
			).toHaveAccessibleName("Period: Dec 1, 2027 – Jan 31, 2028");
			await user.click(
				within(dialog()).getByRole("button", { name: "Create edition" })
			);

			await untilVisible(() =>
				expect(
					within(dialog()).getByText(
						"The period overlaps another edition. Choose other dates."
					)
				).toBeInTheDocument()
			);
			expect(
				within(dialog()).getByRole("button", { name: /^Period:/ })
			).toHaveAttribute("aria-invalid", "true");
		});

		it("warns before saving an edition in progress and keeps the changes when the admin goes back", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await openEdition(2026, "Edit");
			await screen.findByRole("dialog", { name: "Edit Rewind 2026" });

			setField("Premium AI generations", "5");
			await user.click(
				within(dialog()).getByRole("button", { name: "Save edition" })
			);

			const warning = await screen.findByRole("dialog", {
				name: "Save Rewind 2026?"
			});
			expect(warning).toHaveTextContent(
				"12 Rewinds are already generated"
			);
			expect(warning).toHaveTextContent(
				"can change how many AI generations users with a Rewind in progress have left"
			);
			expect(updated).toEqual([]);

			await user.click(
				within(warning).getByRole("button", { name: "Back" })
			);
			await screen.findByRole("dialog", { name: "Edit Rewind 2026" });
			expect(
				within(dialog()).getByLabelText("Premium AI generations")
			).toHaveValue("5");

			await user.click(
				within(dialog()).getByRole("button", { name: "Save edition" })
			);
			const again = await screen.findByRole("dialog", {
				name: "Save Rewind 2026?"
			});
			await user.click(
				within(again).getByRole("checkbox", {
					name: "Also apply to the Rewinds already generated"
				})
			);
			hold.add("update");
			await user.dblClick(
				within(again).getByRole("button", { name: "Save changes" })
			);
			release("update");

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(updated).toHaveLength(1);
			expect(updated[0]).toEqual({
				year: 2026,
				body: {
					opensAt: "2026-12-01",
					closesAt: "2027-01-31",
					graceStartsAt: "2027-01-01",
					graceEndsAt: "2027-01-07",
					design: "2026",
					premiumRegenerations: 5,
					giftRegenerations: 1,
					applyToGenerated: true
				}
			});
			expect(toastSuccess).toHaveBeenCalledWith(
				"Rewind 2026 saved. 2 generated Rewinds were updated."
			);
			expect(editionRow(2026)).toHaveTextContent("5");
		});

		it("sends applyToGenerated false when the box stays unchecked and does not report updated Rewinds", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await openEdition(2026, "Edit");
			await screen.findByRole("dialog", { name: "Edit Rewind 2026" });

			setField("Gift AI generations", "3");
			await user.click(
				within(dialog()).getByRole("button", { name: "Save edition" })
			);
			const warning = await screen.findByRole("dialog", {
				name: "Save Rewind 2026?"
			});
			const checkbox = within(warning).getByRole("checkbox");
			await user.click(checkbox);
			await user.click(checkbox);
			await user.click(
				within(warning).getByRole("button", { name: "Save changes" })
			);

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(updated[0].body.applyToGenerated).toBe(false);
			expect(toastSuccess).toHaveBeenCalledWith("Rewind 2026 saved.");
		});

		it("saves an edition that is not in progress without the warning", async () => {
			editions = [...editions, edition({ year: 2027 })];
			const user = userEvent.setup();
			await renderLoaded();
			await openEdition(2027, "Edit");
			await screen.findByRole("dialog", { name: "Edit Rewind 2027" });

			setField("Premium AI generations", "9");
			await user.click(
				within(dialog()).getByRole("button", { name: "Save edition" })
			);

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).toBeNull()
			);
			expect(updated).toHaveLength(1);
			expect(updated[0].body).not.toHaveProperty("applyToGenerated");
			expect(updated[0].body.premiumRegenerations).toBe(9);
		});

		it("shows a frozen edition read only", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await openEdition(2025, "View");

			const view = await screen.findByRole("dialog", {
				name: "Rewind 2025"
			});
			expect(view).toHaveTextContent("2025-12-01 – 2026-01-31");
			expect(within(view).queryByRole("textbox")).toBeNull();
			expect(
				within(view).queryByRole("button", { name: /Save/ })
			).toBeNull();
			await user.click(
				within(view).getByRole("button", { name: "Close" })
			);
			expect(screen.queryByRole("dialog")).toBeNull();
			expect(updated).toEqual([]);
		});

		it("closes the dialog and reloads when the edition was frozen in the meantime", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await openEdition(2026, "Edit");
			await screen.findByRole("dialog", { name: "Edit Rewind 2026" });
			editions = editions.map(item =>
				item.year === 2026
					? {
							...item,
							inProgress: false,
							status: "closed" as const,
							frozenAt: "2027-02-01T00:00:00Z"
						}
					: item
			);

			await user.click(
				within(dialog()).getByRole("button", { name: "Save edition" })
			);
			await user.click(
				within(
					await screen.findByRole("dialog", {
						name: "Save Rewind 2026?"
					})
				).getByRole("button", { name: "Save changes" })
			);

			await untilVisible(() =>
				expect(
					screen.getByText(
						"That edition was frozen in the meantime, so it can no longer be edited."
					)
				).toBeInTheDocument()
			);
			expect(screen.queryByRole("dialog")).toBeNull();
			await untilVisible(() =>
				expect(editionRow(2026)).toHaveTextContent("Frozen")
			);
		});
	});

	describe("rewinds table", () => {
		it("lists the Rewinds of the edition in progress with type, AI generations left, grace and frozen", async () => {
			await renderLoaded();

			expect(listed[0].get("year")).toBe("2026");
			expect(listed[0].get("limit")).toBe("50");
			expect(listed[0].get("offset")).toBe("0");
			expect(rewindRow("ada")).toHaveTextContent("Premium");
			expect(rewindRow("grace")).toHaveTextContent("Gift");
			expect(rewindRow("grace")).toHaveTextContent("Used");
			expect(rewindRow("linus")).toHaveTextContent("No AI");
			expect(rewindRow("ada")).toHaveTextContent("Live");
			expect(
				within(within(rewindsSection()).getByRole("table")).queryByText(
					"margaret"
				)
			).toBeNull();
		});

		it("edits the AI generations left in the row, refusing garbage and sending one PATCH on a double click", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(
				within(rewindRow("ada")).getByRole("button", {
					name: "Edit AI generations left for ada"
				})
			);
			const field = within(rewindRow("ada")).getByRole("textbox", {
				name: "AI generations left for ada"
			});
			expect(field).toHaveValue("2");

			fireEvent.input(field, { target: { value: "dos" } });
			fireEvent.keyDown(field, { key: "Enter" });
			expect(
				within(rewindRow("ada")).getByText(
					"Use a whole number, 0 or more."
				)
			).toBeInTheDocument();
			expect(field).toHaveAttribute("aria-invalid", "true");
			expect(patched).toEqual([]);

			fireEvent.input(field, { target: { value: "7" } });
			hold.add("patch");
			await user.dblClick(
				within(rewindRow("ada")).getByRole("button", {
					name: "Save AI generations left for ada"
				})
			);
			fireEvent.keyDown(field, { key: "Enter" });
			release("patch");

			await untilVisible(() =>
				expect(
					within(rewindRow("ada")).queryByRole("textbox")
				).toBeNull()
			);
			expect(patched).toEqual([
				{ id: "r-ada", body: { regenerationsLeft: 7 } }
			]);
			expect(rewindRow("ada")).toHaveTextContent("7");
			expect(toastSuccess).toHaveBeenCalledWith(
				"ada now has 7 AI generations left."
			);
		});

		it("cancels with Escape, skips the request when the value did not change and only edits one row at a time", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(
				within(rewindRow("ada")).getByRole("button", {
					name: "Edit AI generations left for ada"
				})
			);
			const field = within(rewindRow("ada")).getByRole("textbox");
			fireEvent.input(field, { target: { value: "40" } });
			fireEvent.keyDown(field, { key: "Escape" });
			expect(within(rewindRow("ada")).queryByRole("textbox")).toBeNull();
			expect(rewindRow("ada")).toHaveTextContent("2");

			await user.click(
				within(rewindRow("ada")).getByRole("button", {
					name: "Edit AI generations left for ada"
				})
			);
			await user.click(
				within(rewindRow("grace")).getByRole("button", {
					name: "Edit AI generations left for grace"
				})
			);
			expect(within(rewindRow("ada")).queryByRole("textbox")).toBeNull();
			const graceField = within(rewindRow("grace")).getByRole("textbox");
			fireEvent.keyDown(graceField, { key: "Enter" });
			expect(
				within(rewindRow("grace")).queryByRole("textbox")
			).toBeNull();
			expect(patched).toEqual([]);
		});

		it("keeps the editor open with the server message when the API refuses the value", async () => {
			failures.patch = [
				{
					status: 422,
					body: {
						type: "COMMON_SCHEMA_INVALID",
						issues: [
							{ path: "regenerationsLeft", message: "Too many" }
						]
					}
				}
			];
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(
				within(rewindRow("grace")).getByRole("button", {
					name: "Edit AI generations left for grace"
				})
			);
			const field = within(rewindRow("grace")).getByRole("textbox");
			fireEvent.input(field, { target: { value: "3" } });
			fireEvent.keyDown(field, { key: "Enter" });

			await untilVisible(() =>
				expect(
					within(rewindRow("grace")).getByText("Too many")
				).toBeInTheDocument()
			);
			fireEvent.input(field, { target: { value: "4" } });
			expect(
				within(rewindRow("grace")).queryByText("Too many")
			).toBeNull();
			fireEvent.keyDown(field, { key: "Enter" });
			await untilVisible(() =>
				expect(rewindRow("grace")).toHaveTextContent("4")
			);
		});

		it("reports a Rewind deleted by someone else and refreshes the table", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.click(
				within(rewindRow("linus")).getByRole("button", {
					name: "Edit AI generations left for linus"
				})
			);
			rewinds = rewinds.filter(item => item.id !== "r-linus");
			const field = within(rewindRow("linus")).getByRole("textbox");
			fireEvent.input(field, { target: { value: "1" } });
			fireEvent.keyDown(field, { key: "Enter" });

			await untilVisible(() =>
				expect(
					screen.getByText("The Rewind of linus no longer exists.")
				).toBeInTheDocument()
			);
			await untilVisible(() =>
				expect(
					within(
						within(rewindsSection()).getByRole("table")
					).queryByText("linus")
				).toBeNull()
			);
		});

		it("searches by username once the typing settles and switches year", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const search = within(rewindsSection()).getByRole("textbox", {
				name: "Filter Rewinds by username"
			});

			for (const value of ["g", "gr", "gra"])
				fireEvent.input(search, { target: { value } });
			await untilVisible(() =>
				expect(
					within(
						within(rewindsSection()).getByRole("table")
					).queryByText("ada")
				).toBeNull()
			);
			expect(listed.filter(params => params.has("search"))).toHaveLength(
				1
			);
			expect(listed.at(-1)?.get("search")).toBe("gra");
			expect(listed.some(params => params.has("q"))).toBe(false);
			expect(rewindRow("grace")).toBeInTheDocument();

			fireEvent.input(search, { target: { value: "" } });
			await untilVisible(() =>
				expect(rewindRow("ada")).toBeInTheDocument()
			);

			await user.click(
				within(rewindsSection()).getByRole("button", { name: /^Year/ })
			);
			const menu = await screen.findByRole("menu");
			await user.click(
				within(menu).getByRole("menuitemradio", { name: "2025" })
			);
			await untilVisible(() =>
				expect(rewindRow("margaret")).toHaveTextContent("UTC")
			);
			expect(listed.at(-1)?.get("year")).toBe("2025");
			expect(listed.at(-1)?.get("offset")).toBe("0");
		});

		it("pages through the Rewinds with limit and offset", async () => {
			rewinds = Array.from({ length: 51 }, (_, index) =>
				rewind({
					id: `r-${index}`,
					username: `player${String(index).padStart(2, "0")}`
				})
			);
			const user = userEvent.setup();
			await renderLoaded();
			expect(rewindRow("player00")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(rewindRow("player50")).toBeInTheDocument()
			);
			expect(listed.at(-1)?.get("offset")).toBe("50");
		});
	});
});
