import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { CoopRunsService } from "./coop-runs";

describe("CoopRunsService", () => {
	const api = environment.apiUrl;
	let service: CoopRunsService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(CoopRunsService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	const base = () => `${api}/users/me/backlog/b1/coop`;

	it("lists the members of a co-op run", () => {
		let result: unknown;

		service.getMembers("b1").subscribe(r => (result = r));

		const req = httpTesting.expectOne(base());
		expect(req.request.method).toBe("GET");
		req.flush({ data: { members: [{ userId: "u1" }] } });
		expect(result).toEqual([{ userId: "u1" }]);
	});

	it("adds a member without a target entry", () => {
		let result: unknown;

		service.addMember("b1", "u2").subscribe(r => (result = r));

		const req = httpTesting.expectOne(base());
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ userId: "u2" });
		req.flush({ data: { coopRunId: "c1", targetBacklogId: "b9" } });
		expect(result).toEqual({ coopRunId: "c1", targetBacklogId: "b9" });
	});

	it("adds a member linking an existing target entry", () => {
		service.addMember("b1", "u2", "b9").subscribe();

		const req = httpTesting.expectOne(base());
		expect(req.request.body).toEqual({
			userId: "u2",
			targetBacklogId: "b9"
		});
		req.flush({ data: { coopRunId: "c1", targetBacklogId: "b9" } });
	});

	it("fetches the candidates of a user and returns accessibility with them", () => {
		const data = { accessible: false, candidates: [] };
		let result: unknown;

		service.getCandidates("b1", "u2").subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${base()}/candidates?userId=u2`);
		expect(req.request.method).toBe("GET");
		req.flush({ data });
		expect(result).toEqual(data);
	});

	it("removes a member", () => {
		service.removeMember("b1", "u2").subscribe();

		const req = httpTesting.expectOne(`${base()}/u2`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});

	it("syncs the chosen fields from another entry", () => {
		service.sync("b1", "b2", ["status", "realDuration"]).subscribe();

		const req = httpTesting.expectOne(`${base()}/sync`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({
			fromBacklogId: "b2",
			fields: ["status", "realDuration"]
		});
		req.flush(null);
	});
});
