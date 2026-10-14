import { inject, type Signal, signal } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { catchError, debounceTime, type Observable, of, switchMap } from "rxjs";

import { type Game } from "../../core/models";
import { type GameSearchStatus } from "../../shared/components/game-search/game-search-step";
import { GamesService } from "./games";

export const GAME_SEARCH_MIN_LENGTH = 2;
export const GAME_SEARCH_DEBOUNCE_MS = 400;

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

	const searchCatalog = (term: string): Observable<Game[]> =>
		gamesService.searchLocal(term).pipe(
			switchMap(localResults => {
				if (localResults.length > 0 || !allowOnline()) {
					return of(localResults);
				}
				status.set("searchingOnline");
				return gamesService.search(term);
			})
		);

	toObservable(query)
		.pipe(
			switchMap(term => {
				if (!isSearchableQuery(term)) {
					status.set("idle");
					results.set([]);
					return of(null);
				}
				status.set("searching");
				return of(term.trim()).pipe(
					debounceTime(GAME_SEARCH_DEBOUNCE_MS)
				);
			}),
			switchMap(term =>
				term === null
					? of(null)
					: searchCatalog(term).pipe(catchError(() => of<Game[]>([])))
			),
			takeUntilDestroyed()
		)
		.subscribe(games => {
			if (games === null) return;
			results.set(games);
			status.set("done");
		});

	const searchOnline = () => {
		const term = query().trim();
		if (!isSearchableQuery(term) || forceSearching()) return;
		forceSearching.set(true);
		gamesService.search(term, true).subscribe({
			next: games => {
				results.set(games);
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
		searchOnline
	};
}
