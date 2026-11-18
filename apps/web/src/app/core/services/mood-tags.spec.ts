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

	it("replaces my favorite tags keeping their order", () => {
		let result: unknown;

		service
			.replaceFavoriteTags(["short", "cozy"])
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${me}/mood-tags/favorites`);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({ tags: ["short", "cozy"] });
		req.flush({ data: { tags: ["short", "cozy"] } });
		expect(result).toEqual(["short", "cozy"]);
	});

	it("reads the community tags of a game", () => {
		let result: unknown;

		service.getCommunityTags("g1").subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${api}/games/g1/tags`);
		expect(req.request.method).toBe("GET");
		req.flush({
			data: { tags: [{ tag: "cozy", players: 3, mine: true }] }
		});
		expect(result).toEqual([{ tag: "cozy", players: 3, mine: true }]);
	});

	it("asks for the popular tags with a limit", () => {
		let result: unknown;

		service.getPopularTags(5).subscribe(r => (result = r));

		const req = httpTesting.expectOne(r => r.url === `${api}/tags/popular`);
		expect(req.request.params.get("limit")).toBe("5");
		req.flush({ data: { tags: [{ tag: "cozy", games: 2, players: 4 }] } });
		expect(result).toEqual([{ tag: "cozy", games: 2, players: 4 }]);
	});

	it("searches tags sending the text and the limit as params", () => {
		service.searchTags("co op&x").subscribe();

		const req = httpTesting.expectOne(r => r.url === `${api}/tags/search`);
		expect(req.request.params.get("search")).toBe("co op&x");
		expect(req.request.params.get("limit")).toBe("10");
		req.flush({ data: { tags: [] } });
	});

	it("pages the games of a tag encoding the tag in the url", () => {
		let result: unknown;

		service
			.getTagGames("co op/fun", { limit: 24, offset: 48 })
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(
			r => r.url === `${api}/tags/co%20op%2Ffun/games`
		);
		expect(req.request.params.get("limit")).toBe("24");
		expect(req.request.params.get("offset")).toBe("48");
		req.flush({ data: { tag: "co op/fun", total: 0, games: [] } });
		expect(result).toEqual({ tag: "co op/fun", total: 0, games: [] });
	});
});
