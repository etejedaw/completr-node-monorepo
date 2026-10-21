import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { BacklogProgressService } from "./backlog-progress";

describe("BacklogProgressService", () => {
	const api = environment.apiUrl;
	let service: BacklogProgressService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(BacklogProgressService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("lists the progress notes of an entry", () => {
		let result: unknown;

		service.getProgress("b1").subscribe(r => (result = r));

		const req = httpTesting.expectOne(
			`${api}/users/me/backlog/b1/progress`
		);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { progress: [{ id: "n1" }] } });
		expect(result).toEqual([{ id: "n1" }]);
	});

	it("adds a note and returns it", () => {
		let result: unknown;

		service.addProgress("b1", "At the boss").subscribe(r => (result = r));

		const req = httpTesting.expectOne(
			`${api}/users/me/backlog/b1/progress`
		);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ note: "At the boss" });
		req.flush({ data: { progress: { id: "n1", note: "At the boss" } } });
		expect(result).toEqual({ id: "n1", note: "At the boss" });
	});

	it("deletes a note", () => {
		service.deleteProgress("b1", "n1").subscribe();

		const req = httpTesting.expectOne(
			`${api}/users/me/backlog/b1/progress/n1`
		);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});

	it("propagates a server error when adding fails", () => {
		const onError = vi.fn();

		service.addProgress("b1", "x").subscribe({ error: onError });
		httpTesting
			.expectOne(`${api}/users/me/backlog/b1/progress`)
			.flush(null, { status: 403, statusText: "Forbidden" });

		expect(onError.mock.calls[0][0].status).toBe(403);
	});
});
