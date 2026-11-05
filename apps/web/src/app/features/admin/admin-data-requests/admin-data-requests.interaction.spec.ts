import "@testing-library/jest-dom/vitest";

import { provideHttpClient, withInterceptors } from "@angular/common/http";
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
import { errorInterceptor } from "../../../core/interceptors/error.interceptor";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { DATA_REQUEST_ERROR_MESSAGES } from "../../../core/utils/data-request-error-message";
import { type AdminDataRequest } from "../services/data-request-admin.model";
import { AdminDataRequests } from "./admin-data-requests";

const QUEUE_URL = `${environment.apiUrl}/admin/data-requests`;

function adminRequest(
	overrides: Partial<AdminDataRequest> = {}
): AdminDataRequest {
	return {
		id: "r1",
		type: "export",
		status: "pending",
		requestedAt: "2026-11-01T12:00:00.000Z",
		resolvedAt: null,
		dueAt: "2026-12-01T12:00:00.000Z",
		daysRemaining: 26,
		downloadableUntil: null,
		resolutionNote: null,
		user: { id: "u1", username: "ada", email: "ada@example.com" },
		...overrides
	};
}

const ADA_EXPORT = adminRequest();
const BOB_DELETION = adminRequest({
	id: "r2",
	type: "deletion",
	daysRemaining: 3,
	dueAt: "2026-11-08T12:00:00.000Z",
	user: { id: "u2", username: "bob", email: "bob@example.com" }
});
const OVERDUE_ORPHAN = adminRequest({
	id: "r3",
	type: "deletion",
	daysRemaining: -2,
	dueAt: "2026-11-03T12:00:00.000Z",
	user: null
});

const toast = {
	success: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	premium: vi.fn()
};

type User = ReturnType<typeof userEvent.setup>;

describe("Admin data requests interaction", () => {
	let http: HttpTestingController;

	beforeEach(() => {
		Object.values(toast).forEach(fn => fn.mockReset());
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
	});

	afterEach(() => {
		http.verify();
		vi.unstubAllGlobals();
	});

	async function renderQueue(requests: AdminDataRequest[] = [ADA_EXPORT, BOB_DELETION]) {
		const accountDeleted = vi.fn();
		const view = await render(AdminDataRequests, {
			providers: [
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting(),
				provideRouter([]),
				{
					provide: AuthService,
					useValue: {
						token: () => null,
						refresh: vi.fn(),
						clearSession: vi.fn()
					}
				},
				{ provide: ToastService, useValue: toast }
			],
			on: { accountDeleted }
		});
		http = TestBed.inject(HttpTestingController);
		flushQueue(requests);
		view.fixture.detectChanges();
		return { ...view, accountDeleted };
	}

	function queueRequests(): TestRequest[] {
		return http.match(req => req.method === "GET" && req.url === QUEUE_URL);
	}

	function flushQueue(requests: AdminDataRequest[], total = requests.length) {
		const [request] = queueRequests();
		expect(request).toBeDefined();
		request!.flush({ data: { requests, total } });
		return request!;
	}

	function row(name: string) {
		return screen.getByRole("listitem", { name });
	}

	it("lists pending requests first by due date with the user, type and days left", async () => {
		await renderQueue([BOB_DELETION, ADA_EXPORT]);

		const items = within(
			screen.getByRole("list", { name: "Data requests" })
		).getAllByRole("listitem");
		expect(items.map(item => item.getAttribute("aria-label"))).toEqual([
			"Account deletion request from bob",
			"Copy of data request from ada"
		]);
		const bob = row("Account deletion request from bob");
		expect(within(bob).getByText("3 days left").closest("ui-badge")).toHaveClass("text-warning");
		expect(within(bob).getByText("bob@example.com")).toBeInTheDocument();
		expect(within(bob).getByText(/Requested Nov 1, 2026/)).toBeInTheDocument();
		expect(within(row("Copy of data request from ada")).getByText("26 days left")).toBeInTheDocument();
	});

	it("asks for pending requests by default and switches the status filter", async () => {
		const user = userEvent.setup();
		await renderQueue([]);

		expect(
			screen.getByText(/No pending data requests/)
		).toBeInTheDocument();

		await user.click(screen.getByRole("radio", { name: "Rejected" }));
		const [rejected] = queueRequests();
		expect(rejected!.request.params.get("status")).toBe("rejected");
		expect(rejected!.request.params.get("offset")).toBe("0");
		rejected!.flush({
			data: {
				requests: [
					adminRequest({
						status: "rejected",
						resolvedAt: "2026-11-02T12:00:00.000Z",
						resolutionNote: "Not the owner."
					})
				],
				total: 1
			}
		});

		const item = await screen.findByRole("listitem", {
			name: "Copy of data request from ada"
		});
		expect(within(item).getByText("Rejected")).toBeInTheDocument();
		expect(within(item).getByText("Reason: Not the owner.")).toBeInTheDocument();
		expect(within(item).queryByRole("button", { name: /Complete/ })).not.toBeInTheDocument();

		await user.click(screen.getByRole("radio", { name: "All" }));
		const [all] = queueRequests();
		expect(all!.request.params.has("status")).toBe(false);
		all!.flush({ data: { requests: [], total: 0 } });
	});

	it("marks an overdue request and a deleted account", async () => {
		await renderQueue([OVERDUE_ORPHAN]);

		const item = row("Account deletion request from Deleted account");
		expect(within(item).getByText("Overdue by 2 days").closest("ui-badge")).toHaveClass("text-danger");
		expect(within(item).getByText("Deleted account")).toBeInTheDocument();
	});

	it("completes an export right away and reloads the queue", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			screen.getByRole("button", {
				name: "Complete copy of data request from ada"
			})
		);
		const complete = http.expectOne(`${QUEUE_URL}/r1/complete`);
		expect(complete.request.method).toBe("POST");
		complete.flush({
			data: { request: { ...ADA_EXPORT, status: "completed" } }
		});

		expect(toast.success).toHaveBeenCalledWith(
			expect.stringContaining("Copy of data for ada is ready")
		);
		flushQueue([BOB_DELETION]);
		await waitFor(() =>
			expect(
				screen.queryByRole("listitem", {
					name: "Copy of data request from ada"
				})
			).not.toBeInTheDocument()
		);
	});

	async function openDeletionConfirmation(user: User) {
		await user.click(
			screen.getByRole("button", {
				name: "Complete account deletion request from bob"
			})
		);
		return screen.findByRole("dialog", {
			name: "Complete account deletion?"
		});
	}

	it("deletes an account only after typing its username", async () => {
		const user = userEvent.setup();
		const { accountDeleted } = await renderQueue();

		const dialog = await openDeletionConfirmation(user);
		expect(within(dialog).getByText(/can't be undone/)).toBeInTheDocument();
		const confirm = within(dialog).getByRole("button", {
			name: "Delete account"
		});
		expect(confirm).toBeDisabled();
		http.expectNone(`${QUEUE_URL}/r2/complete`);

		await user.type(within(dialog).getByLabelText("Type bob to confirm"), "bob");
		await user.click(confirm);
		http.expectOne(`${QUEUE_URL}/r2/complete`).flush({
			data: { request: { ...BOB_DELETION, status: "completed" } }
		});

		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		expect(accountDeleted).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith(
			"Account bob deleted. The request is completed."
		);
		flushQueue([ADA_EXPORT]);
	});

	it("cancelling the deletion sends nothing", async () => {
		const user = userEvent.setup();
		await renderQueue();

		const dialog = await openDeletionConfirmation(user);
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		http.expectNone(`${QUEUE_URL}/r2/complete`);
	});

	it("explains a forbidden deletion and refreshes the queue", async () => {
		const user = userEvent.setup();
		const { accountDeleted } = await renderQueue();

		const dialog = await openDeletionConfirmation(user);
		await user.type(within(dialog).getByLabelText("Type bob to confirm"), "bob");
		await user.click(within(dialog).getByRole("button", { name: "Delete account" }));
		http.expectOne(`${QUEUE_URL}/r2/complete`).flush(
			{ type: "USER_DELETE_FORBIDDEN" },
			{ status: 409, statusText: "Conflict" }
		);

		await waitFor(() =>
			expect(toast.warning).toHaveBeenCalledWith(
				DATA_REQUEST_ERROR_MESSAGES["USER_DELETE_FORBIDDEN"]
			)
		);
		expect(toast.error).not.toHaveBeenCalled();
		expect(accountDeleted).not.toHaveBeenCalled();
		flushQueue([ADA_EXPORT, BOB_DELETION]);
	});

	it("requires a reason to reject and sends it trimmed", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			screen.getByRole("button", {
				name: "Reject copy of data request from ada"
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Reject request?"
		});
		const submit = within(dialog).getByRole("button", {
			name: "Reject request"
		});

		await user.click(submit);
		expect(
			within(dialog).getByText("Explain why the request is rejected.")
		).toBeInTheDocument();
		await user.type(within(dialog).getByLabelText("Reason"), "   ");
		await user.click(submit);
		http.expectNone(`${QUEUE_URL}/r1/reject`);

		await user.type(
			within(dialog).getByLabelText("Reason"),
			"Could not verify the owner.  "
		);
		await user.click(submit);
		const reject = http.expectOne(`${QUEUE_URL}/r1/reject`);
		expect(reject.request.body).toEqual({
			reason: "Could not verify the owner."
		});
		reject.flush({
			data: { request: { ...ADA_EXPORT, status: "rejected" } }
		});

		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		expect(toast.success).toHaveBeenCalledWith(
			expect.stringContaining("rejected")
		);
		flushQueue([BOB_DELETION]);
	});

	it("warns when the request was already resolved by someone else", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			screen.getByRole("button", {
				name: "Complete copy of data request from ada"
			})
		);
		http.expectOne(`${QUEUE_URL}/r1/complete`).flush(
			{ type: "DATA_REQUEST_NOT_PENDING" },
			{ status: 409, statusText: "Conflict" }
		);

		await waitFor(() =>
			expect(toast.warning).toHaveBeenCalledWith(
				DATA_REQUEST_ERROR_MESSAGES["DATA_REQUEST_NOT_PENDING"]
			)
		);
		flushQueue([BOB_DELETION]);
	});

	it("offers Try again when the queue fails to load", async () => {
		const user = userEvent.setup();
		const view = await render(AdminDataRequests, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: ToastService, useValue: toast }
			]
		});
		http = TestBed.inject(HttpTestingController);
		queueRequests()[0]!.flush(null, { status: 500, statusText: "Error" });
		view.fixture.detectChanges();

		await user.click(await screen.findByRole("button", { name: "Try again" }));
		flushQueue([ADA_EXPORT]);

		expect(
			await screen.findByRole("listitem", {
				name: "Copy of data request from ada"
			})
		).toBeInTheDocument();
	});
});
