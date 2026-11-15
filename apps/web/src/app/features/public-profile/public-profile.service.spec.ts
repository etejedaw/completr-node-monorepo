import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { PublicProfileService } from "./public-profile.service";

describe("PublicProfileService", () => {
	let service: PublicProfileService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(PublicProfileService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it("unwraps the profile of the requested player", () => {
		let result: unknown;
		service.getProfile("ada").subscribe(profile => (result = profile));

		const request = httpTesting.expectOne(req =>
			req.url.endsWith("/users/ada")
		);
		expect(request.request.method).toBe("GET");
		request.flush({ data: { followerCount: 3 } });

		expect(result).toEqual({ followerCount: 3 });
	});

	it("propagates a missing player as an error with its status", () => {
		let status: number | undefined;
		service
			.getProfile("ghost")
			.subscribe({ error: error => (status = error.status) });

		httpTesting
			.expectOne(req => req.url.endsWith("/users/ghost"))
			.flush(
				{ type: "USER_NOT_FOUND" },
				{ status: 404, statusText: "Not Found" }
			);

		expect(status).toBe(404);
	});
});
