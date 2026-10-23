import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, provideRouter } from "@angular/router";

import { environment } from "../../../../environments/environment";
import { type ConnectionKind, UserConnections } from "./user-connections";

const api = environment.apiUrl;
const SEARCH_DEBOUNCE_WAIT_MS = 350;

function playersPage(count: number, total: number, prefix = "player") {
	return {
		data: {
			users: Array.from({ length: count }, (_, index) => ({
				id: `${prefix}-${index}`,
				username: `${prefix}${index}`
			})),
			total
		}
	};
}

function wait(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

describe("UserConnections", () => {
	let httpTesting: HttpTestingController;

	function setup(kind: ConnectionKind) {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: { get: () => "ada" },
							data: { kind }
						}
					}
				}
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		const fixture = TestBed.createComponent(UserConnections);
		fixture.detectChanges();
		return fixture;
	}

	function expectConnections(kind: ConnectionKind): TestRequest {
		return httpTesting.expectOne(
			req => req.url === `${api}/users/ada/${kind}`
		);
	}

	function flushProfile(followerCount: number, followingCount: number) {
		httpTesting
			.expectOne(`${api}/users/ada`)
			.flush({ data: { followerCount, followingCount } });
	}

	async function settle(fixture: ComponentFixture<UserConnections>) {
		fixture.detectChanges();
		await wait(0);
		fixture.detectChanges();
	}

	function element(fixture: ComponentFixture<UserConnections>) {
		return fixture.nativeElement as HTMLElement;
	}

	function renderedPlayers(fixture: ComponentFixture<UserConnections>) {
		return element(fixture).querySelectorAll("app-user-card").length;
	}

	async function clickPagination(
		fixture: ComponentFixture<UserConnections>,
		label: string
	) {
		element(fixture)
			.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
			.click();
		await settle(fixture);
	}

	async function typeSearch(
		fixture: ComponentFixture<UserConnections>,
		text: string
	) {
		const input = element(fixture).querySelector<HTMLInputElement>(
			"ui-search-bar input"
		)!;
		input.value = text;
		input.dispatchEvent(new Event("input"));
		await settle(fixture);
	}

	afterEach(() => {
		httpTesting.verify();
	});

	it("requests only the followers on the followers screen", async () => {
		const fixture = setup("followers");

		expectConnections("followers").flush(playersPage(0, 0));
		flushProfile(1, 2);
		await fixture.whenStable();

		httpTesting.expectNone(req => req.url.endsWith("/following"));
	});

	it("requests only the following on the following screen", async () => {
		const fixture = setup("following");

		expectConnections("following").flush(playersPage(0, 0));
		flushProfile(1, 2);
		await fixture.whenStable();

		httpTesting.expectNone(req => req.url.endsWith("/followers"));
	});

	it("requests the first page of 24 players without a search", async () => {
		const fixture = setup("followers");

		const req = expectConnections("followers");
		expect(req.request.params.get("limit")).toBe("24");
		expect(req.request.params.get("offset")).toBe("0");
		expect(req.request.params.has("search")).toBe(false);
		req.flush(playersPage(0, 0));
		flushProfile(0, 0);
		await fixture.whenStable();
	});

	it("shows the total of the current tab from the page and the other from the profile", async () => {
		const fixture = setup("followers");

		expectConnections("followers").flush(playersPage(1, 30));
		flushProfile(7, 3);
		await settle(fixture);

		const tabs = element(fixture).querySelectorAll(
			'nav[aria-label="Connections"] a'
		);
		expect(tabs[0].textContent).toContain("30");
		expect(tabs[1].textContent).toContain("3");
		expect(element(fixture).textContent).toContain(
			"30 players follow @ada"
		);
	});

	it("loads the next page when the pagination changes", async () => {
		const fixture = setup("followers");
		expectConnections("followers").flush(playersPage(24, 30));
		flushProfile(30, 0);
		await settle(fixture);
		expect(renderedPlayers(fixture)).toBe(24);

		await clickPagination(fixture, "Next page");

		const req = expectConnections("followers");
		expect(req.request.params.get("offset")).toBe("24");
		expect(req.request.params.get("limit")).toBe("24");
		req.flush(playersPage(6, 30, "late"));
		await settle(fixture);
		expect(renderedPlayers(fixture)).toBe(6);
	});

	it("searches on the server after the debounce and goes back to the first page", async () => {
		const fixture = setup("following");
		expectConnections("following").flush(playersPage(24, 60));
		flushProfile(0, 60);
		await settle(fixture);
		await clickPagination(fixture, "Next page");
		expectConnections("following").flush(playersPage(24, 60, "second"));
		await settle(fixture);

		await typeSearch(fixture, " bo ");
		httpTesting.expectNone(req => req.url.endsWith("/following"));
		await wait(SEARCH_DEBOUNCE_WAIT_MS);
		await settle(fixture);

		const req = expectConnections("following");
		expect(req.request.params.get("search")).toBe("bo");
		expect(req.request.params.get("offset")).toBe("0");
		req.flush(playersPage(2, 2, "bo"));
		await settle(fixture);
		expect(renderedPlayers(fixture)).toBe(2);
		expect(
			element(fixture).querySelector('button[aria-label="Next page"]')
		).toBeNull();
	});

	it("shows no matches for a search without results and clears it", async () => {
		const fixture = setup("followers");
		expectConnections("followers").flush(playersPage(3, 3));
		flushProfile(3, 0);
		await settle(fixture);

		await typeSearch(fixture, "zzz");
		await wait(SEARCH_DEBOUNCE_WAIT_MS);
		await settle(fixture);
		expectConnections("followers").flush(playersPage(0, 0));
		await settle(fixture);

		expect(element(fixture).textContent).toContain(
			"Nobody here matches “zzz”."
		);
		expect(element(fixture).querySelector("ui-search-bar")).not.toBeNull();
		expect(element(fixture).textContent).not.toContain("No followers yet");

		element(fixture)
			.querySelector<HTMLButtonElement>("ui-no-matches button")!
			.click();
		await settle(fixture);

		const req = expectConnections("followers");
		expect(req.request.params.has("search")).toBe(false);
		req.flush(playersPage(3, 3));
		await settle(fixture);
		expect(renderedPlayers(fixture)).toBe(3);
	});

	it("shows the empty state without the search bar when there are no connections", async () => {
		const fixture = setup("following");

		expectConnections("following").flush(playersPage(0, 0));
		flushProfile(0, 0);
		await settle(fixture);

		expect(element(fixture).textContent).toContain(
			"Not following anyone yet"
		);
		expect(element(fixture).querySelector("ui-search-bar")).toBeNull();
		expect(
			element(fixture).querySelector("ui-pagination button")
		).toBeNull();
	});

	it("goes back to the last page when the offset falls out of range", async () => {
		const fixture = setup("followers");
		expectConnections("followers").flush(playersPage(24, 72));
		flushProfile(72, 0);
		await settle(fixture);
		await clickPagination(fixture, "Last page");

		const outOfRange = expectConnections("followers");
		expect(outOfRange.request.params.get("offset")).toBe("48");
		outOfRange.flush(playersPage(0, 30));
		await settle(fixture);

		const previous = expectConnections("followers");
		expect(previous.request.params.get("offset")).toBe("24");
		previous.flush(playersPage(6, 30, "rest"));
		await settle(fixture);
		expect(renderedPlayers(fixture)).toBe(6);
		expect(element(fixture).textContent).not.toContain("No followers yet");
	});

	it("shows the private state when the request is forbidden", async () => {
		const fixture = setup("followers");

		expectConnections("followers").flush(null, {
			status: 403,
			statusText: "Forbidden"
		});
		flushProfile(0, 0);
		await settle(fixture);

		expect(element(fixture).textContent).toContain(
			"These connections are private"
		);
	});
});
