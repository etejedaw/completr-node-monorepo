import "@testing-library/jest-dom/vitest";

import {
	HttpHeaders,
	provideHttpClient,
	withInterceptors
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { errorInterceptor } from "../../../core/interceptors/error.interceptor";
import { type DataRequest } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ExportService } from "../../../core/services/export";
import { ToastService } from "../../../core/services/toast";
import { DATA_REQUEST_ERROR_MESSAGES } from "../../../core/utils/data-request-error-message";
import { SettingsData } from "./settings-data";

const REQUESTS_URL = `${environment.apiUrl}/users/me/data-requests`;

function dataRequest(overrides: Partial<DataRequest> = {}): DataRequest {
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
		...overrides
	};
}

const READY_EXPORT = dataRequest({
	id: "ready",
	status: "completed",
	resolvedAt: "2026-11-03T12:00:00.000Z",
	downloadableUntil: "2099-01-01T12:00:00.000Z"
});
const EXPIRED_EXPORT = dataRequest({
	id: "expired",
	status: "completed",
	requestedAt: "2026-01-01T12:00:00.000Z",
	resolvedAt: "2026-01-03T12:00:00.000Z",
	dueAt: "2026-01-31T12:00:00.000Z",
	downloadableUntil: "2026-01-10T12:00:00.000Z"
});
const REJECTED_DELETION = dataRequest({
	id: "rejected",
	type: "deletion",
	status: "rejected",
	resolvedAt: "2026-11-02T12:00:00.000Z",
	resolutionNote: "We couldn't verify the owner of the account."
});

const toast = {
	success: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	premium: vi.fn()
};

type User = ReturnType<typeof userEvent.setup>;

describe("Settings › Your data interaction", () => {
	let http: HttpTestingController;
	let saveFile: ReturnType<typeof vi.spyOn>;

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
		saveFile.mockRestore();
		vi.unstubAllGlobals();
	});

	async function renderData(requests: DataRequest[] = []) {
		const view = await render(SettingsData, {
			providers: [
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting(),
				{
					provide: AuthService,
					useValue: {
						token: () => null,
						refresh: vi.fn(),
						clearSession: vi.fn()
					}
				},
				{ provide: ToastService, useValue: toast }
			]
		});
		http = TestBed.inject(HttpTestingController);
		saveFile = vi
			.spyOn(TestBed.inject(ExportService), "saveFile")
			.mockImplementation(() => undefined);
		flushList(requests);
		view.fixture.detectChanges();
		return view;
	}

	function flushList(requests: DataRequest[]) {
		http.expectOne({ method: "GET", url: REQUESTS_URL }).flush({
			data: { requests }
		});
	}

	function expectCreate(): TestRequest {
		return http.expectOne({ method: "POST", url: REQUESTS_URL });
	}

	function history() {
		return screen.getByRole("list", { name: "Your requests" });
	}

	function exportButton() {
		return screen.getByRole("button", {
			name: /Request a copy of your data|Sending…/
		});
	}

	function deletionButton() {
		return screen.getByRole("button", { name: "Request account deletion" });
	}

	async function openDeletionDialog(user: User) {
		await user.click(deletionButton());
		return screen.findByRole("dialog", {
			name: "Request account deletion?"
		});
	}

	it("explains both rights and the 30-day answer window", async () => {
		await renderData();

		expect(
			screen.getByText(/We answer every request within 30 days/)
		).toBeInTheDocument();
		expect(screen.getByText(/A JSON file with everything stored/)).toBeInTheDocument();
		expect(screen.getByText(/deleted for good/)).toBeInTheDocument();
		expect(
			screen.getByText("You haven't made any requests yet.")
		).toBeInTheDocument();
	});

	it("requests a copy of the data and adds it to the history", async () => {
		const user = userEvent.setup();
		await renderData();

		await user.click(exportButton());
		const create = expectCreate();
		expect(create.request.body).toEqual({ type: "export" });
		expect(exportButton()).toBeDisabled();
		create.flush({ data: { request: dataRequest() } });

		await waitFor(() =>
			expect(
				within(history()).getByText("Copy of data")
			).toBeInTheDocument()
		);
		expect(within(history()).getByText("Pending")).toBeInTheDocument();
		expect(exportButton()).toBeDisabled();
		expect(screen.getByText(/Pending · due Dec 1, 2026/)).toBeInTheDocument();
		expect(toast.success).toHaveBeenCalledWith(
			expect.stringContaining("by Dec 1, 2026")
		);
	});

	it("disables only the action that already has a pending request", async () => {
		await renderData([dataRequest({ type: "deletion" })]);

		expect(deletionButton()).toBeDisabled();
		expect(exportButton()).toBeEnabled();
	});

	it("asks for confirmation before requesting the deletion", async () => {
		const user = userEvent.setup();
		await renderData();

		const dialog = await openDeletionDialog(user);
		expect(within(dialog).getByText(/can't be undone/)).toBeInTheDocument();
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		http.expectNone({ method: "POST", url: REQUESTS_URL });

		const again = await openDeletionDialog(user);
		await user.click(
			within(again).getByRole("button", { name: "Request deletion" })
		);
		const create = expectCreate();
		expect(create.request.body).toEqual({ type: "deletion" });
		create.flush({
			data: { request: dataRequest({ id: "d1", type: "deletion" }) }
		});

		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		expect(deletionButton()).toBeDisabled();
		expect(
			within(history()).getByText("Account deletion")
		).toBeInTheDocument();
	});

	it("warns once and resyncs when a request of that type is already pending", async () => {
		const user = userEvent.setup();
		await renderData();

		await user.click(exportButton());
		expectCreate().flush(
			{ type: "DATA_REQUEST_ALREADY_PENDING" },
			{ status: 409, statusText: "Conflict" }
		);

		await waitFor(() =>
			expect(toast.warning).toHaveBeenCalledWith(
				DATA_REQUEST_ERROR_MESSAGES["DATA_REQUEST_ALREADY_PENDING"]
			)
		);
		expect(toast.warning).toHaveBeenCalledTimes(1);
		flushList([dataRequest()]);
		await waitFor(() => expect(exportButton()).toBeDisabled());
	});

	it("shows the status, dates and the rejection reason of each request", async () => {
		await renderData([READY_EXPORT, REJECTED_DELETION]);

		const rejected = within(history())
			.getByText("Account deletion")
			.closest("li") as HTMLElement;
		expect(within(rejected).getByText("Rejected")).toBeInTheDocument();
		expect(
			within(rejected).getByText(
				"Reason: We couldn't verify the owner of the account."
			)
		).toBeInTheDocument();
		expect(within(rejected).getByText(/Requested Nov 1, 2026/)).toBeInTheDocument();
		expect(within(rejected).getByText(/Resolved Nov 2, 2026/)).toBeInTheDocument();
	});

	it("downloads a completed copy while it is available", async () => {
		const user = userEvent.setup();
		await renderData([READY_EXPORT]);

		expect(within(history()).getByText(/Available until/)).toBeInTheDocument();
		await user.click(
			within(history()).getByRole("button", {
				name: "Download your data from Nov 1, 2026"
			})
		);
		const download = http.expectOne(`${REQUESTS_URL}/ready/download`);
		expect(download.request.responseType).toBe("blob");
		download.flush(new Blob(["{}"]), {
			headers: new HttpHeaders({
				"Content-Disposition":
					'attachment; filename="completr-data-ada-2026-11-05.json"'
			})
		});

		expect(saveFile).toHaveBeenCalledWith(
			expect.any(Blob),
			"completr-data-ada-2026-11-05.json"
		);
	});

	it("says an old copy expired instead of offering the download", async () => {
		await renderData([EXPIRED_EXPORT]);

		expect(
			within(history()).getByText(/Download expired on Jan 10, 2026/)
		).toBeInTheDocument();
		expect(
			within(history()).queryByRole("button", { name: /Download/ })
		).not.toBeInTheDocument();
	});

	it("explains a download that expired on the server and refreshes the history", async () => {
		const user = userEvent.setup();
		await renderData([READY_EXPORT]);

		await user.click(
			within(history()).getByRole("button", { name: /Download your data/ })
		);
		http.expectOne(`${REQUESTS_URL}/ready/download`).flush(
			new Blob([JSON.stringify({ type: "DATA_REQUEST_EXPIRED" })], {
				type: "application/json"
			}),
			{ status: 410, statusText: "Gone" }
		);

		await waitFor(() =>
			expect(toast.warning).toHaveBeenCalledWith(
				DATA_REQUEST_ERROR_MESSAGES["DATA_REQUEST_EXPIRED"]
			)
		);
		flushList([EXPIRED_EXPORT]);
		await waitFor(() =>
			expect(within(history()).getByText(/Download expired/)).toBeInTheDocument()
		);
	});

	it("offers Try again when the history fails to load", async () => {
		const user = userEvent.setup();
		const view = await render(SettingsData, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast }
			]
		});
		http = TestBed.inject(HttpTestingController);
		saveFile = vi.spyOn(TestBed.inject(ExportService), "saveFile");
		http.expectOne(REQUESTS_URL).flush(null, {
			status: 500,
			statusText: "Server Error"
		});
		view.fixture.detectChanges();

		await user.click(
			await screen.findByRole("button", { name: "Try again" })
		);
		flushList([READY_EXPORT]);

		await waitFor(() =>
			expect(within(history()).getByText("Copy of data")).toBeInTheDocument()
		);
	});
});
