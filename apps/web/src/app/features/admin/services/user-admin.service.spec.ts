import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import { UserAdminService } from "./user-admin.service";

const url = `${environment.apiUrl}/admin/users`;

describe("UserAdminService", () => {
	let service: UserAdminService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(UserAdminService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it("sends exactly the changed fields when editing", () => {
		service
			.editUser("u1", { name: "Ada", password: "Abcdef1!" })
			.subscribe();

		const request = http.expectOne(`${url}/u1`);
		expect(request.request.method).toBe("PATCH");
		expect(request.request.body).toEqual({
			name: "Ada",
			password: "Abcdef1!"
		});
		request.flush({ data: { user: { id: "u1" } } });
	});

	it("trims the search text and omits it when blank", () => {
		service.listUsers(50, 0, "  ada  ").subscribe();
		service.listUsers(50, 0, "   ").subscribe();

		const [withSearch, blank] = http.match(r => r.url === url);
		expect(withSearch!.request.params.get("search")).toBe("ada");
		expect(blank!.request.params.has("search")).toBe(false);
		withSearch!.flush({ data: { users: [], total: 0 } });
		blank!.flush({ data: { users: [], total: 0 } });
	});

	it("surfaces a rejected password as a validation error", () => {
		let body: unknown;
		service
			.editUser("u1", { password: "weak" })
			.subscribe({ error: err => (body = err.error) });

		http.expectOne(`${url}/u1`).flush(
			{ type: "COMMON_SCHEMA_INVALID" },
			{ status: 422, statusText: "Unprocessable" }
		);

		expect(body).toEqual({ type: "COMMON_SCHEMA_INVALID" });
	});
});
