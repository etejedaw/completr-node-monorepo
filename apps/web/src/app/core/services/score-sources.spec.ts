import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { ScoreSourcesService } from "./score-sources";

const sources = [
	{ code: "metacritic", name: "Metacritic", scale: 100, priority: 1 },
	{ code: "rawg", name: "RAWG", scale: 5, priority: 2 },
	{ code: "completr", name: "Completr", scale: 10, priority: 3 }
];

describe("ScoreSourcesService", () => {
	const url = `${environment.apiUrl}/score-sources`;
	let service: ScoreSourcesService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(ScoreSourcesService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	function loadSources() {
		service.load();
		httpTesting.expectOne(url).flush({ data: { sources } });
	}

	it("loads the sources and exposes them through the signal", () => {
		loadSources();

		expect(service.sources()).toEqual(sources);
	});

	it("shares a single request between concurrent callers", () => {
		const first = vi.fn();
		const second = vi.fn();

		service.whenLoaded().subscribe(first);
		service.whenLoaded().subscribe(second);

		httpTesting.expectOne(url).flush({ data: { sources } });
		expect(first).toHaveBeenCalledWith(sources);
		expect(second).toHaveBeenCalledWith(sources);
	});

	it("does not request again once loaded", () => {
		loadSources();

		service.whenLoaded().subscribe();

		httpTesting.expectNone(url);
	});

	it("retries on the next call after a failed load", () => {
		service.whenLoaded().subscribe({ error: () => undefined });
		httpTesting
			.expectOne(url)
			.flush(null, { status: 500, statusText: "Server Error" });

		service.whenLoaded().subscribe();

		httpTesting.expectOne(url).flush({ data: { sources } });
		expect(service.sources()).toEqual(sources);
	});

	it("excludes the computed completr source from the manual sources", () => {
		loadSources();

		expect(service.manualSources().map(s => s.code)).toEqual([
			"metacritic",
			"rawg"
		]);
	});

	it("returns the scale of a known source and null for an unknown one", () => {
		loadSources();

		expect(service.getScale("metacritic")).toBe(100);
		expect(service.getScale("nope")).toBeNull();
	});

	it("normalizes a score to the 5-point scale rounded to two decimals", () => {
		loadSources();

		expect(service.normalize(85, "metacritic")).toBe(4.25);
		expect(service.normalize(77, "metacritic")).toBe(3.85);
	});

	it("leaves the score untouched for 5-point and unknown sources", () => {
		loadSources();

		expect(service.normalize(4, "rawg")).toBe(4);
		expect(service.normalize(80, "nope")).toBe(80);
	});
});
