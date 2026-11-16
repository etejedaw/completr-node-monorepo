import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	inject,
	input,
	output,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
	debounceTime,
	distinctUntilChanged,
	of,
	Subject,
	switchMap
} from "rxjs";

import { type Game, type OnlineSearchSource } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { type OnlineGameSearchResult } from "../../../core/services/games.model";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { OnlineSourceNote } from "../../../shared/components/online-source-note/online-source-note";
import {
	ONLINE_SEARCH_UNAVAILABLE_HINT,
	ONLINE_SEARCH_UNAVAILABLE_TITLE,
	onlineSourceLabel
} from "../../../shared/constants/online-search";
import { GameArtPipe } from "../../../shared/pipes/game-art";
import { UiSearchBar, UiSelectableRow, UiSkeleton } from "../../../shared/ui";
import { catalogOnlyResult } from "../../../shared/utils/inject-game-search";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

@Component({
	selector: "app-list-add-game",
	imports: [
		GamePoster,
		OnlineSourceNote,
		UiSearchBar,
		UiSelectableRow,
		UiSkeleton,
		GameArtPipe
	],
	templateUrl: "./list-add-game.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListAddGame {
	private readonly gamesService = inject(GamesService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly searchSubject = new Subject<string>();

	readonly listedGameIds = input.required<ReadonlySet<string>>();
	readonly gameSelected = output<Game>();

	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<Game[]>([]);
	protected readonly isSearching = signal(false);
	protected readonly isSearchingOnline = signal(false);
	protected readonly onlineSearchUnavailable = signal(false);
	protected readonly onlineSearchSource = signal<
		OnlineSearchSource | undefined
	>(undefined);
	protected readonly unavailableTitle = ONLINE_SEARCH_UNAVAILABLE_TITLE;
	protected readonly unavailableHint = ONLINE_SEARCH_UNAVAILABLE_HINT;
	protected readonly searchSkeletonRows = [0, 1, 2];

	constructor() {
		this.searchSubject
			.pipe(
				debounceTime(SEARCH_DEBOUNCE_MS),
				distinctUntilChanged(),
				switchMap(query => this.searchCatalog(query)),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(result => {
				this.searchResults.set(result.games);
				this.applyOnlineState(result);
				this.isSearching.set(false);
				this.isSearchingOnline.set(false);
			});
	}

	protected sourceLabel(): string {
		return onlineSourceLabel(this.onlineSearchSource());
	}

	protected onSearch(query: string) {
		this.searchQuery.set(query);
		if (query.length >= MIN_QUERY_LENGTH) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	private searchCatalog(query: string) {
		this.onlineSearchUnavailable.set(false);
		this.onlineSearchSource.set(undefined);
		if (query.length < MIN_QUERY_LENGTH) {
			this.isSearching.set(false);
			this.isSearchingOnline.set(false);
			return of(catalogOnlyResult([]));
		}
		this.isSearching.set(true);
		this.isSearchingOnline.set(false);
		return this.gamesService.searchLocal(query).pipe(
			switchMap(localResults => {
				if (localResults.length > 0) {
					return of(catalogOnlyResult(localResults));
				}
				this.isSearching.set(false);
				this.isSearchingOnline.set(true);
				return this.gamesService.search(query);
			})
		);
	}

	private applyOnlineState(result: OnlineGameSearchResult) {
		this.onlineSearchUnavailable.set(result.onlineSearchUnavailable);
		this.onlineSearchSource.set(result.onlineSearchSource);
	}
}
