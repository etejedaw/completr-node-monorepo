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
import { toSignal } from "@angular/core/rxjs-interop";
import { BacklogEntry } from "../../../core/models";
import { Game, Platform } from "../../../core/models";
import {
	BacklogService,
	CreateBacklogDto,
	UpdateBacklogDto
} from "../backlog.service";
import { GamesService } from "../../games/games.service";
import { WishlistService } from "../../wishlist/wishlist.service";
import { GameShelfService } from "../../game-shelf/game-shelf.service";
import { ScoreSourcesService } from "../../../core/services/score-sources.service";
import { ReviewsService } from "../../games/reviews.service";
import { ToastService } from "../../../core/services/toast.service";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	forkJoin,
	of
} from "rxjs";
import { UiButton, UiIconButton } from "../../../shared/ui";

@Component({
	selector: "app-backlog-modal",
	imports: [ReactiveFormsModule, StarRating, UiButton, UiIconButton],
	templateUrl: "./backlog-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogModal implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly backlogService = inject(BacklogService);
	private readonly gamesService = inject(GamesService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly wishlistService = inject(WishlistService);
	private readonly gameShelfService = inject(GameShelfService);
	private readonly reviewsService = inject(ReviewsService);
	private readonly toast = inject(ToastService);
	private readonly http = inject(HttpClient);

	protected readonly reportFeedback = signal("");
	protected readonly openTooltip = signal<string | null>(null);

	private static readonly TOOLTIP_TEXTS: Record<string, string> = {
		ratio: "Ratio = Critic Score ÷ Duration. Higher means short and well-rated — useful to prioritize what to play next.",
		score: "Average score from critics (Metacritic, OpenCritic, RAWG). Normalized to a 0–5 scale in Completr.",
		duration: "Estimated playtime from HowLongToBeat or RAWG. Not your real playtime — that goes in Real Duration below.",
		rating: "Your personal rating (0.5–5 stars). Independent of critic score.",
		realDuration: "Hours you actually spent. Used to calculate your Personal Ratio."
	};

	protected readonly referenceTooltipText = computed(() => {
		const id = this.openTooltip();
		if (id === "score" || id === "duration" || id === "ratio") {
			return BacklogModal.TOOLTIP_TEXTS[id];
		}
		return null;
	});

	protected readonly trackingTooltipText = computed(() => {
		const id = this.openTooltip();
		if (id === "rating" || id === "realDuration") {
			return BacklogModal.TOOLTIP_TEXTS[id];
		}
		return null;
	});

	toggleTooltip(id: string) {
		this.openTooltip.update(current => (current === id ? null : id));
	}

	reportMissing(category: "missing_score" | "missing_duration") {
		const game = this.selectedGame();
		if (!game) return;
		const message =
			category === "missing_score"
				? "Missing critic score data for this game."
				: "Missing duration estimate for this game.";
		this.http
			.post(`${environment.apiUrl}/games/${game.id}/reports`, {
				message
			})
			.subscribe({
				next: () => {
					this.reportFeedback.set("Thanks! Report sent.");
					this.toast.success("Missing data reported.");
				},
				error: err => {
					if (err.status === 409) {
						this.reportFeedback.set("Already reported.");
					} else {
						this.reportFeedback.set("");
					}
				}
			});
	}

	entry = input<BacklogEntry | null>(null);
	preselectedGame = input<Game | null>(null);
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
	protected readonly addToWishlist = signal(false);
	protected readonly isInWishlist = signal(false);
	protected readonly addToShelf = signal(false);
	protected readonly activeScoreSource = signal("");
	protected readonly activeDurationSource = signal("");
	protected readonly reviewContent = signal("");
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

	private readonly scoreValue = toSignal(this.form.controls.score.valueChanges, {
		initialValue: this.form.controls.score.value
	});
	private readonly durationValue = toSignal(
		this.form.controls.duration.valueChanges,
		{ initialValue: this.form.controls.duration.value }
	);
	protected readonly ratio = computed(() => {
		const s = this.scoreValue();
		const d = this.durationValue();
		if (s === null || s === undefined || !d || d <= 0) return null;
		return Math.round((s / d) * 100) / 100;
	});

	private readonly statusValue = toSignal(
		this.form.controls.status.valueChanges,
		{ initialValue: this.form.controls.status.value }
	);
	protected readonly showTrackingDetails = computed(
		() => this.statusValue() !== "not_started"
	);

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

			this.wishlistService.getMyWishlist().subscribe(wishlist => {
				const inWishlist = wishlist.some(w => w.backlog.id === e.id);
				this.isInWishlist.set(inWishlist);
				this.addToWishlist.set(inWishlist);
			});
		}

		const pg = this.preselectedGame();
		if (pg && !this.isEdit()) {
			this.selectGame(pg);
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
				next: () => {
					this.submitReviewIfNeeded(val.gameId!);
					this.handleWishlistChange(this.entry()!.id);
				},
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
				next: backlog => {
					this.submitReviewIfNeeded(val.gameId!);
					const extras$ = [];
					if (this.addToWishlist()) {
						extras$.push(
							this.wishlistService.addFromBacklog(backlog.id)
						);
					}
					if (this.addToShelf()) {
						extras$.push(
							this.gameShelfService.create({
								gameId: val.gameId!,
								platformId: val.platformId!
							})
						);
					}
					if (extras$.length > 0) {
						forkJoin(extras$).subscribe(() => this.saved.emit());
					} else {
						this.saved.emit();
					}
				},
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Creation failed");
				}
			});
		}
	}

	private handleWishlistChange(backlogId: string) {
		const want = this.addToWishlist();
		const was = this.isInWishlist();

		if (want && !was) {
			this.wishlistService
				.addFromBacklog(backlogId)
				.subscribe(() => this.saved.emit());
		} else if (!want && was) {
			this.wishlistService.getMyWishlist().subscribe(wishlist => {
				const remaining = wishlist
					.filter(w => w.backlog.id !== backlogId)
					.map(w => w.backlog.id);
				this.wishlistService
					.reorder(remaining)
					.subscribe(() => this.saved.emit());
			});
		} else {
			this.saved.emit();
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

	private submitReviewIfNeeded(gameId: string) {
		const content = this.reviewContent().trim();
		const rating = this.form.get("userRating")?.value;
		if (!content && !rating) return;

		const data: { content?: string; rating?: number } = {};
		if (content) data.content = content;
		if (rating) data.rating = rating;

		this.reviewsService.createReview(gameId, data).subscribe({
			error: () => {
				if (content || rating) {
					this.reviewsService.updateReview(gameId, data).subscribe();
				}
			}
		});
	}
}
