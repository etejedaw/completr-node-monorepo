import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { PublicSocialService } from "./public-social.service";

describe("PublicSocialService", () => {
	let service: PublicSocialService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(PublicSocialService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it("follows a player and unwraps the result", () => {
		let status: string | undefined;
		service.follow("ada").subscribe(result => (status = result.status));

		const request = httpTesting.expectOne(req =>
			req.url.endsWith("/users/ada/follow")
		);
		expect(request.request.method).toBe("POST");
		request.flush({ data: { status: "pending", targetId: "u1" } });

		expect(status).toBe("pending");
	});

	it("unfollows with DELETE and cancels a sent request with DELETE", () => {
		service.unfollow("ada").subscribe();
		service.cancelFollowRequest("ada").subscribe();

		const unfollow = httpTesting.expectOne(req =>
			req.url.endsWith("/users/ada/follow")
		);
		const cancel = httpTesting.expectOne(req =>
			req.url.endsWith("/users/me/follow-requests/sent/ada")
		);
		expect(unfollow.request.method).toBe("DELETE");
		expect(cancel.request.method).toBe("DELETE");
		unfollow.flush(null);
		cancel.flush(null);
	});

	it("surfaces a failed follow to the caller", () => {
		let status: number | undefined;
		service
			.follow("ada")
			.subscribe({ error: error => (status = error.status) });

		httpTesting
			.expectOne(req => req.url.endsWith("/users/ada/follow"))
			.flush({}, { status: 500, statusText: "Server Error" });

		expect(status).toBe(500);
	});

	it("walks every page of the following list and joins the users", () => {
		let usernames: string[] = [];
		service
			.getAllFollowing("ada")
			.subscribe(users => (usernames = users.map(u => u.username)));

		const first = httpTesting.expectOne(req =>
			req.url.endsWith("/users/ada/following")
		);
		expect(first.request.params.get("offset")).toBe("0");
		first.flush({ data: { users: [{ username: "a" }], total: 101 } });
		const second = httpTesting.expectOne(req =>
			req.url.endsWith("/users/ada/following")
		);
		expect(second.request.params.get("offset")).toBe("100");
		second.flush({ data: { users: [{ username: "b" }], total: 101 } });

		expect(usernames).toEqual(["a", "b"]);
	});
});
