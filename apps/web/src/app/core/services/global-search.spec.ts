import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { GlobalSearchService } from "./global-search";
import { type SearchResults } from "./global-search.model";

describe("GlobalSearchService", () => {
	let service: GlobalSearchService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(GlobalSearchService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("returns empty results without calling the API for queries under 2 characters", () => {
		let result: SearchResults | undefined;

		service.search("a").subscribe(r => (result = r));

		expect(result).toEqual({
			library: { entries: [], total: 0 },
			users: [],
			games: [],
			lists: []
		});
		httpTesting.expectNone(() => true);
	});

	it("queries your library, users, games and lists in parallel with the encoded query", () => {
		let result: SearchResults | undefined;

		service.search("half life").subscribe(r => (result = r));

		const library = httpTesting.expectOne(
			`${environment.apiUrl}/users/me/backlog?search=half%20life&limit=10`
		);
		const users = httpTesting.expectOne(
			`${environment.apiUrl}/users/search?search=half%20life`
		);
		const games = httpTesting.expectOne(
			`${environment.apiUrl}/games/search?search=half%20life&local_only=true`
		);
		const lists = httpTesting.expectOne(
			`${environment.apiUrl}/lists/search?search=half%20life`
		);
		expect(users.request.method).toBe("GET");
		expect(library.request.method).toBe("GET");
		library.flush({ data: { backlog: [{ id: "b1" }], total: 7 } });
		users.flush({ data: { users: [{ id: "u1" }] } });
		games.flush({ data: { games: [{ id: "g1" }] } });
		lists.flush({ data: { lists: [{ id: "l1" }] } });
		expect(result).toEqual({
			library: { entries: [{ id: "b1" }], total: 7 },
			users: [{ id: "u1" }],
			games: [{ id: "g1" }],
			lists: [{ id: "l1" }]
		});
	});

	it("encodes reserved characters in the query", () => {
		service.search("a&b=c").subscribe();

		httpTesting
			.expectOne(
				`${environment.apiUrl}/users/me/backlog?search=a%26b%3Dc&limit=10`
			)
			.flush({ data: { backlog: [], total: 0 } });
		httpTesting
			.expectOne(`${environment.apiUrl}/users/search?search=a%26b%3Dc`)
			.flush({ data: { users: [] } });
		httpTesting
			.expectOne(
				`${environment.apiUrl}/games/search?search=a%26b%3Dc&local_only=true`
			)
			.flush({ data: { games: [] } });
		httpTesting
			.expectOne(`${environment.apiUrl}/lists/search?search=a%26b%3Dc`)
			.flush({ data: { lists: [] } });
	});

	it("fails the whole search when one of the requests fails", () => {
		const onError = vi.fn();

		service.search("zelda").subscribe({ error: onError });

		httpTesting
			.expectOne(`${environment.apiUrl}/users/search?search=zelda`)
			.flush(null, { status: 500, statusText: "Server Error" });
		httpTesting
			.match(() => true)
			.forEach(req => {
				if (!req.cancelled) req.flush({ data: {} });
			});
		expect(onError).toHaveBeenCalledTimes(1);
	});
});
