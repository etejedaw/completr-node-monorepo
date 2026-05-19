import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	OnInit,
	output,
	signal
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Game, Genre, Platform } from "../../../core/models";
import {
	CreateGameDto,
	GamesService,
	RawgDetail,
	UpdateGameDto
} from "../games.service";
import { forkJoin } from "rxjs";
import { ToastService } from "../../../core/services/toast.service";

@Component({
	selector: "app-admin-game-editor",
	imports: [FormsModule],
	templateUrl: "./admin-game-editor.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGameEditor implements OnInit {
	game = input<Game | null>(null);
	saved = output<void>();
	created = output<Game>();

	protected readonly isEditMode = computed(() => !!this.game());

	private readonly gamesService = inject(GamesService);
	private readonly toast = inject(ToastService);

	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly allGenres = signal<Genre[]>([]);

	// RAWG
	protected readonly rawgSlug = signal("");
	protected readonly fetchingRawg = signal(false);
	protected readonly rawgError = signal("");
	protected readonly rawgId = signal<number | null>(null);

	// Form
	protected readonly title = signal("");
	protected readonly description = signal("");
	protected readonly releaseAt = signal("");
	protected readonly backgroundUrl = signal("");
	protected readonly isDlc = signal(false);
	protected readonly parentSlug = signal("");
	protected readonly parentGame = signal<Game | null>(null);
	protected readonly fetchingParent = signal(false);
	protected readonly parentError = signal("");
	protected readonly selectedPlatforms = signal<Set<string>>(new Set());
	protected readonly selectedGenres = signal<Set<string>>(new Set());
	protected readonly scores = signal<{ source: string; score: number }[]>([]);
	protected readonly times = signal<{ source: string; duration: number }[]>(
		[]
	);

	// State
	protected readonly saving = signal(false);
	protected readonly saveError = signal("");

	// Score/time add
	protected readonly newScoreSource = signal("");
	protected readonly newScoreValue = signal<number | null>(null);
	protected readonly newTimeSource = signal("");
	protected readonly newTimeValue = signal<number | null>(null);

	protected readonly scoreSources = ["metacritic", "opencritic", "rawg"];
	protected readonly timeSources = ["hltb", "rawg"];

	ngOnInit() {
		this.loadSelects();
		const g = this.game();
		if (g) this.populateFromGame(g);
	}

	private loadSelects() {
		forkJoin([
			this.gamesService.getPlatforms(),
			this.gamesService.getGenres()
		]).subscribe(([platforms, genres]) => {
			this.allPlatforms.set(platforms);
			this.allGenres.set(genres);
		});
	}

	private populateFromGame(g: Game) {
		this.title.set(g.title);
		this.description.set(g.description ?? "");
		this.releaseAt.set(g.releaseAt ?? "");
		this.backgroundUrl.set(g.backgroundUrl ?? "");
		this.isDlc.set(g.isDlc);
		this.selectedPlatforms.set(new Set(g.platforms.map(p => p.code)));
		this.selectedGenres.set(new Set(g.genres.map(ge => ge.code)));
		this.scores.set(g.scores.map(s => ({ ...s })));
		this.times.set(g.times.map(t => ({ ...t })));
	}

	fetchParentGame() {
		const slug = this.parentSlug().trim();
		if (!slug) return;

		this.fetchingParent.set(true);
		this.parentError.set("");

		this.gamesService.getByCode(slug).subscribe({
			next: game => {
				this.parentGame.set(game);
				this.fetchingParent.set(false);
			},
			error: () => {
				this.parentError.set("Game not found");
				this.fetchingParent.set(false);
			}
		});
	}

	clearParentGame() {
		this.parentGame.set(null);
		this.parentSlug.set("");
		this.parentError.set("");
	}

	fetchRawg() {
		const slug = this.rawgSlug().trim();
		if (!slug) return;

		this.fetchingRawg.set(true);
		this.rawgError.set("");

		this.gamesService.rawgBySlug(slug).subscribe({
			next: detail => this.applyRawgData(detail),
			error: () => {
				this.rawgError.set("Game not found on RAWG");
				this.fetchingRawg.set(false);
			}
		});
	}

	private applyRawgData(detail: RawgDetail) {
		this.rawgId.set(detail.rawgId);
		this.title.set(detail.title);
		this.description.set(detail.description ?? "");
		this.releaseAt.set(detail.releaseAt ?? "");
		this.backgroundUrl.set(detail.coverUrl ?? "");

		if (detail.platforms.length > 0) {
			this.selectedPlatforms.set(new Set(detail.platforms));
		}
		if (detail.genres.length > 0) {
			this.selectedGenres.set(new Set(detail.genres));
		}

		this.mergeScores(detail.scores);
		this.mergeTimes(detail.times);

		this.fetchingRawg.set(false);
	}

	private mergeScores(rawgScores: { source: string; score: number }[]) {
		const current = this.scores();
		const merged = [...current];
		for (const rs of rawgScores) {
			const idx = merged.findIndex(s => s.source === rs.source);
			if (idx >= 0) {
				merged[idx] = { ...rs };
			} else {
				merged.push({ ...rs });
			}
		}
		this.scores.set(merged);
	}

	private mergeTimes(rawgTimes: { source: string; duration: number }[]) {
		const current = this.times();
		const merged = [...current];
		for (const rt of rawgTimes) {
			const idx = merged.findIndex(t => t.source === rt.source);
			if (idx >= 0) {
				merged[idx] = { ...rt };
			} else {
				merged.push({ ...rt });
			}
		}
		this.times.set(merged);
	}

	togglePlatform(code: string) {
		const current = this.selectedPlatforms();
		const next = new Set(current);
		if (next.has(code)) {
			next.delete(code);
		} else {
			next.add(code);
		}
		this.selectedPlatforms.set(next);
	}

	toggleGenre(code: string) {
		const current = this.selectedGenres();
		const next = new Set(current);
		if (next.has(code)) {
			next.delete(code);
		} else {
			next.add(code);
		}
		this.selectedGenres.set(next);
	}

	removeScore(index: number) {
		const current = [...this.scores()];
		current.splice(index, 1);
		this.scores.set(current);
	}

	addScore() {
		const source = this.newScoreSource();
		const score = this.newScoreValue();
		if (!source || score === null) return;
		const current = [...this.scores()];
		const idx = current.findIndex(s => s.source === source);
		if (idx >= 0) {
			current[idx] = { source, score };
		} else {
			current.push({ source, score });
		}
		this.scores.set(current);
		this.newScoreSource.set("");
		this.newScoreValue.set(null);
	}

	removeTime(index: number) {
		const current = [...this.times()];
		current.splice(index, 1);
		this.times.set(current);
	}

	addTime() {
		const source = this.newTimeSource();
		const duration = this.newTimeValue();
		if (!source || duration === null) return;
		const current = [...this.times()];
		const idx = current.findIndex(t => t.source === source);
		if (idx >= 0) {
			current[idx] = { source, duration };
		} else {
			current.push({ source, duration });
		}
		this.times.set(current);
		this.newTimeSource.set("");
		this.newTimeValue.set(null);
	}

	updateScoreValue(index: number, value: number) {
		const current = [...this.scores()];
		current[index] = { ...current[index], score: value };
		this.scores.set(current);
	}

	updateTimeValue(index: number, value: number) {
		const current = [...this.times()];
		current[index] = { ...current[index], duration: value };
		this.times.set(current);
	}

	save() {
		this.saving.set(true);
		this.saveError.set("");

		if (this.isEditMode()) {
			this.doUpdate();
		} else {
			this.doCreate();
		}
	}

	private doCreate() {
		const dto: CreateGameDto = {
			title: this.title(),
			description: this.description() || undefined,
			releaseAt: this.releaseAt() || undefined,
			backgroundUrl: this.backgroundUrl() || undefined,
			isDlc: this.isDlc(),
			platforms: [...this.selectedPlatforms()],
			genres: [...this.selectedGenres()],
			scores: this.scores(),
			times: this.times()
		};

		const parent = this.parentGame();
		if (this.isDlc() && parent) {
			dto.parentGameId = parent.id;
		}

		if (this.rawgId()) {
			dto.externalIds = [
				{ source: "rawg", externalId: String(this.rawgId()) }
			];
		}

		this.gamesService.createGame(dto).subscribe({
			next: game => {
				this.saving.set(false);
				this.created.emit(game);
			},
			error: err => {
				this.saving.set(false);
				if (err.status === 429) {
					this.saveError.set(
						"Rate limit reached. Game was NOT created. Try again in a moment."
					);
				} else {
					this.saveError.set("Failed to create game.");
				}
			}
		});
	}

	private doUpdate() {
		const g = this.game()!;
		const dto: UpdateGameDto = {
			title: this.title(),
			description: this.description() || undefined,
			releaseAt: this.releaseAt() || undefined,
			backgroundUrl: this.backgroundUrl() || undefined,
			isDlc: this.isDlc(),
			platforms: [...this.selectedPlatforms()],
			genres: [...this.selectedGenres()]
		};

		const parent = this.parentGame();
		if (this.isDlc() && parent) {
			dto.parentGameId = parent.id;
		}

		if (this.rawgId()) {
			dto.externalIds = [
				{ source: "rawg", externalId: String(this.rawgId()) }
			];
		}

		this.gamesService.updateGame(g.id, dto).subscribe({
			next: () => this.saveScoresAndTimes(g.id),
			error: err => {
				this.saving.set(false);
				if (err.status === 429) {
					this.saveError.set(
						"Rate limit reached. Changes were NOT saved. Try again in a moment."
					);
				} else {
					this.saveError.set("Failed to update game.");
				}
			}
		});
	}

	private saveScoresAndTimes(gameId: string) {
		const g = this.game()!;
		const existingScores = new Set(g.scores.map(s => s.source));
		const existingTimes = new Set(g.times.map(t => t.source));
		const currentScoreSources = new Set(this.scores().map(s => s.source));
		const currentTimeSources = new Set(this.times().map(t => t.source));

		const scoreOps = this.scores().map(s => {
			if (existingScores.has(s.source)) {
				return this.gamesService.updateScore(gameId, s.source, s.score);
			}
			return this.gamesService.createScore(gameId, s.source, s.score);
		});

		const timeOps = this.times().map(t => {
			if (existingTimes.has(t.source)) {
				return this.gamesService.updateTime(
					gameId,
					t.source,
					t.duration
				);
			}
			return this.gamesService.createTime(gameId, t.source, t.duration);
		});

		const scoreDeleteOps = [...existingScores]
			.filter(source => !currentScoreSources.has(source))
			.map(source => this.gamesService.deleteScore(gameId, source));

		const timeDeleteOps = [...existingTimes]
			.filter(source => !currentTimeSources.has(source))
			.map(source => this.gamesService.deleteTime(gameId, source));

		const allOps = [
			...scoreOps,
			...timeOps,
			...scoreDeleteOps,
			...timeDeleteOps
		];

		if (allOps.length === 0) {
			this.saving.set(false);
			this.saved.emit();
			return;
		}

		forkJoin(allOps).subscribe({
			next: () => {
				this.saving.set(false);
				this.toast.success("Game saved.");
				this.saved.emit();
			},
			error: err => {
				this.saving.set(false);
				if (err.status === 429) {
					this.saveError.set(
						"Game info saved but scores/times hit the rate limit. Reopen the editor and try those again."
					);
				} else {
					this.saveError.set(
						"Game updated but some scores/times failed to save."
					);
				}
			}
		});
	}

	protected get availableScoreSources() {
		const used = new Set(this.scores().map(s => s.source));
		return this.scoreSources.filter(s => !used.has(s));
	}

	protected get availableTimeSources() {
		const used = new Set(this.times().map(t => t.source));
		return this.timeSources.filter(s => !used.has(s));
	}
}
