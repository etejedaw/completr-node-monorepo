import { HttpHeaders, provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { type DataRequest } from "../models";
import { dataExportFallbackName, DataRequestsService } from "./data-requests";
import { ExportService } from "./export";

const URL_BASE = `${environment.apiUrl}/users/me/data-requests`;

const EXPORT_REQUEST: DataRequest = {
	id: "r1",
	type: "export",
	status: "pending",
	requestedAt: "2026-11-01T12:00:00.000Z",
	resolvedAt: null,
	dueAt: "2026-12-01T12:00:00.000Z",
	daysRemaining: 26,
	downloadableUntil: null,
	resolutionNote: null
};

describe("DataRequestsService", () => {
	let service: DataRequestsService;
	let httpTesting: HttpTestingController;
	let saveFile: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(DataRequestsService);
		httpTesting = TestBed.inject(HttpTestingController);
		saveFile = vi
			.spyOn(TestBed.inject(ExportService), "saveFile")
			.mockImplementation(() => undefined);
	});

	afterEach(() => {
		httpTesting.verify();
		saveFile.mockRestore();
	});

	it("lists the requests of the current user", () => {
		let requests: DataRequest[] = [];
		service.list().subscribe(value => (requests = value));

		const req = httpTesting.expectOne(URL_BASE);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { requests: [EXPORT_REQUEST] } });

		expect(requests).toEqual([EXPORT_REQUEST]);
	});

	it.each(["export", "deletion"] as const)(
		"creates a %s request",
		type => {
			let created: DataRequest | null = null;
			service.create(type).subscribe(value => (created = value));

			const req = httpTesting.expectOne(URL_BASE);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual({ type });
			req.flush({ data: { request: { ...EXPORT_REQUEST, type } } });

			expect(created).toEqual({ ...EXPORT_REQUEST, type });
		}
	);

	it("downloads a completed export with the file name of the server", () => {
		service.download("r 1").subscribe();

		const req = httpTesting.expectOne(r => r.url === `${URL_BASE}/r%201/download`);
		expect(req.request.method).toBe("GET");
		expect(req.request.responseType).toBe("blob");
		expect(req.request.headers.get("Accept")).toBe("application/json");
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

	it("falls back to a dated file name without Content-Disposition", () => {
		service.download("r1").subscribe();

		httpTesting
			.expectOne(r => r.url === `${URL_BASE}/r1/download`)
			.flush(new Blob(["{}"]));

		expect(saveFile).toHaveBeenCalledWith(
			expect.any(Blob),
			dataExportFallbackName()
		);
	});

	it("puts the username in the fallback file name when it is known", () => {
		expect(dataExportFallbackName("ada")).toMatch(
			/^completr-data-ada-\d{4}-\d{2}-\d{2}\.json$/
		);
		expect(dataExportFallbackName()).toMatch(
			/^completr-data-\d{4}-\d{2}-\d{2}\.json$/
		);
	});
});
