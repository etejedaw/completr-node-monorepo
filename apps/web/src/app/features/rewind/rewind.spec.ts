import { provideHttpClient } from "@angular/common/http";
import { HttpErrorResponse } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import {
	type GenerateRewindRequest,
	type RewindYears
} from "../../core/models/rewind.model";
import { RewindService, rewindShareUrl } from "./rewind";
import { rewindAiRecapError, rewindGenerateError } from "./rewind-errors";

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

	it("generates the Rewind of the signed-in user with the chosen options", () => {
		const request: GenerateRewindRequest = {
			language: "es",
			includePrivateRuns: true,
			includeNotes: false,
			expectedGeneratedAt: null
		};
		let result: unknown;

		service.generate(2026, request).subscribe(value => (result = value));

		const req = httpTesting.expectOne(`${api}/users/me/rewinds/2026`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual(request);
		req.flush({ data: { year: 2026 } });
		expect(result).toEqual({ year: 2026 });
	});

	it("sends the current generatedAt when regenerating", () => {
		service
			.generate(2025, {
				language: "en",
				includePrivateRuns: false,
				includeNotes: false,
				expectedGeneratedAt: "2025-12-03T10:00:00.000Z"
			})
			.subscribe();

		const req = httpTesting.expectOne(`${api}/users/me/rewinds/2025`);
		expect(req.request.body.expectedGeneratedAt).toBe(
			"2025-12-03T10:00:00.000Z"
		);
		req.flush({ data: { year: 2025 } });
	});

	it("adds the AI recap to a generated year", () => {
		let result: unknown;

		service.addAiRecap(2026).subscribe(value => (result = value));

		const req = httpTesting.expectOne(
			`${api}/users/me/rewinds/2026/ai-recap`
		);
		expect(req.request.method).toBe("POST");
		req.flush({ data: { year: 2026, aiRecap: null } });
		expect(result).toEqual({ year: 2026, aiRecap: null });
	});
});

function httpError(status: number, type?: string) {
	return new HttpErrorResponse({
		status,
		error: type ? { type } : null
	});
}

describe("rewindGenerateError", () => {
	it.each([
		[0, undefined, "network"],
		[409, "REWIND_GENERATION_CONFLICT", "conflict"],
		[409, "REWIND_REGENERATION_LIMIT", "limit"],
		[409, undefined, "conflict"],
		[404, "REWIND_NOT_FOUND", "not_found"],
		[422, undefined, "invalid"],
		[429, undefined, "rate_limited"],
		[500, undefined, "failed"],
		[503, undefined, "failed"]
	] as const)("maps %s %s to %s", (status, type, expected) => {
		expect(rewindGenerateError(httpError(status, type))).toBe(expected);
	});

	it("treats a non-HTTP failure as a generic failure", () => {
		expect(rewindGenerateError(new Error("boom"))).toBe("failed");
		expect(rewindGenerateError(null)).toBe("failed");
	});
});

describe("rewindAiRecapError", () => {
	it.each([
		[0, undefined, "network"],
		[402, "REWIND_AI_RECAP_PREMIUM_REQUIRED", "premium_required"],
		[409, "REWIND_AI_RECAP_EXISTS", "exists"],
		[409, "REWIND_AI_RECAP_IN_PROGRESS", "in_progress"],
		[404, "REWIND_NOT_GENERATED", "not_generated"],
		[429, undefined, "rate_limited"],
		[503, "REWIND_AI_RECAP_FAILED", "failed"],
		[500, undefined, "failed"]
	] as const)("maps %s %s to %s", (status, type, expected) => {
		expect(rewindAiRecapError(httpError(status, type))).toBe(expected);
	});
});
