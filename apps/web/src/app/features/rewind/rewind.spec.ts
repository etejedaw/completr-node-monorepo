import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { type RewindYears } from "../../core/models/rewind.model";
import { RewindService, rewindShareUrl } from "./rewind";

const api = environment.apiUrl;

describe("RewindService", () => {
	let service: RewindService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(RewindService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it("gets the years of a user and unwraps the data", () => {
		const years: RewindYears = { spotlightYear: 2026, years: [] };
		let result: RewindYears | undefined;

		service.getYears("ada").subscribe(value => (result = value));

		const req = httpTesting.expectOne(`${api}/users/ada/rewinds`);
		expect(req.request.method).toBe("GET");
		req.flush({ data: years });
		expect(result).toEqual(years);
	});

	it("gets the Rewind of a year and unwraps the data", () => {
		let result: unknown;

		service.getRewind("ada", 2025).subscribe(value => (result = value));

		const req = httpTesting.expectOne(`${api}/users/ada/rewinds/2025`);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { year: 2025 } });
		expect(result).toEqual({ year: 2025 });
	});

	it("escapes usernames that would break the path", () => {
		service.getYears("a/b?c").subscribe();

		httpTesting.expectOne(`${api}/users/a%2Fb%3Fc/rewinds`).flush({
			data: { spotlightYear: null, years: [] }
		});
	});

	it.each(["story", "og"] as const)("gets the %s image as a Blob", format => {
		const png = new Blob(["png"], { type: "image/png" });
		let result: Blob | undefined;

		service
			.getImage("ada", 2026, format)
			.subscribe(value => (result = value));

		const req = httpTesting.expectOne(
			`/share/rewind/ada/2026/${format}.png`
		);
		expect(req.request.method).toBe("GET");
		expect(req.request.responseType).toBe("blob");
		req.flush(png);
		expect(result).toBe(png);
	});

	it("builds the public share link on the web origin", () => {
		expect(rewindShareUrl("ada", 2026)).toBe(
			`${window.location.origin}/share/rewind/ada/2026`
		);
	});

	it("encodes the username in the share link and the image path", () => {
		expect(rewindShareUrl("a/b?c", 2026)).toBe(
			`${window.location.origin}/share/rewind/a%2Fb%3Fc/2026`
		);
		service.getImage("a/b?c", 2026, "story").subscribe();
		httpTesting
			.expectOne("/share/rewind/a%2Fb%3Fc/2026/story.png")
			.flush(new Blob());
	});
});
