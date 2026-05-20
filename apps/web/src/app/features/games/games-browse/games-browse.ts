import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	OnDestroy,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Game, Genre, List } from "../../../core/models";
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
import { UiButton, UiSearchBar } from "../../../shared/ui";

@Component({
	selector: "app-games-browse",
	imports: [RouterLink, AdminGameEditor, UiButton, UiSearchBar],
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
	protected readonly topRated = signal<Game[]>([]);
	protected readonly randomGenre = signal<Genre | null>(null);
	protected readonly genreGames = signal<Game[]>([]);
	protected readonly latestReviewed = signal<Game[]>([]);
	protected readonly officialLists = signal<List[]>([]);
	protected readonly recentLists = signal<List[]>([]);
	protected readonly isInitialLoad = signal(true);

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
		this.loadTopRated();
		this.loadRandomGenre();
		this.loadLatestReviewed();
		this.loadOfficialLists();
		this.loadRecentLists();

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

	private loadTopRated() {
		this.gamesService
			.getGames({ limit: 16, sort_by: "title", sort_order: "asc" })
			.subscribe(res => this.topRated.set(res.data.games));
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
			.getGames({ limit: 16, genre: candidate.code })
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
}
