import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { FollowRequestsService } from "./follow-requests";
import { type IncomingFollowRequest } from "./follow-requests.model";

function incoming(requesterId: string): IncomingFollowRequest {
	return {
		requesterId,
		createdAt: "2026-01-01T00:00:00Z",
		user: { id: requesterId, username: requesterId, name: requesterId }
	};
}

describe("FollowRequestsService", () => {
	const base = `${environment.apiUrl}/users/me/follow-requests`;
	let service: FollowRequestsService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(FollowRequestsService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	function loadRequests(...ids: string[]) {
		service.list().subscribe();
		httpTesting
			.expectOne(base)
			.flush({ data: { requests: ids.map(incoming) } });
	}

	it("starts without loaded requests and a zero pending count", () => {
		expect(service.incoming()).toBeNull();
		expect(service.pendingCount()).toBe(0);
	});

	it("loads the incoming requests and updates the pending count", () => {
		loadRequests("a", "b");

		expect(service.incoming()?.map(r => r.requesterId)).toEqual(["a", "b"]);
		expect(service.pendingCount()).toBe(2);
	});

	it("posts the accept and removes the request locally", () => {
		loadRequests("a", "b");

		service.accept("a").subscribe();

		const req = httpTesting.expectOne(`${base}/a/accept`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({});
		req.flush(null);
		expect(service.incoming()?.map(r => r.requesterId)).toEqual(["b"]);
		expect(service.pendingCount()).toBe(1);
	});

	it("posts the reject and removes the request locally", () => {
		loadRequests("a");

		service.reject("a").subscribe();

		const req = httpTesting.expectOne(`${base}/a/reject`);
		expect(req.request.method).toBe("POST");
		req.flush(null);
		expect(service.incoming()).toEqual([]);
		expect(service.pendingCount()).toBe(0);
	});

	it("keeps the state untouched when responding before the list is loaded", () => {
		service.accept("a").subscribe();

		httpTesting.expectOne(`${base}/a/accept`).flush(null);

		expect(service.incoming()).toBeNull();
		expect(service.pendingCount()).toBe(0);
	});

	it("does not remove the request when the server rejects the call", () => {
		loadRequests("a");

		service.accept("a").subscribe({ error: () => undefined });
		httpTesting
			.expectOne(`${base}/a/accept`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(service.pendingCount()).toBe(1);
	});
});
