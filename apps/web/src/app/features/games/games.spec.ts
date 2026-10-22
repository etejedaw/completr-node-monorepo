import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { SUPPRESS_VALIDATION_TOAST } from "../../shared/utils/validation-errors";
import { GamesService } from "./games";

describe("GamesService", () => {
	const api = environment.apiUrl;
	let service: GamesService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(GamesService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	describe("catalog queries", () => {
		it("lists games with the query as params and returns the envelope", () => {
			const body = {
				data: { games: [{ id: "g1" }], total: 1, limit: 20, offset: 0 }
			};
			let result: unknown;

			service
				.getGames({
					search: "zelda",
					platforms: "p1,p2",
					is_dlc: false,
					min_score: 0,
					genre: ""
				})
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(r => r.url === `${api}/games`);
			expect(req.request.method).toBe("GET");
			expect(req.request.params.get("search")).toBe("zelda");
			expect(req.request.params.get("platforms")).toBe("p1,p2");
			expect(req.request.params.get("is_dlc")).toBe("false");
			expect(req.request.params.get("min_score")).toBe("0");
			expect(req.request.params.has("genre")).toBe(false);
			req.flush(body);
			expect(result).toEqual(body);
		});

		it("searches games by encoded query", () => {
			let result: unknown;

			service.search("a&b c").subscribe(r => (result = r));

			httpTesting
				.expectOne(`${api}/games/search?query=a%26b%20c`)
				.flush({ data: { games: [{ id: "g1" }] } });
			expect(result).toEqual([{ id: "g1" }]);
		});

		it("forces the RAWG lookup when asked", () => {
			service.search("zelda", true).subscribe();

			httpTesting
				.expectOne(`${api}/games/search?query=zelda&force_rawg=true`)
				.flush({ data: { games: [] } });
		});

		it("searches only the local catalog", () => {
			service.searchLocal("zelda").subscribe();

			httpTesting
				.expectOne(`${api}/games/search?query=zelda&local_only=true`)
				.flush({ data: { games: [] } });
		});

		it("requests 16 latest reviewed games by default", () => {
			let result: unknown;

			service.getLatestReviewed().subscribe(r => (result = r));

			httpTesting
				.expectOne(`${api}/games/latest-reviewed?limit=16`)
				.flush({ data: { games: [{ id: "g1" }] } });
			expect(result).toEqual([{ id: "g1" }]);
		});

		it("loads platforms and genres unwrapped", () => {
			let platforms: unknown;
			let genres: unknown;

			service.getPlatforms().subscribe(r => (platforms = r));
			service.getGenres().subscribe(r => (genres = r));

			httpTesting
				.expectOne(`${api}/platforms`)
				.flush({ data: { platforms: [{ id: "p1" }] } });
			httpTesting
				.expectOne(`${api}/genres`)
				.flush({ data: { genres: [{ id: "ge1" }] } });
			expect(platforms).toEqual([{ id: "p1" }]);
			expect(genres).toEqual([{ id: "ge1" }]);
		});

		it("loads a game by code", () => {
			let result: unknown;

			service.getByCode("zelda-botw").subscribe(r => (result = r));

			httpTesting
				.expectOne(`${api}/games/zelda-botw`)
				.flush({ data: { game: { id: "g1" } } });
			expect(result).toEqual({ id: "g1" });
		});

		it("fetches the RAWG detail by encoded slug", () => {
			let result: unknown;

			service.rawgBySlug("half life/2").subscribe(r => (result = r));

			httpTesting
				.expectOne(`${api}/game-external/rawg/half%20life%2F2`)
				.flush({ data: { game: { rawgId: 1 } } });
			expect(result).toEqual({ rawgId: 1 });
		});
	});

	describe("game management", () => {
		it("creates a game and returns it", () => {
			let result: unknown;

			service.createGame({ title: "New" }).subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/games`);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual({ title: "New" });
			req.flush({ data: { game: { id: "g1" } } });
			expect(result).toEqual({ id: "g1" });
		});

		it("updates a game and returns it", () => {
			let result: unknown;

			service
				.updateGame("g1", { franchiseId: null })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/games/g1`);
			expect(req.request.method).toBe("PATCH");
			expect(req.request.body).toEqual({ franchiseId: null });
			req.flush({ data: { game: { id: "g1" } } });
			expect(result).toEqual({ id: "g1" });
		});

		it("deactivates with a soft delete and hard deletes with the hard flag", () => {
			service.deactivate("g1").subscribe();
			const soft = httpTesting.expectOne(`${api}/games/g1`);
			expect(soft.request.method).toBe("DELETE");
			soft.flush(null);

			service.hardDelete("g1").subscribe();
			const hard = httpTesting.expectOne(`${api}/games/g1?hard=true`);
			expect(hard.request.method).toBe("DELETE");
			hard.flush(null);
		});

		it("reactivates a game", () => {
			service.reactivate("g1").subscribe();

			const req = httpTesting.expectOne(`${api}/games/g1/reactivate`);
			expect(req.request.method).toBe("POST");
			req.flush(null);
		});

		it("splits a game into variants and returns the new games", () => {
			const dto = { variants: [{ title: "A", variant: "a" }] };
			let result: unknown;

			service.splitGame("g1", dto).subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/games/g1/split`);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual(dto);
			req.flush({ data: { games: [{ id: "g2" }] } });
			expect(result).toEqual([{ id: "g2" }]);
		});

		it("sets the compilation items and returns them", () => {
			const dto = {
				items: [
					{ mode: "link" as const, gameId: "g2" },
					{ mode: "create" as const, title: "Extra" }
				]
			};
			let result: unknown;

			service.setCompilationItems("g1", dto).subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				`${api}/games/g1/compilation-items`
			);
			expect(req.request.method).toBe("PUT");
			expect(req.request.body).toEqual(dto);
			req.flush({ data: { items: [{ id: "c1" }] } });
			expect(result).toEqual([{ id: "c1" }]);
		});

		it("clears a compilation expecting a text response", () => {
			service.clearCompilation("g1").subscribe();

			const req = httpTesting.expectOne(
				`${api}/games/g1/compilation-items`
			);
			expect(req.request.method).toBe("DELETE");
			expect(req.request.responseType).toBe("text");
			req.flush("");
		});
	});

	describe("reports, scores and times", () => {
		it("reports a game with the general category by default", () => {
			service.reportGame("g1", "Wrong cover").subscribe();

			const req = httpTesting.expectOne(`${api}/games/g1/reports`);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual({
				message: "Wrong cover",
				category: "general"
			});
			req.flush(null);
		});

		it("reports a game with an explicit category", () => {
			service.reportGame("g1", "No time", "missing_duration").subscribe();

			const req = httpTesting.expectOne(`${api}/games/g1/reports`);
			expect(req.request.body.category).toBe("missing_duration");
			req.flush(null);
		});

		it("creates and updates a score", () => {
			service.createScore("g1", "metacritic", 90).subscribe();
			const create = httpTesting.expectOne(`${api}/game-scores`);
			expect(create.request.method).toBe("POST");
			expect(create.request.body).toEqual({
				gameId: "g1",
				source: "metacritic",
				score: 90
			});
			create.flush(null);

			service.updateScore("g1", "metacritic", 91).subscribe();
			const update = httpTesting.expectOne(
				`${api}/game-scores/g1/metacritic`
			);
			expect(update.request.method).toBe("PATCH");
			expect(update.request.body).toEqual({ score: 91 });
			update.flush(null);
		});

		it("creates and updates a time", () => {
			service.createTime("g1", "hltb", 12).subscribe();
			const create = httpTesting.expectOne(`${api}/game-times`);
			expect(create.request.method).toBe("POST");
			expect(create.request.body).toEqual({
				gameId: "g1",
				source: "hltb",
				duration: 12
			});
			create.flush(null);

			service.updateTime("g1", "hltb", 14).subscribe();
			const update = httpTesting.expectOne(`${api}/game-times/g1/hltb`);
			expect(update.request.method).toBe("PATCH");
			expect(update.request.body).toEqual({ duration: 14 });
			update.flush(null);
		});

		it("replaces the whole set of scores in a single PUT", () => {
			const scores = [{ source: "metacritic", score: 90 }];
			service.replaceScores("g1", scores).subscribe();
			const request = httpTesting.expectOne(`${api}/games/g1/scores`);
			expect(request.request.method).toBe("PUT");
			expect(request.request.body).toEqual({ scores });
			expect(request.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(
				true
			);
			request.flush(null);
		});

		it("replaces the whole set of times in a single PUT", () => {
			const times = [{ source: "hltb", duration: 12 }];
			service.replaceTimes("g1", times).subscribe();
			const request = httpTesting.expectOne(`${api}/games/g1/times`);
			expect(request.request.method).toBe("PUT");
			expect(request.request.body).toEqual({ times });
			expect(request.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(
				true
			);
			request.flush(null);
		});

		it("deletes a score and a time expecting text responses", () => {
			service.deleteScore("g1", "metacritic").subscribe();
			const score = httpTesting.expectOne(
				`${api}/game-scores/g1/metacritic`
			);
			expect(score.request.method).toBe("DELETE");
			expect(score.request.responseType).toBe("text");
			score.flush("");

			service.deleteTime("g1", "hltb").subscribe();
			const time = httpTesting.expectOne(`${api}/game-times/g1/hltb`);
			expect(time.request.method).toBe("DELETE");
			expect(time.request.responseType).toBe("text");
			time.flush("");
		});
	});

	describe("social data of a game", () => {
		it("returns the lists containing the game and my lists", () => {
			const data = { lists: [{ id: "l1" }], myLists: [{ id: "l2" }] };
			let result: unknown;

			service.getGameLists("g1").subscribe(r => (result = r));

			httpTesting.expectOne(`${api}/games/g1/lists`).flush({ data });
			expect(result).toEqual(data);
		});

		it("returns the friends activity unwrapped", () => {
			let result: unknown;

			service.getFriendsActivity("g1").subscribe(r => (result = r));

			httpTesting
				.expectOne(`${api}/games/g1/friends-activity`)
				.flush({ data: { friends: [{ username: "ada" }] } });
			expect(result).toEqual([{ username: "ada" }]);
		});

		it("returns the players unwrapped", () => {
			let result: unknown;

			service.getPlayers("g1").subscribe(r => (result = r));

			httpTesting
				.expectOne(`${api}/games/g1/players`)
				.flush({ data: { players: [{ username: "ada" }] } });
			expect(result).toEqual([{ username: "ada" }]);
		});
	});
});
