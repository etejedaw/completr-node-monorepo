import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Game, Genre } from "../../../core/models";
import { GamesService } from "../games.service";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { UiButton } from "../../../shared/ui";
import { pickCanonicalScore } from "../../../shared/utils/canonical-score";

const PAGE_SIZE = 50;

@Component({
	selector: "app-genre-detail",
	imports: [RouterLink, GameCoverCard, UiButton],
	templateUrl: "./genre-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenreDetail implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly gamesService = inject(GamesService);

	protected readonly genre = signal<Genre | null>(null);
	protected readonly games = signal<Game[]>([]);
	protected readonly hasMore = signal(false);
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly isLoading = signal(true);
	protected readonly isLoadingMore = signal(false);
	protected readonly notFound = signal(false);
	private currentCode = "";

	ngOnInit() {
		this.route.paramMap.subscribe(params => {
			const code = params.get("code");
			if (code) {
				this.currentCode = code;
				this.offset.set(0);
				this.games.set([]);
				this.loadFirstPage();
			}
		});
	}

	loadMore() {
		if (!this.hasMore() || this.isLoadingMore()) return;
		this.isLoadingMore.set(true);
		const newOffset = this.offset() + this.limit;
		this.gamesService
			.getGenreGames(this.currentCode, {
				limit: this.limit,
				offset: newOffset
			})
			.subscribe({
				next: data => {
					this.games.update(prev => [...prev, ...data.games]);
					this.hasMore.set(data.hasMore);
					this.offset.set(newOffset);
					this.isLoadingMore.set(false);
				},
				error: () => this.isLoadingMore.set(false)
			});
	}

	gameRatio(game: Game): number | null {
		return pickCanonicalScore(game).ratio;
	}

	gameDuration(game: Game): number | null {
		return pickCanonicalScore(game).duration;
	}

	private loadFirstPage() {
		this.isLoading.set(true);
		this.notFound.set(false);
		this.gamesService
			.getGenreGames(this.currentCode, { limit: this.limit, offset: 0 })
			.subscribe({
				next: data => {
					this.genre.set(data.genre);
					this.games.set(data.games);
					this.hasMore.set(data.hasMore);
					this.isLoading.set(false);
				},
				error: err => {
					if (err.status === 404) this.notFound.set(true);
					this.isLoading.set(false);
				}
			});
	}
}
