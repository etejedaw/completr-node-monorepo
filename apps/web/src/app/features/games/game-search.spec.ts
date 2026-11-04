import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { type Game } from "../../core/models";
import {
	GAME_SEARCH_DEBOUNCE_MS,
	GAME_SEARCH_MIN_LENGTH,
	injectGameSearch,
	isSearchableQuery
} from "./game-search";
import { GamesService } from "./games";
import { type OnlineGameSearchResult } from "./games.model";

const game = (id: string) => ({ id, code: id, title: id }) as Game;
const onlineResult = (
	games: Game[],
	rawgUnavailable = false
): OnlineGameSearchResult => ({ games, rawgUnavailable });

describe("isSearchableQuery", () => {
	it("requires the minimum number of characters", () => {
		expect(GAME_SEARCH_MIN_LENGTH).toBe(2);
		expect(isSearchableQuery("")).toBe(false);
		expect(isSearchableQuery("a")).toBe(false);
		expect(isSearchableQuery("ab")).toBe(true);
	});

	it("ignores surrounding whitespace", () => {
		expect(isSearchableQuery("  a  ")).toBe(false);
		expect(isSearchableQuery(" ab ")).toBe(true);
	});
});

describe("injectGameSearch", () => {
	const searchLocal = vi.fn();
	const search = vi.fn();
	const query = signal("");
	const allowOnline = signal(true);

	function setup() {
		return TestBed.runInInjectionContext(() =>
			injectGameSearch(query, allowOnline)
		);
	}

	function type(term: string) {
		query.set(term);
		TestBed.tick();
	}

	function settle() {
		vi.advanceTimersByTime(GAME_SEARCH_DEBOUNCE_MS);
	}

	beforeEach(() => {
		vi.useFakeTimers();
		query.set("");
		allowOnline.set(true);
		searchLocal.mockReset().mockReturnValue(of([]));
		search.mockReset().mockReturnValue(of(onlineResult([])));
		TestBed.configureTestingModule({
			providers: [
				{ provide: GamesService, useValue: { searchLocal, search } }
			]
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("starts idle with no results", () => {
		const { results, status, forceSearching } = setup();
		TestBed.tick();

		expect(results()).toEqual([]);
		expect(status()).toBe("idle");
		expect(forceSearching()).toBe(false);
		expect(searchLocal).not.toHaveBeenCalled();
	});

	it("does not search below the minimum length and stays idle", () => {
		const { status } = setup();

		type("a");
		settle();

		expect(status()).toBe("idle");
		expect(searchLocal).not.toHaveBeenCalled();
	});

	it("searches the local catalog with the typed term and reports done", () => {
		searchLocal.mockReturnValue(of([game("zelda")]));
		const { results, status } = setup();

		type("zelda");
		settle();

		expect(searchLocal).toHaveBeenCalledWith("zelda");
		expect(results().map(g => g.id)).toEqual(["zelda"]);
		expect(status()).toBe("done");
	});

	it("trims the term before searching", () => {
		const { status } = setup();

		type("  zelda  ");
		settle();

		expect(searchLocal).toHaveBeenCalledWith("zelda");
		expect(status()).toBe("done");
	});

	it("cancels the previous in-flight search when the term changes", () => {
		const first = new Subject<Game[]>();
		const second = new Subject<Game[]>();
		searchLocal.mockReturnValueOnce(first).mockReturnValueOnce(second);
		const { results, status } = setup();

		type("ze");
		settle();
		type("zel");
		settle();
		first.next([game("stale")]);
		second.next([game("fresh")]);

		expect(results().map(g => g.id)).toEqual(["fresh"]);
		expect(status()).toBe("done");
	});

	it("waits GAME_SEARCH_DEBOUNCE_MS before querying", () => {
		const { status } = setup();

		type("zelda");
		vi.advanceTimersByTime(GAME_SEARCH_DEBOUNCE_MS - 1);

		expect(searchLocal).not.toHaveBeenCalled();
		expect(status()).toBe("searching");

		vi.advanceTimersByTime(1);

		expect(searchLocal).toHaveBeenCalledOnce();
		expect(searchLocal).toHaveBeenCalledWith("zelda");
	});

	it("queries only the last term when typing faster than the debounce", () => {
		setup();

		type("ze");
		vi.advanceTimersByTime(GAME_SEARCH_DEBOUNCE_MS / 2);
		type("zel");
		vi.advanceTimersByTime(GAME_SEARCH_DEBOUNCE_MS / 2);
		type("zeld");
		settle();

		expect(searchLocal).toHaveBeenCalledOnce();
		expect(searchLocal).toHaveBeenCalledWith("zeld");
	});

	it("does not go online when the local catalog has results", () => {
		searchLocal.mockReturnValue(of([game("zelda")]));
		setup();

		type("zelda");
		settle();

		expect(search).not.toHaveBeenCalled();
	});

	it("falls back to the online search when nothing is found locally", () => {
		search.mockReturnValue(of(onlineResult([game("imported")])));
		const { results, status } = setup();

		type("imported");
		settle();

		expect(search).toHaveBeenCalledWith("imported");
		expect(results().map(g => g.id)).toEqual(["imported"]);
		expect(status()).toBe("done");
	});

	it("reports searchingOnline while the fallback is pending", () => {
		const online = new Subject<OnlineGameSearchResult>();
		search.mockReturnValue(online);
		const { status } = setup();

		type("imported");
		settle();

		expect(status()).toBe("searchingOnline");
		online.next(onlineResult([]));
		expect(status()).toBe("done");
	});

	it("skips the online fallback when online search is not allowed", () => {
		allowOnline.set(false);
		const { results, status } = setup();

		type("missing");
		settle();

		expect(search).not.toHaveBeenCalled();
		expect(results()).toEqual([]);
		expect(status()).toBe("done");
	});

	it("ends with no results instead of failing when the catalog request errors", () => {
		searchLocal.mockReturnValue(throwError(() => new Error("boom")));
		const { results, status } = setup();

		type("zelda");
		settle();

		expect(results()).toEqual([]);
		expect(status()).toBe("done");
	});

	it("ends with no results when the online fallback errors", () => {
		search.mockReturnValue(throwError(() => new Error("boom")));
		const { results, status } = setup();

		type("zelda");
		settle();

		expect(results()).toEqual([]);
		expect(status()).toBe("done");
	});

	it("reports RAWG as unavailable when the online fallback says so", () => {
		search.mockReturnValue(of(onlineResult([], true)));
		const { results, status, rawgUnavailable } = setup();

		type("zelda");
		settle();

		expect(results()).toEqual([]);
		expect(rawgUnavailable()).toBe(true);
		expect(status()).toBe("done");
	});

	it("forgets that RAWG was unavailable as soon as the user types again", () => {
		search.mockReturnValue(of(onlineResult([], true)));
		const { rawgUnavailable } = setup();
		type("zelda");
		settle();
		searchLocal.mockReturnValue(of([game("zelda")]));

		type("zeld");

		expect(rawgUnavailable()).toBe(false);
		settle();
		expect(rawgUnavailable()).toBe(false);
	});

	it("does not flag RAWG when the catalog answers", () => {
		searchLocal.mockReturnValue(of([game("zelda")]));
		const { rawgUnavailable } = setup();

		type("zelda");
		settle();

		expect(rawgUnavailable()).toBe(false);
	});

	it("clears results and goes idle when the query drops below the minimum", () => {
		searchLocal.mockReturnValue(of([game("zelda")]));
		const { results, status } = setup();
		type("zelda");
		settle();
		expect(results()).toHaveLength(1);

		type("z");

		expect(results()).toEqual([]);
		expect(status()).toBe("idle");
	});

	it("goes idle when the query is emptied after a search", () => {
		const { status } = setup();
		type("zelda");

		type("");
		settle();

		expect(status()).toBe("idle");
	});

	describe("searchOnline", () => {
		it("forces a RAWG lookup and replaces the results", () => {
			search.mockReturnValue(of(onlineResult([game("rawg-hit")])));
			const { results, status, searchOnline, forceSearching } = setup();
			type("zelda");
			settle();

			searchOnline();

			expect(search).toHaveBeenLastCalledWith("zelda", true);
			expect(results().map(g => g.id)).toEqual(["rawg-hit"]);
			expect(status()).toBe("done");
			expect(forceSearching()).toBe(false);
		});

		it("flags forceSearching while the request is in flight", () => {
			const online = new Subject<OnlineGameSearchResult>();
			search.mockReturnValue(online);
			const { searchOnline, forceSearching } = setup();
			type("zelda");

			searchOnline();

			expect(forceSearching()).toBe(true);
			online.next(onlineResult([]));
			online.complete();
			expect(forceSearching()).toBe(false);
		});

		it("ignores calls while a forced search is already running", () => {
			const { searchOnline } = setup();
			type("zelda");
			search
				.mockClear()
				.mockReturnValue(new Subject<OnlineGameSearchResult>());

			searchOnline();
			searchOnline();

			expect(search).toHaveBeenCalledTimes(1);
		});

		it("does nothing when the query is too short", () => {
			const { searchOnline, forceSearching } = setup();
			type("z");

			searchOnline();

			expect(search).not.toHaveBeenCalled();
			expect(forceSearching()).toBe(false);
		});

		it("uses the trimmed current query without waiting for the debounce", () => {
			const { searchOnline } = setup();
			type("  zelda ");

			searchOnline();

			expect(search).toHaveBeenCalledWith("zelda", true);
		});

		it("reports RAWG as unavailable and clears it when a retry succeeds", () => {
			search.mockReturnValue(of(onlineResult([], true)));
			const { results, rawgUnavailable, searchOnline } = setup();
			type("zelda");
			settle();
			expect(rawgUnavailable()).toBe(true);

			search.mockReturnValue(of(onlineResult([game("rawg-hit")])));
			searchOnline();

			expect(rawgUnavailable()).toBe(false);
			expect(results().map(g => g.id)).toEqual(["rawg-hit"]);
		});

		it("ignores a forced answer that arrives after the user changed the query", () => {
			searchLocal.mockReturnValue(of([game("mario")]));
			const online = new Subject<OnlineGameSearchResult>();
			search.mockReturnValue(online);
			const { results, rawgUnavailable, searchOnline, forceSearching } =
				setup();
			type("zelda");
			searchOnline();

			type("mario");
			settle();
			online.next(onlineResult([], true));

			expect(results().map(g => g.id)).toEqual(["mario"]);
			expect(rawgUnavailable()).toBe(false);
			expect(forceSearching()).toBe(false);
		});

		it("keeps the previous results and allows a retry when the request fails", () => {
			searchLocal.mockReturnValue(of([game("zelda")]));
			const { results, searchOnline, forceSearching } = setup();
			type("zelda");
			settle();
			search.mockReturnValue(throwError(() => new Error("boom")));

			searchOnline();

			expect(results().map(g => g.id)).toEqual(["zelda"]);
			expect(forceSearching()).toBe(false);
			search.mockReturnValue(of(onlineResult([game("again")])));
			searchOnline();
			expect(results().map(g => g.id)).toEqual(["again"]);
		});
	});
});
