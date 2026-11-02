import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { FranchisesService } from "./franchises";

describe("FranchisesService", () => {
	const api = environment.apiUrl;
	let service: FranchisesService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(FranchisesService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	const url = `${api}/franchises`;

	it("lists franchises with search and pagination and returns the data", () => {
		const data = { franchises: [{ id: "f1" }], total: 1 };
		let result: unknown;

		service
			.getFranchises({ search: "zel", limit: 10, offset: 0 })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("search")).toBe("zel");
		expect(req.request.params.get("limit")).toBe("10");
		expect(req.request.params.get("offset")).toBe("0");
		req.flush({ data });
		expect(result).toEqual(data);
	});

	it("sends no params when listing without a query", () => {
		service.getFranchises().subscribe();

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.params.keys()).toEqual([]);
		req.flush({ data: { franchises: [], total: 0 } });
	});

	it("loads a franchise by code with pagination", () => {
		const data = { franchise: { id: "f1" }, hasMore: false };
		let result: unknown;

		service
			.getFranchiseByCode("zelda", { limit: 20 })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === `${url}/zelda`);
		expect(req.request.params.get("limit")).toBe("20");
		req.flush({ data });
		expect(result).toEqual(data);
	});

	it("creates a franchise and returns it", () => {
		let result: unknown;

		service
			.createFranchise({ name: "Zelda", description: null })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ name: "Zelda", description: null });
		req.flush({ data: { franchise: { id: "f1" } } });
		expect(result).toEqual({ id: "f1" });
	});

	it("sends the final game ids when saving a franchise", () => {
		service
			.updateFranchise("f1", { name: "Zelda", gameIds: ["g1", "g2"] })
			.subscribe();

		const req = httpTesting.expectOne(`${url}/f1`);
		expect(req.request.body).toEqual({
			name: "Zelda",
			gameIds: ["g1", "g2"]
		});
		req.flush({ data: { franchise: { id: "f1" } } });
	});

	it("updates a franchise and returns it", () => {
		let result: unknown;

		service
			.updateFranchise("f1", { name: "Zelda 2" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/f1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ name: "Zelda 2" });
		req.flush({ data: { franchise: { id: "f1", name: "Zelda 2" } } });
		expect(result).toEqual({ id: "f1", name: "Zelda 2" });
	});

	it("deletes a franchise", () => {
		service.deleteFranchise("f1").subscribe();

		const req = httpTesting.expectOne(`${url}/f1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});

	it("sets the tracked state with a POST to track and a DELETE to stop", () => {
		service.setTracked("zelda", true).subscribe();
		const track = httpTesting.expectOne(`${url}/zelda/track`);
		expect(track.request.method).toBe("POST");
		track.flush(null);

		service.setTracked("zelda", false).subscribe();
		const untrack = httpTesting.expectOne(`${url}/zelda/track`);
		expect(untrack.request.method).toBe("DELETE");
		untrack.flush(null);
	});

	it("tracks and untracks a franchise by code", () => {
		service.trackFranchise("zelda").subscribe();
		const track = httpTesting.expectOne(`${url}/zelda/track`);
		expect(track.request.method).toBe("POST");
		track.flush(null);

		service.untrackFranchise("zelda").subscribe();
		const untrack = httpTesting.expectOne(`${url}/zelda/track`);
		expect(untrack.request.method).toBe("DELETE");
		untrack.flush(null);
	});
});
