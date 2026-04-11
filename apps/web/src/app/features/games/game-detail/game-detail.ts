import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Game } from "../../../core/models";
import { GamesService } from "../games.service";
import { ScoreSourcesService } from "../../../core/services/score-sources.service";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { getRatingLabel } from "../../../shared/constants/rating-labels";

@Component({
	selector: "app-game-detail",
	imports: [RouterLink, StarRating],
	templateUrl: "./game-detail.html",
	styleUrl: "./game-detail.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameDetail implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly gamesService = inject(GamesService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);

	protected readonly game = signal<Game | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly similarGames = signal<Game[]>([]);

	ngOnInit() {
		this.scoreSourcesService.load();
		this.route.paramMap.subscribe(params => {
			const code = params.get("code");
			if (code) this.loadGame(code);
		});
	}

	private loadGame(code: string) {
		this.isLoading.set(true);
		this.game.set(null);
		this.similarGames.set([]);
		this.gamesService.getByCode(code).subscribe({
			next: game => {
				this.game.set(game);
				this.isLoading.set(false);
				this.loadSimilarGames(game);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private loadSimilarGames(game: Game) {
		const genre = game.genres?.[0];
		if (!genre) return;
		this.gamesService
			.getGames({ limit: 10, genre: genre.code })
			.subscribe(res => {
				const filtered = res.data.games.filter(g => g.id !== game.id);
				this.similarGames.set(filtered.slice(0, 8));
			});
	}

	protected getScaleLabel(source: string): string {
		const scale = this.scoreSourcesService.getScale(source);
		return scale ? `/ ${scale}` : "";
	}

	protected get completrScore(): number | null {
		const score = this.game()?.scores?.find(s => s.source === "completr");
		return score?.score ?? null;
	}

	protected get completrLabel(): string {
		return getRatingLabel(this.completrScore);
	}

	protected get completrTime(): number | null {
		const time = this.game()?.times?.find(t => t.source === "completr");
		return time?.duration ?? null;
	}

	protected otherScores() {
		return this.game()?.scores?.filter(s => s.source !== "completr") ?? [];
	}

	protected otherTimes() {
		return this.game()?.times?.filter(t => t.source !== "completr") ?? [];
	}
}
