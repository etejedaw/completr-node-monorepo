import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { UsersService } from "./users";

describe("UsersService", () => {
	let service: UsersService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(UsersService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("searches users by query and unwraps the users list", () => {
		const users = [{ id: "u1", username: "ada" }];
		let result: unknown;

		service.search({ q: "ad", limit: 5 }).subscribe(r => (result = r));

		const req = httpTesting.expectOne(
			r => r.url === `${environment.apiUrl}/users/search`
		);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("q")).toBe("ad");
		expect(req.request.params.get("limit")).toBe("5");
		req.flush({ data: { users } });
		expect(result).toEqual(users);
	});

	it("omits search params that are not provided", () => {
		service.search({ email: "a@b.c" }).subscribe();

		const req = httpTesting.expectOne(
			r => r.url === `${environment.apiUrl}/users/search`
		);
		expect(req.request.params.keys()).toEqual(["email"]);
		req.flush({ data: { users: [] } });
	});

	it("discovers users with a default limit of 12", () => {
		let result: unknown;

		service.discover().subscribe(r => (result = r));

		const req = httpTesting.expectOne(
			r => r.url === `${environment.apiUrl}/users/discover`
		);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("limit")).toBe("12");
		req.flush({ data: { users: [{ id: "u2" }] } });
		expect(result).toEqual([{ id: "u2" }]);
	});

	it("discovers users with a custom limit", () => {
		service.discover(3).subscribe();

		const req = httpTesting.expectOne(
			r => r.url === `${environment.apiUrl}/users/discover`
		);
		expect(req.request.params.get("limit")).toBe("3");
		req.flush({ data: { users: [] } });
	});
});
