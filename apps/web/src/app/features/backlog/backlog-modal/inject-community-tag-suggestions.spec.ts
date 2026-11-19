import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import { injectCommunityTagSuggestions } from "./inject-community-tag-suggestions";

describe("injectCommunityTagSuggestions", () => {
	const api = environment.apiUrl;
	let httpTesting: HttpTestingController;
	const selectedGameId = signal<string | undefined>(undefined);

	function setup() {
		return TestBed.runInInjectionContext(() =>
			injectCommunityTagSuggestions({ gameId: selectedGameId })
		);
	}

	beforeEach(() => {
		selectedGameId.set(undefined);
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpTesting.verify());

	it("keeps only the answer of the last game picked when the user switches fast", () => {
		const suggestions = setup();

		selectedGameId.set("g1");
		suggestions.load("g1");
		const slow = httpTesting.expectOne(`${api}/games/g1/tags`);
		selectedGameId.set("g2");
		suggestions.load("g2");

		expect(slow.cancelled).toBe(true);
		httpTesting.expectOne(`${api}/games/g2/tags`).flush({
			data: { tags: [{ tag: "brutal", players: 3, mine: false }] }
		});
		expect(suggestions.suggestions().map(item => item.tag)).toEqual([
			"brutal"
		]);
	});

	it("hides the suggestions once the user clears the game", () => {
		const suggestions = setup();
		selectedGameId.set("g1");
		suggestions.load("g1");
		httpTesting.expectOne(`${api}/games/g1/tags`).flush({
			data: { tags: [{ tag: "cozy", players: 2, mine: false }] }
		});

		selectedGameId.set(undefined);

		expect(suggestions.suggestions()).toEqual([]);
	});

	it("shows nothing instead of failing the modal when the tags can't load", () => {
		const suggestions = setup();
		selectedGameId.set("g1");
		suggestions.load("g1");

		httpTesting
			.expectOne(`${api}/games/g1/tags`)
			.flush(null, { status: 500, statusText: "Error" });

		expect(suggestions.suggestions()).toEqual([]);
	});

	it("shows at most 8 tags and skips tags nobody uses anymore", () => {
		const suggestions = setup();
		selectedGameId.set("g1");
		suggestions.load("g1");

		httpTesting.expectOne(`${api}/games/g1/tags`).flush({
			data: {
				tags: [
					{ tag: "ghost", players: 0, mine: false },
					...Array.from({ length: 10 }, (_, i) => ({
						tag: `t${i}`,
						players: 2,
						mine: false
					}))
				]
			}
		});

		expect(suggestions.suggestions()).toHaveLength(8);
		expect(suggestions.suggestions()[0].tag).toBe("t0");
	});
});
