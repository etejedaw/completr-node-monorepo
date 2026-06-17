import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	OnInit,
	OnDestroy,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { Game, Genre, List, Platform } from "../../../core/models";
import { GamesService } from "../games.service";
import { ListsService } from "../../lists/lists.service";
import { AuthService } from "../../../core/services/auth.service";
import { AdminGameEditor } from "../admin-game-editor/admin-game-editor";
import {
	Subject,
	Subscription,
	debounceTime,
	distinctUntilChanged,
	interval,
	switchMap,
	of
} from "rxjs";
import { UiButton, UiPagination, UiSearchBar } from "../../../shared/ui";
import { GameFilterPanel } from "../../../shared/components/game-filter-panel/game-filter-panel";

@Component({
	selector: "app-games-browse",
	imports: [
		RouterLink,
		FormsModule,
		AdminGameEditor,
		UiButton,
		UiPagination,
		UiSearchBar,
		GameFilterPanel
	],
	templateUrl: "./games-browse.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesBrowse implements OnInit, OnDestroy {
	private readonly gamesService = inject(GamesService);
	private readonly listsService = inject(ListsService);
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly searchSubject = new Subject<string>();
	private rotateSub?: Subscription;

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
		() => this.searchQuery().length >= 2 || this.activeFiltersCount() > 0
	);

	private readonly filterPanelEffect = effect(() => {
		this.selectedGenres();
		this.selectedPlatforms();
		this.yearFrom();
		this.yearTo();
		if (this.isInitialLoad()) return;
		this.onFiltersChanged();
	});

	protected readonly featuredIndex = signal(0);
	protected readonly featuredGames = computed(() =>
		this.latestGames()
			.filter(g => !!g.backgroundUrl)
			.slice(0, 5)
	);
	protected readonly featured = computed(() => {
		const games = this.featuredGames();
		if (games.length === 0) return null;
		return games[this.featuredIndex() % games.length];
	});

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
		this.gamesService.getPlatforms().subscribe(p => this.allPlatforms.set(p));
		this.applyFromUrl();

		this.rotateSub = interval(7000).subscribe(() => {
			const total = this.featuredGames().length;
			if (total > 1 && this.searchQuery().length < 2) {
				this.featuredIndex.update(i => (i + 1) % total);
			}
		});

		const q = this.route.snapshot.queryParamMap.get("q");
		if (q) {
			this.searchQuery.set(q);
			this.searchSubject.next(q);
		}
	}

	ngOnDestroy() {
		this.rotateSub?.unsubscribe();
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

	setFeatured(index: number) {
		this.featuredIndex.set(index);
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

	setMinScore(value: string) {
		this.minScore.set(value ? Number(value) : null);
		this.onFiltersChanged();
	}
	setMaxScore(value: string) {
		this.maxScore.set(value ? Number(value) : null);
		this.onFiltersChanged();
	}
	setMinDuration(value: string) {
		this.minDuration.set(value ? Number(value) : null);
		this.onFiltersChanged();
	}
	setMaxDuration(value: string) {
		this.maxDuration.set(value ? Number(value) : null);
		this.onFiltersChanged();
	}
	toggleIsDlc(value: boolean | null) {
		this.isDlc.set(value);
		this.onFiltersChanged();
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
		this.filteredOffset.set(0);
		this.persistToUrl();
		this.loadFiltered();
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
			offset: this.filteredOffset()
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
		if (this.minDuration() !== null) q["min_duration"] = this.minDuration()!;
		if (this.maxDuration() !== null) q["max_duration"] = this.maxDuration()!;
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
		params["year_from"] = this.yearFrom() !== null ? String(this.yearFrom()) : null;
		params["year_to"] = this.yearTo() !== null ? String(this.yearTo()) : null;
		params["min_score"] = this.minScore() !== null ? String(this.minScore()) : null;
		params["max_score"] = this.maxScore() !== null ? String(this.maxScore()) : null;
		params["min_duration"] = this.minDuration() !== null ? String(this.minDuration()) : null;
		params["max_duration"] = this.maxDuration() !== null ? String(this.maxDuration()) : null;
		params["is_dlc"] = this.isDlc() !== null ? String(this.isDlc()) : null;
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: params,
			queryParamsHandling: "merge",
			replaceUrl: true
		});
	}

	private applyFromUrl() {
		const p = this.route.snapshot.queryParamMap;
		const csv = (key: string) => {
			const v = p.get(key);
			return v ? new Set(v.split(",").filter(Boolean)) : new Set<string>();
		};
		this.selectedGenres.set(csv("genres"));
		this.selectedPlatforms.set(csv("platforms"));
		this.yearFrom.set(p.get("year_from") ? Number(p.get("year_from")) : null);
		this.yearTo.set(p.get("year_to") ? Number(p.get("year_to")) : null);
		this.minScore.set(p.get("min_score") ? Number(p.get("min_score")) : null);
		this.maxScore.set(p.get("max_score") ? Number(p.get("max_score")) : null);
		this.minDuration.set(
			p.get("min_duration") ? Number(p.get("min_duration")) : null
		);
		this.maxDuration.set(
			p.get("max_duration") ? Number(p.get("max_duration")) : null
		);
		const dlc = p.get("is_dlc");
		this.isDlc.set(dlc === "true" ? true : dlc === "false" ? false : null);
		if (this.activeFiltersCount() > 0) this.showFilters.set(true);
		if (this.inSearchOrFilterMode()) this.loadFiltered();
	}
}
