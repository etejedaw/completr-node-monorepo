import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { SavedFiltersService } from "./saved-filters";

describe("SavedFiltersService", () => {
	const api = environment.apiUrl;
	let service: SavedFiltersService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(SavedFiltersService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	const url = `${api}/users/me/saved-filters`;

	it("lists all saved filters unwrapped", () => {
		let result: unknown;

		service.getAll().subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { savedFilters: [{ id: "v1" }], total: 1 } });
		expect(result).toEqual([{ id: "v1" }]);
	});

	it("returns the envelope when paged, with pagination and search params", () => {
		const body = { data: { savedFilters: [{ id: "v1" }], total: 9 } };
		let result: unknown;

		service
			.getPaged({ limit: 5, offset: 10, search: "rpg" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.params.get("limit")).toBe("5");
		expect(req.request.params.get("offset")).toBe("10");
		expect(req.request.params.get("search")).toBe("rpg");
		req.flush(body);
		expect(result).toEqual(body);
	});

	it("creates a saved filter and returns it", () => {
		const dto = { name: "RPGs" } as never;
		let result: unknown;

		service.create(dto).subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ name: "RPGs" });
		req.flush({ data: { savedFilter: { id: "v1" } } });
		expect(result).toEqual({ id: "v1" });
	});

	it("patches a saved filter with a partial dto", () => {
		let result: unknown;

		service
			.update("v1", { name: "Renamed" } as never)
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/v1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ name: "Renamed" });
		req.flush({ data: { savedFilter: { id: "v1" } } });
		expect(result).toEqual({ id: "v1" });
	});

	it("reorders by sending the ids and returns the new order", () => {
		let result: unknown;

		service.reorder(["v2", "v1"]).subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/reorder`);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({ ids: ["v2", "v1"] });
		req.flush({ data: { savedFilters: [{ id: "v2" }, { id: "v1" }] } });
		expect(result).toEqual([{ id: "v2" }, { id: "v1" }]);
	});

	it("deletes a saved filter", () => {
		service.delete("v1").subscribe();

		const req = httpTesting.expectOne(`${url}/v1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});

	it("loads the stats of a saved filter unwrapped", () => {
		let result: unknown;

		service.getStats("v1").subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/v1/stats`);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { stats: { totalEntries: 4 } } });
		expect(result).toEqual({ totalEntries: 4 });
	});
});
