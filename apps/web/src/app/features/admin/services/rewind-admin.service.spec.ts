import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import {
	SUPPRESS_CONFLICT_TOAST,
	SUPPRESS_VALIDATION_TOAST
} from "../../../shared/utils/validation-errors";
import { RewindAdminService } from "./rewind-admin.service";

describe("RewindAdminService", () => {
	const editionsUrl = `${environment.apiUrl}/admin/rewind/editions`;
	const rewindsUrl = `${environment.apiUrl}/admin/rewinds`;
	const settings = {
		opensAt: "2026-12-01",
		closesAt: "2027-01-31",
		graceStartsAt: "2027-01-01",
		graceEndsAt: "2027-01-07",
		design: "2026",
		premiumRegenerations: 3,
		giftRegenerations: 1
	};
	let service: RewindAdminService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(RewindAdminService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it("lists the editions with the available designs", () => {
		let result: unknown;
		service.listEditions().subscribe(value => (result = value));
		const req = http.expectOne(editionsUrl);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { editions: [{ year: 2026 }], designs: ["2026"] } });
		expect(result).toEqual({
			editions: [{ year: 2026 }],
			designs: ["2026"]
		});
	});

	it("creates an edition and leaves its errors to the form", () => {
		let result: unknown;
		service
			.createEdition({ year: 2027, ...settings })
			.subscribe(value => (result = value));
		const req = http.expectOne(editionsUrl);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ year: 2027, ...settings });
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		expect(req.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(true);
		req.flush({ data: { edition: { year: 2027 } } });
		expect(result).toEqual({ year: 2027 });
	});

	it("updates an edition by year and returns how many Rewinds changed", () => {
		let result: unknown;
		service
			.updateEdition(2026, { ...settings, applyToGenerated: true })
			.subscribe(value => (result = value));
		const req = http.expectOne(`${editionsUrl}/2026`);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({
			...settings,
			applyToGenerated: true
		});
		expect(req.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(true);
		req.flush({ data: { edition: { year: 2026 }, affectedRewinds: 4 } });
		expect(result).toEqual({ edition: { year: 2026 }, affectedRewinds: 4 });
	});

	it("lists Rewinds with year, limit and offset and drops an empty search", () => {
		service
			.listRewinds({ year: 2026, search: "", limit: 50, offset: 100 })
			.subscribe();
		const req = http.expectOne(request => request.url === rewindsUrl);
		expect(req.request.params.get("year")).toBe("2026");
		expect(req.request.params.get("limit")).toBe("50");
		expect(req.request.params.get("offset")).toBe("100");
		expect(req.request.params.has("search")).toBe(false);
		expect(req.request.params.has("q")).toBe(false);
		req.flush({ data: { rewinds: [], total: 0 } });
	});

	it("sends the search by username when there is one", () => {
		let result: unknown;
		service
			.listRewinds({ year: 2025, search: "ada", limit: 50, offset: 0 })
			.subscribe(value => (result = value));
		const req = http.expectOne(request => request.url === rewindsUrl);
		expect(req.request.params.get("search")).toBe("ada");
		expect(req.request.params.has("q")).toBe(false);
		req.flush({ data: { rewinds: [{ id: "r1" }], total: 1 } });
		expect(result).toEqual({ rewinds: [{ id: "r1" }], total: 1 });
	});

	it("patches the AI generations left of one Rewind", () => {
		let result: unknown;
		service
			.updateRegenerationsLeft("r1", 0)
			.subscribe(value => (result = value));
		const req = http.expectOne(`${rewindsUrl}/r1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ regenerationsLeft: 0 });
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		req.flush({ data: { rewind: { id: "r1", regenerationsLeft: 0 } } });
		expect(result).toEqual({ id: "r1", regenerationsLeft: 0 });
	});
});
