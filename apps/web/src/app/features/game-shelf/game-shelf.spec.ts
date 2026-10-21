import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { GameShelfService } from "./game-shelf";

describe("GameShelfService", () => {
	const api = environment.apiUrl;
	let service: GameShelfService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(GameShelfService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	const url = `${api}/users/me/game-shelf`;

	it("loads the shelf with pagination and search, returning the envelope", () => {
		const body = { data: { gameShelf: [{ id: "s1" }], total: 1 } };
		let result: unknown;

		service
			.getMyShelf({ limit: 10, offset: 5, search: "zelda" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("limit")).toBe("10");
		expect(req.request.params.get("offset")).toBe("5");
		expect(req.request.params.get("search")).toBe("zelda");
		req.flush(body);
		expect(result).toEqual(body);
	});

	it("adds a game to the shelf and returns the entry", () => {
		const dto = { gameId: "g1", platformId: "p1", edition: "Deluxe" };
		let result: unknown;

		service.create(dto).subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual(dto);
		req.flush({ data: { gameShelf: { id: "s1" } } });
		expect(result).toEqual({ id: "s1" });
	});

	it("updates an entry allowing nulls to clear fields", () => {
		let result: unknown;

		service
			.update("s1", { edition: null, notes: "Sealed" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/s1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ edition: null, notes: "Sealed" });
		req.flush({ data: { gameShelf: { id: "s1" } } });
		expect(result).toEqual({ id: "s1" });
	});

	it("removes an entry from the shelf", () => {
		service.delete("s1").subscribe();

		const req = httpTesting.expectOne(`${url}/s1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});
});
