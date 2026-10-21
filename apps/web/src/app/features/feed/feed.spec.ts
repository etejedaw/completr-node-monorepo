import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { FeedService } from "./feed";

describe("FeedService", () => {
	const api = environment.apiUrl;
	let service: FeedService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(FeedService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("loads the feed returning the raw envelope", () => {
		const body = { data: { activities: [{ id: "a1" }], total: 1 } };
		let result: unknown;

		service.getFeed().subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === `${api}/feed`);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.keys()).toEqual([]);
		req.flush(body);
		expect(result).toEqual(body);
	});

	it("sends pagination, category and types as params", () => {
		service
			.getFeed({
				limit: 20,
				offset: 40,
				category: "social",
				types: "follow,review"
			})
			.subscribe();

		const req = httpTesting.expectOne(r => r.url === `${api}/feed`);
		expect(req.request.params.get("limit")).toBe("20");
		expect(req.request.params.get("offset")).toBe("40");
		expect(req.request.params.get("category")).toBe("social");
		expect(req.request.params.get("types")).toBe("follow,review");
		req.flush({ data: { activities: [], total: 0 } });
	});

	it("deletes an activity", () => {
		service.deleteActivity("a1").subscribe();

		const req = httpTesting.expectOne(`${api}/feed/a1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});
});
