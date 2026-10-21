import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { QueueService } from "./queue";

describe("QueueService", () => {
	const url = `${environment.apiUrl}/users/me/queue`;
	let service: QueueService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(QueueService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("returns only the queue entries with pagination and search params", () => {
		let result: unknown;

		service
			.getMyQueue({ limit: 10, offset: 5, search: "zelda" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("limit")).toBe("10");
		expect(req.request.params.get("offset")).toBe("5");
		expect(req.request.params.get("search")).toBe("zelda");
		req.flush({ data: { queue: [{ id: "q1" }], total: 1 } });
		expect(result).toEqual([{ id: "q1" }]);
	});

	it("returns the whole envelope for the paged variant", () => {
		const body = { data: { queue: [{ id: "q1" }], total: 8 } };
		let result: unknown;

		service.getMyQueuePaged().subscribe(r => (result = r));

		httpTesting.expectOne(r => r.url === url).flush(body);
		expect(result).toEqual(body);
	});

	it("lists the backlog ids in the queue", () => {
		let result: unknown;

		service.getMyQueueBacklogIds().subscribe(r => (result = r));

		httpTesting
			.expectOne(`${url}/backlog-ids`)
			.flush({ data: { backlogIds: ["b1", "b2"] } });
		expect(result).toEqual(["b1", "b2"]);
	});

	it("queues a game with its platform using the game source", () => {
		let result: unknown;

		service.addFromGame("g1", "p1").subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}?source=game`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ id: "g1", platformId: "p1" });
		req.flush({ data: { queue: { id: "q1" } } });
		expect(result).toEqual({ id: "q1" });
	});

	it("queues a backlog entry using the backlog source", () => {
		service.addFromBacklog("b1").subscribe();

		const req = httpTesting.expectOne(`${url}?source=backlog`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ id: "b1" });
		req.flush({ data: { queue: { id: "q1" } } });
	});

	it("reorders the queue with the given backlog ids", () => {
		let result: unknown;

		service.reorder(["b2", "b1"]).subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({ backlogIds: ["b2", "b1"] });
		req.flush({ data: { queue: [{ id: "q2" }, { id: "q1" }] } });
		expect(result).toEqual([{ id: "q2" }, { id: "q1" }]);
	});

	it("applies a change to the full order before putting it", () => {
		let result: unknown;

		service
			.updateOrder(ids => [...ids].reverse())
			.subscribe(r => (result = r));

		httpTesting
			.expectOne(`${url}/backlog-ids`)
			.flush({ data: { backlogIds: ["b1", "b2", "b3"] } });
		const put = httpTesting.expectOne(url);
		expect(put.request.method).toBe("PUT");
		expect(put.request.body).toEqual({ backlogIds: ["b3", "b2", "b1"] });
		put.flush({ data: { queue: [{ id: "q3" }] } });
		expect(result).toEqual([{ id: "q3" }]);
	});

	it("moves an entry to the top keeping the order of the rest", () => {
		service.moveToTop("b3").subscribe();

		httpTesting
			.expectOne(`${url}/backlog-ids`)
			.flush({ data: { backlogIds: ["b1", "b2", "b3"] } });
		const put = httpTesting.expectOne(url);
		expect(put.request.method).toBe("PUT");
		expect(put.request.body).toEqual({ backlogIds: ["b3", "b1", "b2"] });
		put.flush({ data: { queue: [] } });
	});

	it("removes an entry by putting the remaining ids", () => {
		let result: unknown;

		service.removeByBacklogId("b2").subscribe(r => (result = r));

		httpTesting
			.expectOne(`${url}/backlog-ids`)
			.flush({ data: { backlogIds: ["b1", "b2", "b3"] } });
		const put = httpTesting.expectOne(url);
		expect(put.request.method).toBe("PUT");
		expect(put.request.body).toEqual({ backlogIds: ["b1", "b3"] });
		put.flush({ data: { queue: [{ id: "q1" }] } });
		expect(result).toEqual([{ id: "q1" }]);
	});

	it("does not reorder when loading the ids fails", () => {
		const onError = vi.fn();

		service.moveToTop("b1").subscribe({ error: onError });
		httpTesting
			.expectOne(`${url}/backlog-ids`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(onError).toHaveBeenCalledTimes(1);
		httpTesting.expectNone(url);
	});
});
