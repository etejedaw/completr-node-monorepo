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
import { premiumPromotionStatus } from "./premium-promotions-admin.model";
import { PremiumPromotionsAdminService } from "./premium-promotions-admin.service";

describe("PremiumPromotionsAdminService", () => {
	const url = `${environment.apiUrl}/admin/premium-promotions`;
	let service: PremiumPromotionsAdminService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(PremiumPromotionsAdminService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it("lists promotions in the order the API returns them", () => {
		let result: unknown;
		service.list().subscribe(value => (result = value));
		const req = http.expectOne(url);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { promotions: [{ id: "b" }, { id: "a" }] } });
		expect(result).toEqual([{ id: "b" }, { id: "a" }]);
	});

	it("creates a promotion and handles errors locally", () => {
		const body = {
			code: "rewind-launch-2026",
			feature: "rewind.premium",
			startsAt: "2026-11-02T00:00:00.000Z",
			endsAt: "2026-12-02T00:00:00.000Z"
		} as const;
		let result: unknown;
		service.create(body).subscribe(value => (result = value));
		const req = http.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual(body);
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		expect(req.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(true);
		req.flush({ data: { promotion: { id: "p1" } } });
		expect(result).toEqual({ id: "p1" });
	});

	it("updates only the supplied dates", () => {
		let result: unknown;
		service
			.update("p1", { endsAt: "2026-12-10T00:00:00.000Z" })
			.subscribe(value => (result = value));
		const req = http.expectOne(`${url}/p1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({
			endsAt: "2026-12-10T00:00:00.000Z"
		});
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		expect(req.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(true);
		req.flush({ data: { promotion: { id: "p1" } } });
		expect(result).toEqual({ id: "p1" });
	});

	it("revokes a promotion with an empty body", () => {
		let result: unknown;
		service.revoke("p1").subscribe(value => (result = value));
		const req = http.expectOne(`${url}/p1/revoke`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({});
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		expect(req.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(false);
		req.flush({ data: { promotion: { id: "p1" } } });
		expect(result).toEqual({ id: "p1" });
	});

	it("propagates server errors to the caller", () => {
		let status = 0;
		service.revoke("p1").subscribe({ error: err => (status = err.status) });
		http.expectOne(`${url}/p1/revoke`).flush(
			{ type: "PREMIUM_PROMOTION_NOT_FOUND" },
			{ status: 404, statusText: "Not Found" }
		);
		expect(status).toBe(404);
	});
});

describe("premiumPromotionStatus", () => {
	const promotion = {
		startsAt: "2026-11-10T00:00:00.000Z",
		endsAt: "2026-11-20T00:00:00.000Z"
	};

	it("is scheduled strictly before the start", () => {
		expect(
			premiumPromotionStatus(promotion, new Date("2026-11-09T23:59:59Z"))
		).toBe("scheduled");
	});

	it("is active from the start until the end", () => {
		expect(
			premiumPromotionStatus(promotion, new Date("2026-11-10T00:00:00Z"))
		).toBe("active");
		expect(
			premiumPromotionStatus(promotion, new Date("2026-11-19T23:59:59Z"))
		).toBe("active");
	});

	it("is ended at the exact end instant and after", () => {
		expect(
			premiumPromotionStatus(promotion, new Date("2026-11-20T00:00:00Z"))
		).toBe("ended");
		expect(
			premiumPromotionStatus(promotion, new Date("2027-01-01T00:00:00Z"))
		).toBe("ended");
	});
});
