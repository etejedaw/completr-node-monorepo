import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { MoodTagsService } from "./mood-tags";

describe("MoodTagsService", () => {
	const api = environment.apiUrl;
	let service: MoodTagsService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(MoodTagsService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	const me = `${api}/users/me`;

	it("lists my tags", () => {
		let result: unknown;

		service.getMyTags().subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${me}/mood-tags`);
		expect(req.request.method).toBe("GET");
		req.flush({ data: { tags: [{ tag: "cozy", usageCount: 2 }] } });
		expect(result).toEqual([{ tag: "cozy", usageCount: 2 }]);
	});

	it("reads the tags of a game", () => {
		let result: unknown;

		service.getGameTags("g1").subscribe(r => (result = r));

		httpTesting
			.expectOne(`${me}/games/g1/mood-tags`)
			.flush({ data: { tags: ["cozy"] } });
		expect(result).toEqual(["cozy"]);
	});

	it("replaces the tags of a game", () => {
		let result: unknown;

		service
			.replaceGameTags("g1", ["cozy", "short"])
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${me}/games/g1/mood-tags`);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({ tags: ["cozy", "short"] });
		req.flush({ data: { tags: ["cozy", "short"] } });
		expect(result).toEqual(["cozy", "short"]);
	});

	it("renames a tag encoding it in the url and returns the new name", () => {
		let result: unknown;

		service
			.updateTag("co op/fun", { newTag: "coop" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${me}/mood-tags/co%20op%2Ffun`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ newTag: "coop" });
		req.flush({ data: { tag: "coop" } });
		expect(result).toBe("coop");
	});

	it("deletes a tag encoding it in the url", () => {
		service.deleteTag("a b").subscribe();

		const req = httpTesting.expectOne(`${me}/mood-tags/a%20b`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
	});

	it("creates a tag and returns tag with description", () => {
		let result: unknown;

		service
			.createTag({ tag: "cozy", description: "Relaxing" })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${me}/mood-tags`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({
			tag: "cozy",
			description: "Relaxing"
		});
		req.flush({ data: { tag: "cozy", description: "Relaxing" } });
		expect(result).toEqual({ tag: "cozy", description: "Relaxing" });
	});
});
