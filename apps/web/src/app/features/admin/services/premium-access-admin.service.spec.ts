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
import { PremiumAccessAdminService } from "./premium-access-admin.service";

describe("PremiumAccessAdminService", () => {
	const api = environment.apiUrl;
	let service: PremiumAccessAdminService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(PremiumAccessAdminService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it("loads the feature catalog", () => {
		let result: unknown;
		service.listFeatures().subscribe(value => (result = value));
		const req = http.expectOne(`${api}/admin/premium-features`);
		req.flush({ data: { features: [{ feature: "export.json" }] } });
		expect(result).toEqual([{ feature: "export.json" }]);
	});

	it("loads grants for the selected user", () => {
		let result: unknown;
		service.listGrants("u1").subscribe(value => (result = value));
		http.expectOne(`${api}/admin/users/u1/premium-grants`).flush({
			data: { grants: [{ id: "g1" }] }
		});
		expect(result).toEqual([{ id: "g1" }]);
	});

	it("creates a grant with the supplied expiration", () => {
		const body = {
			feature: "*",
			expiresAt: "2027-01-01T00:00:00.000Z"
		} as const;
		let result: unknown;
		service.createGrant("u1", body).subscribe(value => (result = value));
		const req = http.expectOne(`${api}/admin/users/u1/premium-grants`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual(body);
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		expect(req.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(false);
		req.flush({ data: { grant: { id: "g1" } } });
		expect(result).toEqual({ id: "g1" });
	});

	it("updates and revokes a grant", () => {
		service.updateGrant("u1", "g1", null).subscribe();
		const update = http.expectOne(
			`${api}/admin/users/u1/premium-grants/g1`
		);
		expect(update.request.method).toBe("PATCH");
		expect(update.request.body).toEqual({ expiresAt: null });
		expect(update.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(true);
		update.flush({ data: { grant: { id: "g1" } } });

		service.revokeGrant("u1", "g1").subscribe();
		const revoke = http.expectOne(
			`${api}/admin/users/u1/premium-grants/g1/revoke`
		);
		expect(revoke.request.method).toBe("POST");
		expect(revoke.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(
			true
		);
		expect(revoke.request.context.get(SUPPRESS_CONFLICT_TOAST)).toBe(true);
		revoke.flush({ data: { grant: { id: "g1" } } });
	});
});
