import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { ListsService } from "./lists";

describe("ListsService", () => {
	const url = `${environment.apiUrl}/lists`;
	let service: ListsService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(ListsService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("loads my lists with pagination and returns the envelope with the frozen flag", () => {
		const body = {
			data: { lists: [{ id: "l1" }], total: 1, frozen: true }
		};
		let result: unknown;

		service
			.getMyLists({ limit: 5, offset: 10 })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === `${url}/me`);
		expect(req.request.method).toBe("GET");
		expect(req.request.params.get("limit")).toBe("5");
		expect(req.request.params.get("offset")).toBe("10");
		req.flush(body);
		expect(result).toEqual(body);
	});

	it.each([
		["getOfficial", "official"],
		["getRecent", "recent"]
	] as const)(
		"%s requests 12 lists by default and unwraps them",
		(method, path) => {
			let result: unknown;

			service[method]().subscribe(r => (result = r));

			httpTesting
				.expectOne(`${url}/${path}?limit=12`)
				.flush({ data: { lists: [{ id: "l1" }] } });
			expect(result).toEqual([{ id: "l1" }]);
		}
	);

	it.each([
		["getOfficial", "official"],
		["getRecent", "recent"]
	] as const)("%s honours a custom limit", (method, path) => {
		service[method](4).subscribe();

		httpTesting
			.expectOne(`${url}/${path}?limit=4`)
			.flush({ data: { lists: [] } });
	});

	it("loads a list by id", () => {
		let result: unknown;

		service.getById("l1").subscribe(r => (result = r));

		httpTesting
			.expectOne(`${url}/l1`)
			.flush({ data: { list: { id: "l1" } } });
		expect(result).toEqual({ id: "l1" });
	});

	it("loads a list through the owner's public route", () => {
		let result: unknown;

		service.getByIdForUser("ada", "l1").subscribe(r => (result = r));

		httpTesting
			.expectOne(`${environment.apiUrl}/users/ada/lists/l1`)
			.flush({ data: { list: { id: "l1" } } });
		expect(result).toEqual({ id: "l1" });
	});

	it("creates a list and returns it", () => {
		const dto = {
			name: "RPGs",
			scoreSource: "completr",
			durationSource: "completr"
		};
		let result: unknown;

		service.create(dto).subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual(dto);
		req.flush({ data: { list: { id: "l1" } } });
		expect(result).toEqual({ id: "l1" });
	});

	it("patches a list and returns it", () => {
		service.update("l1", { name: "New" }).subscribe();

		const req = httpTesting.expectOne(`${url}/l1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ name: "New" });
		req.flush({ data: { list: { id: "l1" } } });
	});

	it("duplicates a list under a new name", () => {
		let result: unknown;

		service
			.duplicate("l1", { name: "Copy", isPublic: false })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/l1/duplicate`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ name: "Copy", isPublic: false });
		req.flush({ data: { list: { id: "l2" } } });
		expect(result).toEqual({ id: "l2" });
	});

	it("deletes a list", () => {
		service.delete("l1").subscribe();

		const req = httpTesting.expectOne(`${url}/l1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});

	it("replaces the items of a list with the given game ids", () => {
		let result: unknown;

		service.replaceItems("l1", ["g2", "g1"]).subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${url}/l1/items`);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({ gameIds: ["g2", "g1"] });
		req.flush({ data: { items: [{ id: "i2" }] } });
		expect(result).toEqual([{ id: "i2" }]);
	});

	it("adds and removes a single item", () => {
		service.addItem("l1", "g1").subscribe();
		const add = httpTesting.expectOne(`${url}/l1/items`);
		expect(add.request.method).toBe("POST");
		expect(add.request.body).toEqual({ gameId: "g1" });
		add.flush(null);

		service.removeItem("l1", "g1").subscribe();
		const remove = httpTesting.expectOne(`${url}/l1/items/g1`);
		expect(remove.request.method).toBe("DELETE");
		remove.flush(null);
	});

	it("refreshes the scores and returns how many items were updated", () => {
		let updated: number | undefined;

		service.refreshScores("l1").subscribe(n => (updated = n));

		const req = httpTesting.expectOne(`${url}/l1/refresh-scores`);
		expect(req.request.method).toBe("POST");
		req.flush({ data: { updatedItems: 6 } });
		expect(updated).toBe(6);
	});

	it("follows a list expecting a text response and unfollows it", () => {
		service.follow("l1").subscribe();
		const follow = httpTesting.expectOne(`${url}/l1/follow`);
		expect(follow.request.method).toBe("POST");
		expect(follow.request.responseType).toBe("text");
		follow.flush("");

		service.unfollow("l1").subscribe();
		const unfollow = httpTesting.expectOne(`${url}/l1/follow`);
		expect(unfollow.request.method).toBe("DELETE");
		unfollow.flush(null);
	});

	it("searches lists with the query encoded", () => {
		let result: unknown;

		service.search("co op & more").subscribe(r => (result = r));

		httpTesting
			.expectOne(`${url}/search?query=co%20op%20%26%20more`)
			.flush({ data: { lists: [{ id: "l1" }] } });
		expect(result).toEqual([{ id: "l1" }]);
	});

	it("lists the lists I follow", () => {
		let result: unknown;

		service.getFollowing().subscribe(r => (result = r));

		httpTesting
			.expectOne(`${url}/following`)
			.flush({ data: { lists: [{ id: "l9" }] } });
		expect(result).toEqual([{ id: "l9" }]);
	});
});
