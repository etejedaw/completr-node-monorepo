import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import { ReportsService } from "./reports.service";

const url = `${environment.apiUrl}/admin/game-reports`;

describe("ReportsService", () => {
	let service: ReportsService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(ReportsService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it("lists the pending reports with their category", () => {
		let result: unknown;
		service.getPendingReports().subscribe(r => (result = r));

		http.expectOne(url).flush({
			data: { reports: [{ id: "r1", category: "missing_score" }] }
		});

		expect(result).toEqual([{ id: "r1", category: "missing_score" }]);
	});

	it("patches only the status", () => {
		service.updateReportStatus("r1", "approved").subscribe();

		const request = http.expectOne(`${url}/r1`);
		expect(request.request.method).toBe("PATCH");
		expect(request.request.body).toEqual({ status: "approved" });
		request.flush({ data: { report: { id: "r1" } } });
	});

	it("surfaces a 404 Problem Details to the caller", () => {
		let status = 0;
		service
			.updateReportStatus("gone", "rejected")
			.subscribe({ error: err => (status = err.status) });

		http.expectOne(`${url}/gone`).flush(
			{ type: "GAME_REPORT_NOT_FOUND" },
			{ status: 404, statusText: "Not Found" }
		);

		expect(status).toBe(404);
	});
});
