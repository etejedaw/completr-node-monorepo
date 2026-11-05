import { HttpHeaders, provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import { ExportService } from "../../../core/services/export";
import { type AdminDataRequestPage } from "./data-request-admin.model";
import { DataRequestAdminService } from "./data-request-admin.service";

const ADMIN_URL = `${environment.apiUrl}/admin`;

const PAGE: AdminDataRequestPage = {
	requests: [
		{
			id: "r1",
			type: "deletion",
			status: "pending",
			requestedAt: "2026-11-01T12:00:00.000Z",
			resolvedAt: null,
			dueAt: "2026-12-01T12:00:00.000Z",
			daysRemaining: 26,
			downloadableUntil: null,
			resolutionNote: null,
			user: { id: "u1", username: "ada", email: "ada@example.com" }
		}
	],
	total: 1
};

describe("DataRequestAdminService", () => {
	let service: DataRequestAdminService;
	let httpTesting: HttpTestingController;
	let saveFile: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(DataRequestAdminService);
		httpTesting = TestBed.inject(HttpTestingController);
		saveFile = vi
			.spyOn(TestBed.inject(ExportService), "saveFile")
			.mockImplementation(() => undefined);
	});

	afterEach(() => {
		httpTesting.verify();
		saveFile.mockRestore();
	});

	it("lists the queue with the status filter and the page", () => {
		let page: AdminDataRequestPage | null = null;
		service
			.list({ status: "pending", limit: 20, offset: 40 })
			.subscribe(value => (page = value));

		const req = httpTesting.expectOne(
			r => r.url === `${ADMIN_URL}/data-requests`
		);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("status")).toBe("pending");
		expect(req.request.params.get("limit")).toBe("20");
		expect(req.request.params.get("offset")).toBe("40");
		expect(req.request.params.has("type")).toBe(false);
		req.flush({ data: PAGE });

		expect(page).toEqual(PAGE);
	});

	it("omits the status when every request is listed", () => {
		service.list({ limit: 20, offset: 0 }).subscribe();

		const req = httpTesting.expectOne(
			r => r.url === `${ADMIN_URL}/data-requests`
		);
		expect(req.request.params.has("status")).toBe(false);
		req.flush({ data: { requests: [], total: 0 } });
	});

	it("completes a request", () => {
		service.complete("r1").subscribe();

		const req = httpTesting.expectOne(
			`${ADMIN_URL}/data-requests/r1/complete`
		);
		expect(req.request.method).toBe("POST");
		req.flush({ data: { request: PAGE.requests[0] } });
	});

	it("rejects a request with the reason", () => {
		service.reject("r1", "Could not verify the owner.").subscribe();

		const req = httpTesting.expectOne(
			`${ADMIN_URL}/data-requests/r1/reject`
		);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({
			reason: "Could not verify the owner."
		});
		req.flush({ data: { request: PAGE.requests[0] } });
	});

	it("downloads the data of a user as a JSON attachment", () => {
		service.downloadUserData("u1", "ada").subscribe();

		const req = httpTesting.expectOne(
			r => r.url === `${ADMIN_URL}/users/u1/data-export`
		);
		expect(req.request.method).toBe("GET");
		expect(req.request.responseType).toBe("blob");
		req.flush(new Blob(["{}"]), {
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

	it("deletes a user account", () => {
		let completed = false;
		service.deleteUser("u1").subscribe({ complete: () => (completed = true) });

		const req = httpTesting.expectOne(`${ADMIN_URL}/users/u1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null, { status: 204, statusText: "No Content" });

		expect(completed).toBe(true);
	});
});
