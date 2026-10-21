import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { BacklogService } from "./backlog";

describe("BacklogService", () => {
	const url = `${environment.apiUrl}/users/me/backlog`;
	let service: BacklogService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(BacklogService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("loads the backlog and returns the raw response envelope", () => {
		const body = { data: { backlog: [{ id: "b1" }], total: 1 } };
		let result: unknown;

		service.getMyBacklog().subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.keys()).toEqual([]);
		req.flush(body);
		expect(result).toEqual(body);
	});

	it("sends the filters as query params and skips empty ones", () => {
		service
			.getMyBacklog({
				status: "playing",
				min_score: 0,
				undated: true,
				search: "",
				platforms: undefined
			})
			.subscribe();

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.params.get("status")).toBe("playing");
		expect(req.request.params.get("min_score")).toBe("0");
		expect(req.request.params.get("undated")).toBe("true");
		expect(req.request.params.has("search")).toBe(false);
		expect(req.request.params.has("platforms")).toBe(false);
		req.flush({ data: { backlog: [], total: 0 } });
	});

	it("creates an entry and returns the created backlog item", () => {
		const dto = {
			gameId: "g1",
			platformId: "p1",
			score: 4,
			duration: 12
		};
		let result: unknown;

		service.create(dto).subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual(dto);
		req.flush({ data: { backlog: { id: "b1" } } });
		expect(result).toEqual({ id: "b1" });
	});

	it("updates an entry and returns the backlog with the queueRemoved flag", () => {
		const data = { backlog: { id: "b1" }, queueRemoved: true };
		let result: unknown;

		service
			.update("b1", { status: "completed", finishedAt: null })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/b1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({
			status: "completed",
			finishedAt: null
		});
		req.flush({ data });
		expect(result).toEqual(data);
	});

	it("deletes an entry by id", () => {
		service.delete("b1").subscribe();

		const req = httpTesting.expectOne(`${url}/b1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});

	it("propagates server errors to the caller", () => {
		const onError = vi.fn();

		service.delete("b1").subscribe({ error: onError });
		httpTesting
			.expectOne(`${url}/b1`)
			.flush(null, { status: 404, statusText: "Not Found" });

		expect(onError.mock.calls[0][0].status).toBe(404);
	});
});
