import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { ProfileService } from "./profile";

describe("ProfileService", () => {
	const api = environment.apiUrl;
	let service: ProfileService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(ProfileService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("patches the profile and returns the updated user", () => {
		const dto = {
			name: "Ada",
			profileVisibility: "private" as const,
			acceptFollowRequests: false
		};
		let result: unknown;

		service.update(dto).subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${api}/users/me`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual(dto);
		req.flush({ data: { user: { id: "u1", name: "Ada" } } });
		expect(result).toEqual({ id: "u1", name: "Ada" });
	});

	it("propagates validation errors to the caller", () => {
		const onError = vi.fn();

		service.update({ name: "" }).subscribe({ error: onError });
		httpTesting
			.expectOne(`${api}/users/me`)
			.flush(null, { status: 422, statusText: "Unprocessable" });

		expect(onError.mock.calls[0][0].status).toBe(422);
	});
});
