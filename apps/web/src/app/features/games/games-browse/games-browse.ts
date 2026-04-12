import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { Game, Genre } from "../../../core/models";
import { GamesService } from "../games.service";
import { AuthService } from "../../../core/services/auth.service";
import { AdminGameEditor } from "../admin-game-editor/admin-game-editor";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	of
} from "rxjs";

@Component({
	selector: "app-games-browse",
	imports: [RouterLink, AdminGameEditor],
	templateUrl: "./games-browse.html",
	styleUrl: "./games-browse.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesBrowse implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly searchSubject = new Subject<string>();

	protected readonly isAdmin = computed(
		() => this.authService.user()?.role === "admin"
	);
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<Game[]>([]);
	protected readonly isSearching = signal(false);
	protected readonly showCreateEditor = signal(false);
	protected readonly searchingRawg = signal(false);

	protected readonly latestGames = signal<Game[]>([]);
	protected readonly topRated = signal<Game[]>([]);
	protected readonly randomGenre = signal<Genre | null>(null);
	protected readonly genreGames = signal<Game[]>([]);

	ngOnInit() {
		this.searchSubject
			.pipe(
				debounceTime(400),
				distinctUntilChanged(),
				switchMap(query => {
					if (query.length < 2) {
						this.isSearching.set(false);
						return of([]);
					}
					this.isSearching.set(true);
					return this.gamesService.search(query);
				})
			)
			.subscribe(games => {
				this.searchResults.set(games);
				this.isSearching.set(false);
			});

		this.loadLatest();
		this.loadTopRated();
		this.loadRandomGenre();
	}

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
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

	private loadLatest() {
		this.gamesService
			.getGames({ limit: 10, sort_by: "createdAt", sort_order: "desc" })
			.subscribe(res => this.latestGames.set(res.data.games));
	}

	private loadTopRated() {
		this.gamesService
			.getGames({ limit: 10, sort_by: "title", sort_order: "asc" })
			.subscribe(res => this.topRated.set(res.data.games));
	}

	private loadRandomGenre() {
		this.gamesService.getGenres().subscribe(genres => {
			if (genres.length === 0) return;
			const random = genres[Math.floor(Math.random() * genres.length)];
			this.randomGenre.set(random);
			this.gamesService
				.getGames({ limit: 10, genre: random.code })
				.subscribe(res => this.genreGames.set(res.data.games));
		});
	}
}
