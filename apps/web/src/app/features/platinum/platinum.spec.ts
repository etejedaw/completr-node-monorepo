import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { PlatinumService } from "./platinum";

describe("PlatinumService", () => {
	const url = `${environment.apiUrl}/users/me/games/game-1/platinum`;
	let service: PlatinumService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(PlatinumService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("puts the platinum of a game and maps the saved platinum", () => {
		const platinum = {
			id: "platinum-1",
			backlogId: "run-1",
			platformId: "platform-1",
			platinumedAt: "2026-03-12",
			notes: null
		};
		let result: unknown;

		service
			.save("game-1", { backlogId: "run-1", platinumedAt: "2026-03-12" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({
			backlogId: "run-1",
			platinumedAt: "2026-03-12"
		});
		req.flush({ data: { platinum } });
		expect(result).toEqual(platinum);
	});

	it("deletes the platinum of a game", () => {
		let done = false;

		service.remove("game-1").subscribe(() => (done = true));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("DELETE");
		req.flush(null, { status: 204, statusText: "No Content" });
		expect(done).toBe(true);
	});

	it("gets the platinums of the session user with pagination and search", () => {
		let total = 0;

		service
			.getMine({ limit: 100, offset: 0, search: "astro" })
			.subscribe(res => (total = res.data.total));

		const req = httpTesting.expectOne(
			r => r.url === `${environment.apiUrl}/users/me/platinums`
		);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("limit")).toBe("100");
		expect(req.request.params.get("search")).toBe("astro");
		req.flush({ data: { platinums: [], total: 3 } });
		expect(total).toBe(3);
	});
});
