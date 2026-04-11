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
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { BacklogEntry } from "../../../core/models";
import { Game, Platform } from "../../../core/models";
import {
	BacklogService,
	CreateBacklogDto,
	UpdateBacklogDto
} from "../backlog.service";
import { GamesService } from "../../games/games.service";
import { ScoreSourcesService } from "../../../core/services/score-sources.service";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	of
} from "rxjs";

@Component({
	selector: "app-backlog-modal",
	imports: [ReactiveFormsModule, StarRating],
	templateUrl: "./backlog-modal.html",
	styleUrl: "./backlog-modal.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogModal implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly backlogService = inject(BacklogService);
	private readonly gamesService = inject(GamesService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);

	entry = input<BacklogEntry | null>(null);
	closed = output<void>();
	saved = output<void>();

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly platforms = signal<Platform[]>([]);
	protected readonly gameResults = signal<Game[]>([]);
	protected readonly selectedGame = signal<Game | null>(null);
	protected readonly searchQuery = signal("");
	protected readonly gamePlatforms = computed(
		() => this.selectedGame()?.platforms ?? []
	);
	protected readonly showConfirmDelete = signal(false);
	protected readonly isSearching = signal(false);
	protected readonly activeScoreSource = signal("");
	protected readonly activeDurationSource = signal("");
	protected readonly gameScores = computed(
		() => this.selectedGame()?.scores ?? []
	);
	protected readonly gameTimes = computed(
		() => this.selectedGame()?.times ?? []
	);

	private readonly searchSubject = new Subject<string>();

	protected readonly isEdit = signal(false);

	form = this.fb.group({
		gameId: ["", Validators.required],
		platformId: ["", Validators.required],
		score: [
			null as number | null,
			[Validators.required, Validators.min(0.01)]
		],
		duration: [
			null as number | null,
			[Validators.required, Validators.min(0.01)]
		],
		status: ["not_started"],
		startedAt: [null as string | null],
		finishedAt: [null as string | null],
		realDuration: [null as number | null],
		userRating: [null as number | null],
		notes: [""]
	});

	ngOnInit() {
		this.gamesService.getPlatforms().subscribe(p => this.platforms.set(p));
		this.scoreSourcesService.load();

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
				this.gameResults.set(games);
				this.isSearching.set(false);
			});

		const e = this.entry();
		if (e) {
			this.isEdit.set(true);
			this.selectedGame.set({
				id: e.game.id,
				title: e.game.title,
				backgroundUrl: e.game.backgroundUrl
			} as Game);
			this.form.patchValue({
				gameId: e.game.id,
				platformId: e.platform.id,
				score: e.score ?? null,
				duration: e.duration ?? null,
				status: e.status,
				startedAt: e.startedAt ? e.startedAt.split("T")[0] : null,
				finishedAt: e.finishedAt ? e.finishedAt.split("T")[0] : null,
				realDuration: e.realDuration ?? null,
				userRating: e.userRating ?? null,
				notes: e.notes ?? ""
			});
		}
	}

	protected readonly isForceSearching = signal(false);

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		if (query.length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	forceSearch() {
		const query = this.searchQuery();
		if (query.length < 2) return;
		this.isForceSearching.set(true);
		this.gamesService.search(query, true).subscribe({
			next: games => {
				this.gameResults.set(games);
				this.isForceSearching.set(false);
			},
			error: () => this.isForceSearching.set(false)
		});
	}

	selectGame(game: Game) {
		this.selectedGame.set(game);

		const score = this.pickScore(game);
		const duration = this.pickDuration(game);
		this.activeScoreSource.set(score.source);
		this.activeDurationSource.set(duration.source);

		this.form.patchValue({
			gameId: game.id,
			platformId: "",
			score: score.value,
			duration: duration.value
		});
		this.gameResults.set([]);
		this.searchQuery.set("");
	}

	applyScore(source: string, score: number) {
		this.activeScoreSource.set(source);
		this.form.patchValue({ score });
	}

	applyDuration(source: string, duration: number) {
		this.activeDurationSource.set(source);
		this.form.patchValue({ duration });
	}

	onScoreManualChange() {
		this.activeScoreSource.set("");
	}

	onDurationManualChange() {
		this.activeDurationSource.set("");
	}

	normalizeScore() {
		const score = this.form.getRawValue().score;
		const source = this.activeScoreSource();
		if (!score || !source) return;
		const normalized = this.scoreSourcesService.normalize(score, source);
		this.form.patchValue({ score: normalized });
		this.activeScoreSource.set("");
	}

	canNormalize(): boolean {
		const source = this.activeScoreSource();
		const scale = this.scoreSourcesService.getScale(source);
		return !!scale && scale !== 5;
	}

	getScaleLabel(source: string): string {
		const scale = this.scoreSourcesService.getScale(source);
		return scale ? `/${scale}` : "";
	}

	private pickScore(game: Game): { value: number | null; source: string } {
		const priority = ["metacritic", "opencritic", "rawg", "completr"];
		for (const source of priority) {
			const found = game.scores?.find(s => s.source === source);
			if (found) return { value: found.score, source };
		}
		return { value: null, source: "" };
	}

	private pickDuration(game: Game): { value: number | null; source: string } {
		const priority = ["hltb", "rawg", "completr"];
		for (const source of priority) {
			const found = game.times?.find(t => t.source === source);
			if (found) return { value: found.duration, source };
		}
		return { value: null, source: "" };
	}

	clearGame() {
		this.selectedGame.set(null);
		this.form.patchValue({ gameId: "" });
	}

	onSubmit() {
		if (this.form.invalid) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form.getRawValue();

		if (this.isEdit()) {
			const dto: UpdateBacklogDto = {
				status: val.status ?? undefined,
				score: val.score ?? undefined,
				duration: val.duration ?? undefined,
				startedAt: val.startedAt || null,
				finishedAt: val.finishedAt || null,
				realDuration: val.realDuration ?? null,
				userRating: val.userRating ?? null,
				notes: val.notes || null
			};
			this.backlogService.update(this.entry()!.id, dto).subscribe({
				next: () => this.saved.emit(),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Update failed");
				}
			});
		} else {
			const dto: CreateBacklogDto = {
				gameId: val.gameId!,
				platformId: val.platformId!,
				score: val.score!,
				duration: val.duration!,
				status: val.status ?? undefined,
				startedAt: val.startedAt || undefined,
				finishedAt: val.finishedAt || undefined,
				realDuration: val.realDuration ?? undefined,
				userRating: val.userRating ?? undefined,
				notes: val.notes || undefined
			};
			this.backlogService.create(dto).subscribe({
				next: () => this.saved.emit(),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Creation failed");
				}
			});
		}
	}

	onDelete() {
		this.isLoading.set(true);
		this.backlogService.delete(this.entry()!.id).subscribe({
			next: () => this.saved.emit(),
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Delete failed");
			}
		});
	}

	onClose() {
		this.closed.emit();
	}
}
