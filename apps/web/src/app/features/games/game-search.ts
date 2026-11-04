import { inject, type Signal, signal } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { catchError, map, type Observable, of, switchMap, timer } from "rxjs";

import { type Game, type OnlineSearchSource } from "../../core/models";
import { type GameSearchStatus } from "../../shared/components/game-search/game-search-step";
import { GamesService } from "./games";
import { type OnlineGameSearchResult } from "./games.model";

export const GAME_SEARCH_MIN_LENGTH = 2;
export const GAME_SEARCH_DEBOUNCE_MS = 400;

export function catalogOnlyResult(games: Game[]): OnlineGameSearchResult {
	return { games, onlineSearchUnavailable: false };
}

export function isSearchableQuery(query: string): boolean {
	return query.trim().length >= GAME_SEARCH_MIN_LENGTH;
}

export function injectGameSearch(
	query: Signal<string>,
	allowOnline: Signal<boolean>
) {
	const gamesService = inject(GamesService);
	const results = signal<Game[]>([]);
	const status = signal<GameSearchStatus>("idle");
	const forceSearching = signal(false);
	const onlineSearchUnavailable = signal(false);
	const onlineSearchSource = signal<OnlineSearchSource | undefined>(
		undefined
	);

	const applyOnlineState = (result: OnlineGameSearchResult) => {
		onlineSearchUnavailable.set(result.onlineSearchUnavailable);
		onlineSearchSource.set(result.onlineSearchSource);
	};

	const searchCatalog = (term: string): Observable<OnlineGameSearchResult> =>
		gamesService.searchLocal(term).pipe(
			switchMap(localResults => {
				if (localResults.length > 0 || !allowOnline()) {
					return of(catalogOnlyResult(localResults));
				}
				status.set("searchingOnline");
				return gamesService.search(term);
			})
		);

	toObservable(query)
		.pipe(
			switchMap(term => {
				onlineSearchUnavailable.set(false);
				onlineSearchSource.set(undefined);
				if (!isSearchableQuery(term)) {
					status.set("idle");
					results.set([]);
					return of(null);
				}
				status.set("searching");
				return timer(GAME_SEARCH_DEBOUNCE_MS).pipe(
					map(() => term.trim())
				);
			}),
			switchMap(term =>
				term === null
					? of(null)
					: searchCatalog(term).pipe(
							catchError(() => of(catalogOnlyResult([])))
						)
			),
			takeUntilDestroyed()
		)
		.subscribe(result => {
			if (result === null) return;
			results.set(result.games);
			applyOnlineState(result);
			status.set("done");
		});

	const searchOnline = () => {
		const term = query().trim();
		if (!isSearchableQuery(term) || forceSearching()) return;
		forceSearching.set(true);
		gamesService.search(term, true).subscribe({
			next: result => {
				if (query().trim() !== term) {
					forceSearching.set(false);
					return;
				}
				results.set(result.games);
				applyOnlineState(result);
				status.set("done");
				forceSearching.set(false);
			},
			error: () => forceSearching.set(false)
		});
	};

	return {
		results: results.asReadonly(),
		status: status.asReadonly(),
		forceSearching: forceSearching.asReadonly(),
		onlineSearchUnavailable: onlineSearchUnavailable.asReadonly(),
		onlineSearchSource: onlineSearchSource.asReadonly(),
		searchOnline
	};
}
