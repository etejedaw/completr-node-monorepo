import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { ReviewsService } from "./reviews";

describe("ReviewsService", () => {
	const url = `${environment.apiUrl}/games/g1/reviews`;
	let service: ReviewsService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(ReviewsService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("lists the reviews of a game", () => {
		let result: unknown;

		service.getReviews("g1").subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { reviews: [{ id: "r1" }] } });
		expect(result).toEqual([{ id: "r1" }]);
	});

	it("creates a review and returns it", () => {
		let result: unknown;

		service
			.createReview("g1", { content: "Great", rating: 5 })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ content: "Great", rating: 5 });
		req.flush({ data: { review: { id: "r1" } } });
		expect(result).toEqual({ id: "r1" });
	});

	it("patches a review allowing nulls to clear fields", () => {
		let result: unknown;

		service
			.updateReview("g1", { content: null, rating: 3 })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ content: null, rating: 3 });
		req.flush({ data: { review: { id: "r1", rating: 3 } } });
		expect(result).toEqual({ id: "r1", rating: 3 });
	});

	it("deletes the review of a game", () => {
		service.deleteReview("g1").subscribe();

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});
});
