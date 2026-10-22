import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { injectShowcaseGames } from "./showcase-games";

const api = environment.apiUrl;

describe("injectShowcaseGames", () => {
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("requests the showcase and exposes the response", async () => {
		const showcase = TestBed.runInInjectionContext(injectShowcaseGames);
		TestBed.tick();

		const request = httpTesting.expectOne(`${api}/games/showcase`);
		expect(request.request.method).toBe("GET");
		expect(showcase.isLoading()).toBe(true);

		const response = {
			data: {
				games: [
					{
						id: "g1",
						code: "hades",
						title: "Hades",
						backgroundUrl: "https://img.example/hades.jpg"
					}
				],
				featured: null
			}
		};
		request.flush(response);
		await TestBed.inject(ApplicationRef).whenStable();

		expect(showcase.isLoading()).toBe(false);
		expect(showcase.hasValue()).toBe(true);
		expect(showcase.value()).toEqual(response);
	});

	it("reports an error without a value when the request fails", async () => {
		const showcase = TestBed.runInInjectionContext(injectShowcaseGames);
		TestBed.tick();

		httpTesting
			.expectOne(`${api}/games/showcase`)
			.flush(null, { status: 500, statusText: "Server Error" });
		await TestBed.inject(ApplicationRef).whenStable();

		expect(showcase.hasValue()).toBe(false);
		expect(showcase.error()).toBeTruthy();
	});
});
