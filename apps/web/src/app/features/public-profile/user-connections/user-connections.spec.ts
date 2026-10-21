import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, provideRouter } from "@angular/router";

import { environment } from "../../../../environments/environment";
import { type ConnectionKind, UserConnections } from "./user-connections";

const api = environment.apiUrl;

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

	function flushProfile(followerCount: number, followingCount: number) {
		httpTesting
			.expectOne(`${api}/users/ada`)
			.flush({ data: { followerCount, followingCount } });
	}

	afterEach(() => {
		httpTesting.verify();
	});

	it("requests only the followers on the followers screen", async () => {
		const fixture = setup("followers");

		httpTesting
			.expectOne(`${api}/users/ada/followers`)
			.flush({ data: { users: [] } });
		flushProfile(1, 2);
		await fixture.whenStable();

		httpTesting.expectNone(`${api}/users/ada/following`);
	});

	it("requests only the following on the following screen", async () => {
		const fixture = setup("following");

		httpTesting
			.expectOne(`${api}/users/ada/following`)
			.flush({ data: { users: [] } });
		flushProfile(1, 2);
		await fixture.whenStable();

		httpTesting.expectNone(`${api}/users/ada/followers`);
	});

	it("shows the totals of both tabs from the profile without loading the other list", async () => {
		const fixture = setup("followers");

		httpTesting
			.expectOne(`${api}/users/ada/followers`)
			.flush({ data: { users: [{ id: "u1", username: "bob" }] } });
		flushProfile(7, 3);
		await fixture.whenStable();
		fixture.detectChanges();

		const tabs = fixture.nativeElement.querySelectorAll(
			'nav[aria-label="Connections"] a'
		);
		expect(tabs[0].textContent).toContain("1");
		expect(tabs[1].textContent).toContain("3");
		httpTesting.expectNone(`${api}/users/ada/following`);
	});

	it("shows the private state when the request is forbidden", async () => {
		const fixture = setup("followers");

		httpTesting
			.expectOne(`${api}/users/ada/followers`)
			.flush(null, { status: 403, statusText: "Forbidden" });
		flushProfile(0, 0);
		await fixture.whenStable();
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain(
			"These connections are private"
		);
	});
});
