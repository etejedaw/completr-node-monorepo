import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import {
	debounceTime,
	distinctUntilChanged,
	map,
	of,
	skip,
	Subject,
	switchMap
} from "rxjs";

import {
	type Game,
	type Genre,
	type List,
	type Platform
} from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ViewportService } from "../../../core/services/viewport";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { ListCard } from "../../../shared/components/list-card/list-card";
import { PosterShelf } from "../../../shared/components/poster-shelf/poster-shelf";
import {
	UiBottomSheet,
	UiButton,
	UiPagination,
	UiSearchBar,
	UiSelect,
	UiSkeleton
} from "../../../shared/ui";
import { ListsService } from "../../lists/lists";
import { AdminGameEditor } from "../admin-game-editor/admin-game-editor";
import { GamesService } from "../games";
import {
	BrowseFilters,
	type BrowseSortOption
} from "./components/browse-filters";
import { BrowseHero } from "./components/browse-hero";

const FEATURED_GAMES_LIMIT = 5;
const QUICK_GENRES_LIMIT = 16;

@Component({
	selector: "app-games-browse",
	imports: [
		NgTemplateOutlet,
		AdminGameEditor,
		UiBottomSheet,
		UiButton,
		UiPagination,
		UiSearchBar,
		UiSelect,
		UiSkeleton,
		BrowseFilters,
		BrowseHero,
		GameCoverCard,
		ListCard,
		PosterShelf
	],
	templateUrl: "./games-browse.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesBrowse implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly listsService = inject(ListsService);
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	private readonly searchSubject = new Subject<string>();
	protected readonly isMobile = inject(ViewportService).isMobile;

	protected readonly isAdmin = computed(() => {
		const role = this.authService.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<Game[]>([]);
	protected readonly isSearching = signal(false);
	protected readonly isSearchingOnline = signal(false);
	protected readonly showCreateEditor = signal(false);
	protected readonly searchingRawg = signal(false);

	protected readonly latestGames = signal<Game[]>([]);
	protected readonly randomGenre = signal<Genre | null>(null);
	protected readonly genreGames = signal<Game[]>([]);
	protected readonly latestReviewed = signal<Game[]>([]);
	protected readonly officialLists = signal<List[]>([]);
	protected readonly recentLists = signal<List[]>([]);
	protected readonly isInitialLoad = signal(true);

	protected readonly showFilters = signal(false);
	protected readonly allGenres = signal<Genre[]>([]);
	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly selectedGenres = signal<Set<string>>(new Set());
	protected readonly selectedPlatforms = signal<Set<string>>(new Set());
	protected readonly yearFrom = signal<number | null>(null);
	protected readonly yearTo = signal<number | null>(null);
	protected readonly minScore = signal<number | null>(null);
	protected readonly maxScore = signal<number | null>(null);
	protected readonly minDuration = signal<number | null>(null);
	protected readonly maxDuration = signal<number | null>(null);
	protected readonly isDlc = signal<boolean | null>(null);
	protected readonly sortBy = signal<string>("createdAt");
	protected readonly sortOrder = signal<"asc" | "desc">("desc");
	protected readonly sortOptions: BrowseSortOption[] = [
		{ value: "createdAt", label: "Recently added", defaultOrder: "desc" },
		{ value: "title", label: "Title", defaultOrder: "asc" },
		{ value: "releaseAt", label: "Release date", defaultOrder: "desc" },
		{ value: "score", label: "Rating", defaultOrder: "desc" },
		{ value: "duration", label: "Duration", defaultOrder: "asc" },
		{ value: "ratio", label: "Ratio", defaultOrder: "desc" },
		{ value: "popularity", label: "Popularity", defaultOrder: "desc" }
	];
	protected readonly filteredGames = signal<Game[]>([]);
	protected readonly filteredTotal = signal(0);
	protected readonly filteredOffset = signal(0);
	protected readonly filteredLimit = 50;
	protected readonly isLoadingFiltered = signal(false);
	protected readonly activeFiltersCount = computed(() => {
		let n = 0;
		if (this.selectedGenres().size > 0) n++;
		if (this.selectedPlatforms().size > 0) n++;
		if (this.yearFrom() !== null || this.yearTo() !== null) n++;
		if (this.minScore() !== null || this.maxScore() !== null) n++;
		if (this.minDuration() !== null || this.maxDuration() !== null) n++;
		if (this.isDlc() !== null) n++;
		return n;
	});
	protected readonly inSearchOrFilterMode = computed(
		() =>
			this.searchQuery().length >= 2 ||
			this.activeFiltersCount() > 0 ||
			this.sortBy() !== "createdAt" ||
			this.sortOrder() !== "desc"
	);

	private readonly filtersEffect = effect(() => {
		this.selectedGenres();
		this.selectedPlatforms();
		this.yearFrom();
		this.yearTo();
		this.minScore();
		this.maxScore();
		this.minDuration();
		this.maxDuration();
		this.isDlc();
		this.sortBy();
		this.sortOrder();
		if (this.isInitialLoad()) return;
		this.onFiltersChanged();
	});

	protected readonly featuredGames = computed(() =>
		this.latestGames()
			.filter(g => !!g.backgroundUrl)
			.slice(0, FEATURED_GAMES_LIMIT)
	);
	protected readonly viewMode = computed<"discover" | "search" | "filtered">(
		() => {
			if (this.activeFiltersCount() > 0 || this.isSortCustom())
				return "filtered";
			if (this.searchQuery().length >= 2) return "search";
			return "discover";
		}
	);
	protected readonly selectedGenreNames = computed(() =>
		this.allGenres().filter(genre => this.selectedGenres().has(genre.code))
	);
	protected readonly quickGenres = computed(() =>
		this.allGenres().slice(0, QUICK_GENRES_LIMIT)
	);
	protected readonly sortLabel = computed(
		() =>
			this.sortOptions.find(option => option.value === this.sortBy())
				?.label ?? ""
	);

	ngOnInit() {
		this.searchSubject
			.pipe(
				debounceTime(400),
				distinctUntilChanged(),
				switchMap(query => {
					if (query.length < 2) {
						this.isSearching.set(false);
						this.isSearchingOnline.set(false);
						return of([]);
					}
					this.isSearching.set(true);
					this.isSearchingOnline.set(false);
					return this.gamesService.searchLocal(query).pipe(
						switchMap(localResults => {
							if (localResults.length > 0) {
								return of(localResults);
							}
							this.isSearching.set(false);
							this.isSearchingOnline.set(true);
							return this.gamesService.search(query);
						})
					);
				})
			)
			.subscribe(games => {
				this.searchResults.set(games);
				this.isSearching.set(false);
				this.isSearchingOnline.set(false);
			});

		this.loadLatest();
		this.loadRandomGenre();
		this.loadLatestReviewed();
		this.loadOfficialLists();
		this.loadRecentLists();
		this.gamesService.getGenres().subscribe(g => this.allGenres.set(g));
		this.gamesService
			.getPlatforms()
			.subscribe(p => this.allPlatforms.set(p));
		this.applyFromUrl();
		this.syncGenresWithUrl();

		const q = this.route.snapshot.queryParamMap.get("q");
		if (q) {
			this.searchQuery.set(q);
			this.searchSubject.next(q);
		}
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (query.length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
		this.filteredOffset.set(0);
		this.persistToUrl();
		this.loadFiltered();
	}

	searchRawg() {
		const query = this.searchQuery().trim();
		if (query.length < 2) return;
		this.searchingRawg.set(true);
		this.gamesService.search(query, true).subscribe(games => {
			this.searchResults.set(games);
			this.searchingRawg.set(false);
		});
	}

	onGameCreated(game: Game) {
		this.showCreateEditor.set(false);
		this.router.navigate(["/games", game.code]);
	}

	private loadLatest() {
		this.gamesService
			.getGames({ limit: 16, sort_by: "createdAt", sort_order: "desc" })
			.subscribe({
				next: res => {
					this.latestGames.set(res.data.games);
					this.isInitialLoad.set(false);
				},
				error: () => this.isInitialLoad.set(false)
			});
	}

	private loadRandomGenre() {
		this.gamesService.getGenres().subscribe(genres => {
			if (genres.length === 0) return;
			this.tryGenre([...genres], 5);
		});
	}

	private tryGenre(pool: Genre[], attemptsLeft: number) {
		if (pool.length === 0 || attemptsLeft <= 0) return;
		const idx = Math.floor(Math.random() * pool.length);
		const candidate = pool[idx];
		pool.splice(idx, 1);

		this.gamesService
			.getGames({ limit: 16, genre: candidate.code, sort_by: "random" })
			.subscribe(res => {
				if (res.data.games.length > 0) {
					this.randomGenre.set(candidate);
					this.genreGames.set(res.data.games);
				} else {
					this.tryGenre(pool, attemptsLeft - 1);
				}
			});
	}

	private loadLatestReviewed() {
		this.gamesService
			.getLatestReviewed(16)
			.subscribe(games => this.latestReviewed.set(games));
	}

	private loadOfficialLists() {
		this.listsService
			.getOfficial(12)
			.subscribe(lists => this.officialLists.set(lists));
	}

	private loadRecentLists() {
		this.listsService
			.getRecent(12)
			.subscribe(lists => this.recentLists.set(lists));
	}

	toggleFilters() {
		this.showFilters.update(v => !v);
	}

	toggleQuickGenre(code: string) {
		const selected = this.selectedGenres();
		const isOnlySelection = selected.size === 1 && selected.has(code);
		this.selectedGenres.set(isOnlySelection ? new Set() : new Set([code]));
	}

	isQuickGenreActive(code: string): boolean {
		return this.selectedGenres().has(code);
	}

	showGenre(code: string) {
		this.selectedGenres.set(new Set([code]));
	}

	clearFilters() {
		this.selectedGenres.set(new Set());
		this.selectedPlatforms.set(new Set());
		this.yearFrom.set(null);
		this.yearTo.set(null);
		this.minScore.set(null);
		this.maxScore.set(null);
		this.minDuration.set(null);
		this.maxDuration.set(null);
		this.isDlc.set(null);
		this.sortBy.set("createdAt");
		this.sortOrder.set("desc");
	}

	setSortBy(value: string) {
		const option = this.sortOptions.find(o => o.value === value);
		this.sortBy.set(value);
		if (option) this.sortOrder.set(option.defaultOrder);
	}

	protected isSortCustom(): boolean {
		return this.sortBy() !== "createdAt" || this.sortOrder() !== "desc";
	}

	private onFiltersChanged() {
		this.filteredOffset.set(0);
		this.persistToUrl();
		this.loadFiltered();
	}

	onFilteredOffsetChange(offset: number) {
		this.filteredOffset.set(offset);
		this.loadFiltered();
	}

	private loadFiltered() {
		if (!this.inSearchOrFilterMode()) {
			this.filteredGames.set([]);
			this.filteredTotal.set(0);
			return;
		}
		this.isLoadingFiltered.set(true);
		const params = this.buildQuery();
		this.gamesService.getGames(params).subscribe({
			next: res => {
				this.filteredGames.set(res.data.games);
				this.filteredTotal.set(res.data.total);
				this.isLoadingFiltered.set(false);
			},
			error: () => this.isLoadingFiltered.set(false)
		});
	}

	private buildQuery() {
		const q: Record<string, string | number | boolean> = {
			limit: this.filteredLimit,
			offset: this.filteredOffset(),
			sort_by: this.sortBy(),
			sort_order: this.sortOrder()
		};
		const search = this.searchQuery().trim();
		if (search.length >= 2) q["search"] = search;
		const genres = Array.from(this.selectedGenres());
		if (genres.length > 0) q["genres"] = genres.join(",");
		const platforms = Array.from(this.selectedPlatforms());
		if (platforms.length > 0) q["platforms"] = platforms.join(",");
		if (this.yearFrom() !== null) q["release_year_from"] = this.yearFrom()!;
		if (this.yearTo() !== null) q["release_year_to"] = this.yearTo()!;
		if (this.minScore() !== null) q["min_score"] = this.minScore()!;
		if (this.maxScore() !== null) q["max_score"] = this.maxScore()!;
		if (this.minDuration() !== null)
			q["min_duration"] = this.minDuration()!;
		if (this.maxDuration() !== null)
			q["max_duration"] = this.maxDuration()!;
		if (this.isDlc() !== null) q["is_dlc"] = this.isDlc()!;
		return q;
	}

	private persistToUrl() {
		const params: Record<string, string | null> = {};
		const search = this.searchQuery().trim();
		params["q"] = search.length >= 2 ? search : null;
		const genres = Array.from(this.selectedGenres());
		params["genres"] = genres.length > 0 ? genres.join(",") : null;
		const platforms = Array.from(this.selectedPlatforms());
		params["platforms"] = platforms.length > 0 ? platforms.join(",") : null;
		params["year_from"] =
			this.yearFrom() !== null ? String(this.yearFrom()) : null;
		params["year_to"] =
			this.yearTo() !== null ? String(this.yearTo()) : null;
		params["min_score"] =
			this.minScore() !== null ? String(this.minScore()) : null;
		params["max_score"] =
			this.maxScore() !== null ? String(this.maxScore()) : null;
		params["min_duration"] =
			this.minDuration() !== null ? String(this.minDuration()) : null;
		params["max_duration"] =
			this.maxDuration() !== null ? String(this.maxDuration()) : null;
		params["is_dlc"] = this.isDlc() !== null ? String(this.isDlc()) : null;
		params["sort_by"] =
			this.sortBy() !== "createdAt" ? this.sortBy() : null;
		params["sort_order"] =
			this.sortOrder() !== "desc" ? this.sortOrder() : null;
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: params,
			queryParamsHandling: "merge",
			replaceUrl: true
		});
	}

	private syncGenresWithUrl() {
		this.route.queryParamMap
			.pipe(
				map(params => params.get("genres") ?? ""),
				distinctUntilChanged(),
				skip(1),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(genresCsv => {
				const fromUrl = genresCsv.split(",").filter(Boolean);
				const current = this.selectedGenres();
				const unchanged =
					fromUrl.length === current.size &&
					fromUrl.every(code => current.has(code));
				if (!unchanged) this.selectedGenres.set(new Set(fromUrl));
			});
	}

	private applyFromUrl() {
		const p = this.route.snapshot.queryParamMap;
		const csv = (key: string) => {
			const v = p.get(key);
			return v
				? new Set(v.split(",").filter(Boolean))
				: new Set<string>();
		};
		this.selectedGenres.set(csv("genres"));
		this.selectedPlatforms.set(csv("platforms"));
		this.yearFrom.set(
			p.get("year_from") ? Number(p.get("year_from")) : null
		);
		this.yearTo.set(p.get("year_to") ? Number(p.get("year_to")) : null);
		this.minScore.set(
			p.get("min_score") ? Number(p.get("min_score")) : null
		);
		this.maxScore.set(
			p.get("max_score") ? Number(p.get("max_score")) : null
		);
		this.minDuration.set(
			p.get("min_duration") ? Number(p.get("min_duration")) : null
		);
		this.maxDuration.set(
			p.get("max_duration") ? Number(p.get("max_duration")) : null
		);
		const dlc = p.get("is_dlc");
		this.isDlc.set(dlc === "true" ? true : dlc === "false" ? false : null);
		const sortBy = p.get("sort_by");
		if (sortBy && this.sortOptions.some(o => o.value === sortBy)) {
			this.sortBy.set(sortBy);
		}
		const sortOrder = p.get("sort_order");
		if (sortOrder === "asc" || sortOrder === "desc") {
			this.sortOrder.set(sortOrder);
		}
		const genreFilterCount = this.selectedGenres().size > 0 ? 1 : 0;
		if (this.activeFiltersCount() > genreFilterCount)
			this.showFilters.set(true);
		if (this.inSearchOrFilterMode()) this.loadFiltered();
	}
}
