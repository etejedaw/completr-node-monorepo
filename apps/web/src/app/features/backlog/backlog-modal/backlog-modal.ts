import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import {
	NgpDialog,
	NgpDialogOverlay,
	NgpDialogTitle,
	injectDialogRef
} from "ng-primitives/dialog";
import { BacklogEntry } from "../../../core/models";
import { Game, Platform } from "../../../core/models";
import { BacklogService, CreateBacklogDto, UpdateBacklogDto } from "../backlog";
import { GamesService } from "../../games/games";
import { QueueService } from "../../queue/queue";
import { GameShelfService } from "../../game-shelf/game-shelf";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { Review, ReviewsService } from "../../games/reviews";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { MoodTagsInput } from "../../../shared/components/mood-tags-input/mood-tags-input";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import {
	BacklogProgressService,
	ProgressNote
} from "../../backlog-progress/backlog-progress";
import {
	CoopRunsService,
	CoopMember,
	CoopCandidate,
	SyncField
} from "../../coop-runs/coop-runs";
import {
	PublicSocialService,
	PublicSocialUser
} from "../../public-profile/services/public-social.service";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	forkJoin,
	of
} from "rxjs";
import {
	UiButton,
	UiIconButton,
	UiInput,
	UiSelect,
	UiTabs,
	UiTabList,
	UiTab,
	UiTabPanel,
	UiTextarea
} from "../../../shared/ui";
import { DatePipe } from "@angular/common";

export interface BacklogModalData {
	entry: BacklogEntry | null;
	preselectedGame: Game | null;
	preselectedCompilationParent: Game | null;
	preselectAddToQueue: boolean;
}
export type BacklogModalResult = "saved";

@Component({
	selector: "app-backlog-modal",
	imports: [
		DatePipe,
		ReactiveFormsModule,
		RouterLink,
		StarRating,
		MoodTagsInput,
		NgpDialog,
		NgpDialogOverlay,
		NgpDialogTitle,
		UiButton,
		UiIconButton,
		UiInput,
		UiSelect,
		UiTabs,
		UiTabList,
		UiTab,
		UiTabPanel,
		UiTextarea
	],
	templateUrl: "./backlog-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogModal implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly backlogService = inject(BacklogService);
	private readonly gamesService = inject(GamesService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly queueService = inject(QueueService);
	private readonly gameShelfService = inject(GameShelfService);
	private readonly reviewsService = inject(ReviewsService);
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly progressService = inject(BacklogProgressService);
	private readonly coopService = inject(CoopRunsService);
	private readonly publicSocial = inject(PublicSocialService);
	private readonly authService = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly http = inject(HttpClient);

	protected readonly reportFeedback = signal("");
	protected readonly openTooltip = signal<string | null>(null);

	private static readonly TOOLTIP_TEXTS: Record<string, string> = {
		ratio: "Ratio = (Critic Score ÷ Duration) × 20, scaled to 0–100. Higher means short and well-rated — useful to prioritize what to play next.",
		score: "Average score from critics (Metacritic, OpenCritic, RAWG). Stored on a 0–5 scale — clicking a source button auto-normalizes the value for you.",
		duration:
			"Estimated playtime from HowLongToBeat or RAWG. Not your real playtime — that goes in Real Duration below.",
		rating: "Your personal rating (0.5–5 stars). Independent of critic score.",
		realDuration:
			"Hours you actually spent. Used to calculate your Personal Ratio."
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
				message,
				category
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

	private readonly dialogRef = injectDialogRef<
		BacklogModalData,
		BacklogModalResult
	>();
	protected readonly entry = this.dialogRef.data.entry;
	protected readonly preselectedGame = this.dialogRef.data.preselectedGame;
	protected readonly preselectedCompilationParent =
		this.dialogRef.data.preselectedCompilationParent;
	protected readonly preselectAddToQueue =
		this.dialogRef.data.preselectAddToQueue;

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
	protected readonly isSearchingOnline = signal(false);
	protected readonly addToQueue = signal(false);
	protected readonly isInQueue = signal(false);
	protected readonly addToShelf = signal(false);
	protected readonly compilationParent = signal<Game | null>(null);
	protected readonly availableCompilationParents = signal<
		{ id: string; title: string; code: string }[]
	>([]);
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
	protected readonly viewMode = signal<"summary" | "edit">("edit");
	protected readonly activeFormTab = signal<
		"reference" | "tracking" | "notes"
	>("tracking");

	switchToEdit() {
		this.viewMode.set("edit");
	}

	statusLabel(status?: string): string {
		const map: Record<string, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned",
			endless: "Endless"
		};
		return status ? (map[status] ?? status) : "";
	}

	statusClass(status?: string): string {
		const map: Record<string, string> = {
			not_started: "bg-fg-muted/10 text-fg-muted",
			playing: "bg-warning/10 text-warning",
			completed: "bg-success/10 text-success",
			abandoned: "bg-danger/10 text-danger",
			endless: "bg-brand-subtle text-brand"
		};
		return status ? (map[status] ?? "") : "";
	}

	form = this.fb.group({
		gameId: ["", Validators.required],
		platformId: ["", Validators.required],
		score: [
			null as number | null,
			[Validators.required, Validators.min(0.01), Validators.max(5)]
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

	private readonly scoreValue = toSignal(
		this.form.controls.score.valueChanges,
		{
			initialValue: this.form.controls.score.value
		}
	);
	private readonly durationValue = toSignal(
		this.form.controls.duration.valueChanges,
		{ initialValue: this.form.controls.duration.value }
	);
	protected readonly ratio = computed(() => {
		const s = this.scoreValue();
		const d = this.durationValue();
		if (s === null || s === undefined || !d || d <= 0) return null;
		return Math.round((s / d) * 20 * 100) / 100;
	});

	private readonly statusValue = toSignal(
		this.form.controls.status.valueChanges,
		{ initialValue: this.form.controls.status.value }
	);
	protected readonly showTrackingDetails = computed(
		() => this.statusValue() !== "not_started"
	);

	protected readonly isReviewableStatus = computed(() => {
		const s = this.statusValue();
		return s === "completed" || s === "abandoned" || s === "endless";
	});

	protected readonly isFirstReviewableTransition = computed(() => {
		if (!this.isReviewableStatus()) return false;
		const previous = this.entry?.status;
		return (
			previous !== "completed" &&
			previous !== "abandoned" &&
			previous !== "endless"
		);
	});

	protected readonly existingReview = signal<Review | null>(null);
	protected readonly coopMembers = signal<CoopMember[]>([]);
	protected readonly myFollowing = signal<PublicSocialUser[]>([]);
	protected readonly coopAdding = signal(false);
	protected readonly coopRemovingId = signal<string | null>(null);
	protected readonly syncMember = signal<CoopMember | null>(null);
	protected readonly syncFields = signal<Record<SyncField, boolean>>({
		status: true,
		startedAt: true,
		finishedAt: true,
		realDuration: true
	});
	protected readonly syncing = signal(false);

	protected availableFollows() {
		const taken = new Set(this.coopMembers().map(m => m.userId));
		return this.myFollowing().filter(f => !taken.has(f.id));
	}

	protected readonly pickerCandidates = signal<CoopCandidate[]>([]);
	protected readonly pickerUserId = signal<string | null>(null);
	protected readonly pickerUserName = signal<string>("");

	addCoopMember(userId: string) {
		const e = this.entry;
		if (!e || !userId) return;
		this.coopAdding.set(true);
		this.coopService.getCandidates(e.id, userId).subscribe({
			next: res => {
				if (res.accessible && res.candidates.length >= 2) {
					this.pickerCandidates.set(res.candidates);
					this.pickerUserId.set(userId);
					const friend = this.myFollowing().find(
						f => f.id === userId
					);
					this.pickerUserName.set(
						friend?.name || friend?.username || ""
					);
					this.coopAdding.set(false);
					return;
				}
				this.commitCoopAdd(userId);
			},
			error: () => {
				this.coopAdding.set(false);
			}
		});
	}

	chooseCandidate(targetBacklogId: string | null) {
		const userId = this.pickerUserId();
		if (!userId) return;
		const id = targetBacklogId ?? undefined;
		this.pickerCandidates.set([]);
		this.pickerUserId.set(null);
		this.commitCoopAdd(userId, id);
	}

	cancelPicker() {
		this.pickerCandidates.set([]);
		this.pickerUserId.set(null);
	}

	private commitCoopAdd(userId: string, targetBacklogId?: string) {
		const e = this.entry;
		if (!e) return;
		this.coopAdding.set(true);
		this.coopService.addMember(e.id, userId, targetBacklogId).subscribe({
			next: () => {
				this.coopAdding.set(false);
				this.refreshCoopMembers();
			},
			error: () => this.coopAdding.set(false)
		});
	}

	removeCoopMember(member: CoopMember) {
		const e = this.entry;
		if (!e) return;
		this.coopRemovingId.set(member.userId);
		this.coopService.removeMember(e.id, member.userId).subscribe({
			next: () => {
				this.coopRemovingId.set(null);
				this.refreshCoopMembers();
			},
			error: () => this.coopRemovingId.set(null)
		});
	}

	openSyncDialog(member: CoopMember) {
		this.syncMember.set(member);
		this.syncFields.set({
			status: true,
			startedAt: true,
			finishedAt: true,
			realDuration: true
		});
	}

	closeSyncDialog() {
		this.syncMember.set(null);
	}

	toggleSyncField(field: SyncField) {
		const current = this.syncFields();
		this.syncFields.set({ ...current, [field]: !current[field] });
	}

	hasAnySyncFieldSelected(): boolean {
		const f = this.syncFields();
		return f.status || f.startedAt || f.finishedAt || f.realDuration;
	}

	commitSync() {
		const e = this.entry;
		const member = this.syncMember();
		if (!e || !member) return;
		const fields: SyncField[] = (
			Object.keys(this.syncFields()) as SyncField[]
		).filter(k => this.syncFields()[k]);
		if (fields.length === 0) return;
		this.syncing.set(true);
		this.coopService.sync(e.id, member.backlogId, fields).subscribe({
			next: () => {
				this.syncing.set(false);
				this.syncMember.set(null);
				this.dialogRef.close("saved");
			},
			error: () => this.syncing.set(false)
		});
	}

	private refreshCoopMembers() {
		const e = this.entry;
		if (!e) return;
		this.coopService
			.getMembers(e.id)
			.subscribe(members => this.coopMembers.set(members));
	}

	protected readonly progressNotes = signal<ProgressNote[]>([]);
	protected readonly progressDraft = signal("");
	protected readonly progressLoading = signal(false);
	protected readonly progressHistoryOpen = signal(false);
	protected readonly progressSavingId = signal<string | null>(null);

	updateProgressDraft(value: string) {
		this.progressDraft.set(value);
	}

	toggleProgressHistory() {
		this.progressHistoryOpen.update(v => !v);
	}

	addProgressNote() {
		const note = this.progressDraft().trim();
		const e = this.entry;
		if (!note || !e) return;
		this.progressLoading.set(true);
		this.progressService.addProgress(e.id, note).subscribe({
			next: created => {
				this.progressNotes.update(list => [created, ...list]);
				this.progressDraft.set("");
				this.progressLoading.set(false);
			},
			error: () => this.progressLoading.set(false)
		});
	}

	deleteProgressNote(note: ProgressNote) {
		const e = this.entry;
		if (!e) return;
		this.progressSavingId.set(note.id);
		this.progressService.deleteProgress(e.id, note.id).subscribe({
			next: () => {
				this.progressNotes.update(list =>
					list.filter(n => n.id !== note.id)
				);
				this.progressSavingId.set(null);
			},
			error: () => this.progressSavingId.set(null)
		});
	}

	protected readonly moodTags = signal<string[]>([]);
	protected readonly moodTagsSuggestions = signal<string[]>([]);

	updateMoodTags(tags: string[]) {
		this.moodTags.set(tags);
	}

	protected readonly hasExistingReview = computed(
		() => !!this.entry?.review || !!this.existingReview()
	);

	ngOnInit() {
		this.gamesService.getPlatforms().subscribe(p => this.platforms.set(p));
		this.scoreSourcesService.load();
		this.moodTagsService
			.getMyTags()
			.subscribe(tags =>
				this.moodTagsSuggestions.set(tags.map(t => t.tag))
			);

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
				this.gameResults.set(games);
				this.isSearching.set(false);
				this.isSearchingOnline.set(false);
			});

		const e = this.entry;
		if (e) {
			this.isEdit.set(true);
			this.viewMode.set("summary");
			this.moodTags.set(e.moodTags ?? []);
			this.moodTagsService
				.getGameTags(e.game.id)
				.subscribe(tags => this.moodTags.set(tags));
			this.progressService
				.getProgress(e.id)
				.subscribe(notes => this.progressNotes.set(notes));
			this.refreshCoopMembers();
			const currentUser = this.authService.user();
			if (currentUser?.username) {
				this.publicSocial
					.getFollowing(currentUser.username)
					.subscribe(users => this.myFollowing.set(users));
			}
			this.selectedGame.set({
				id: e.game.id,
				code: e.game.code,
				title: e.game.title,
				backgroundUrl: e.game.backgroundUrl
			} as Game);
			if (e.compilationGame) {
				this.compilationParent.set({
					id: e.compilationGame.id,
					code: e.compilationGame.code,
					title: e.compilationGame.title,
					backgroundUrl: e.compilationGame.backgroundUrl
				} as Game);
			}
			this.gamesService.getByCode(e.game.code).subscribe({
				next: full => {
					this.selectedGame.set(full);
					this.refreshAvailableCompilationParents(full);
				}
			});
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

			this.queueService.getMyQueue().subscribe(queue => {
				const inQueue = queue.some(w => w.backlog.id === e.id);
				this.isInQueue.set(inQueue);
				this.addToQueue.set(inQueue);
			});
		}

		const parentPreset = this.preselectedCompilationParent;
		if (parentPreset && !this.isEdit()) {
			this.compilationParent.set(parentPreset);
		}

		const pg = this.preselectedGame;
		if (pg && !this.isEdit()) {
			this.selectGame(pg);
		}

		if (this.preselectAddToQueue && !this.isEdit()) {
			this.addToQueue.set(true);
		}
	}

	private refreshAvailableCompilationParents(game: Game) {
		const parents =
			game.partOfCompilations?.map(link => ({
				id: link.parentGame.id,
				title: link.parentGame.title,
				code: link.parentGame.code
			})) ?? [];
		this.availableCompilationParents.set(parents);
	}

	pickCompilationChild(child: { id: string; code: string; title: string }) {
		this.gamesService.getByCode(child.code).subscribe({
			next: game => this.selectGame(game)
		});
	}

	selectWholeCompilation() {
		const parent = this.compilationParent();
		if (!parent) return;
		this.gamesService.getByCode(parent.code).subscribe({
			next: game => {
				this.compilationParent.set(null);
				this.applyGameSelection(game);
			}
		});
	}

	private applyGameSelection(game: Game) {
		this.selectedGame.set(game);
		this.refreshAvailableCompilationParents(game);
		this.fetchExistingReview(game.id);
		this.moodTagsService
			.getGameTags(game.id)
			.subscribe(tags => this.moodTags.set(tags));

		const score = this.pickScore(game);
		const duration = this.pickDuration(game);
		this.activeScoreSource.set(score.source);
		this.activeDurationSource.set(duration.source);

		const platforms = game.platforms ?? [];
		this.form.patchValue({
			gameId: game.id,
			platformId: platforms.length === 1 ? platforms[0].id : "",
			score: score.value,
			duration: duration.value
		});
		this.gameResults.set([]);
		this.searchQuery.set("");
	}

	clearCompilationChild() {
		this.selectedGame.set(null);
		this.existingReview.set(null);
		this.form.patchValue({ gameId: "", platformId: "" });
	}

	private fetchExistingReview(gameId: string) {
		const userId = this.authService.user()?.id;
		if (!userId) {
			this.existingReview.set(null);
			return;
		}
		this.reviewsService.getReviews(gameId).subscribe({
			next: reviews => {
				const mine = reviews.find(r => r.user?.id === userId);
				this.existingReview.set(mine ?? null);
			},
			error: () => this.existingReview.set(null)
		});
	}

	clearCompilationParent() {
		this.compilationParent.set(null);
	}

	onCompilationParentChange(parentId: string) {
		if (!parentId) {
			this.compilationParent.set(null);
			return;
		}
		const match = this.availableCompilationParents().find(
			p => p.id === parentId
		);
		if (!match) return;
		this.compilationParent.set({
			id: match.id,
			code: match.code,
			title: match.title
		} as Game);
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
		if (game.isCompilation && !this.isEdit()) {
			this.gameResults.set([]);
			this.searchQuery.set("");
			this.selectedGame.set(null);
			this.form.patchValue({ gameId: "", platformId: "" });
			if (
				game.compilationItems !== undefined &&
				game.compilationItems.length > 0
			) {
				this.compilationParent.set(game);
			} else {
				this.gamesService.getByCode(game.code).subscribe({
					next: full => this.compilationParent.set(full)
				});
			}
			return;
		}

		this.applyGameSelection(game);
	}

	applyScore(source: string, score: number) {
		this.activeScoreSource.set(source);
		const normalized = this.scoreSourcesService.normalize(score, source);
		this.form.patchValue({ score: normalized });
	}

	applyDuration(source: string, duration: number) {
		this.activeDurationSource.set(source);
		this.form.patchValue({ duration });
	}

	onScoreManualChange() {
		this.activeScoreSource.set("");
		const current = this.form.controls.score.value;
		if (current !== null && current !== undefined && current > 5) {
			this.form.controls.score.setValue(5);
		}
	}

	onDurationManualChange() {
		this.activeDurationSource.set("");
	}

	getScaleLabel(source: string): string {
		const scale = this.scoreSourcesService.getScale(source);
		return scale ? `/${scale}` : "";
	}

	private pickScore(game: Game): { value: number | null; source: string } {
		const priority = ["metacritic", "opencritic", "rawg", "completr"];
		for (const source of priority) {
			const found = game.scores?.find(s => s.source === source);
			if (found) {
				return {
					value: this.scoreSourcesService.normalize(
						found.score,
						source
					),
					source
				};
			}
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
				notes: val.notes || null,
				compilationGameId: this.compilationParent()?.id ?? null
			};
			this.backlogService.update(this.entry!.id, dto).subscribe({
				next: res => {
					this.submitReviewIfNeeded(val.gameId!);
					this.persistMoodTagsIfChanged(val.gameId!);
					if (res.queueRemoved) {
						const title = this.entry!.game.title;
						const reason =
							dto.status === "completed"
								? "completed"
								: dto.status === "endless"
									? "marked as endless"
									: "abandoned";
						this.toast.info(
							`Removed from your Queue: ${title} — ${reason}`
						);
						this.isInQueue.set(false);
						this.addToQueue.set(false);
					}
					this.handleQueueChange(this.entry!.id);
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
				notes: val.notes || undefined,
				compilationGameId: this.compilationParent()?.id ?? undefined
			};
			this.backlogService.create(dto).subscribe({
				next: backlog => {
					this.submitReviewIfNeeded(val.gameId!);
					this.persistMoodTagsIfChanged(val.gameId!);
					const draft = this.progressDraft().trim();
					if (draft) {
						this.progressService
							.addProgress(backlog.id, draft)
							.subscribe();
					}
					const extras$ = [];
					if (this.addToQueue()) {
						extras$.push(
							this.queueService.addFromBacklog(backlog.id)
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
						forkJoin(extras$).subscribe(() =>
							this.dialogRef.close("saved")
						);
					} else {
						this.dialogRef.close("saved");
					}
				},
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Creation failed");
				}
			});
		}
	}

	private handleQueueChange(backlogId: string) {
		const want = this.addToQueue();
		const was = this.isInQueue();

		if (want && !was) {
			this.queueService
				.addFromBacklog(backlogId)
				.subscribe(() => this.dialogRef.close("saved"));
		} else if (!want && was) {
			this.queueService.getMyQueue().subscribe(queue => {
				const remaining = queue
					.filter(w => w.backlog.id !== backlogId)
					.map(w => w.backlog.id);
				this.queueService
					.reorder(remaining)
					.subscribe(() => this.dialogRef.close("saved"));
			});
		} else {
			this.dialogRef.close("saved");
		}
	}

	onDelete() {
		this.isLoading.set(true);
		this.backlogService.delete(this.entry!.id).subscribe({
			next: () => this.dialogRef.close("saved"),
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Delete failed");
			}
		});
	}

	onClose() {
		this.dialogRef.close();
	}

	private persistMoodTagsIfChanged(gameId: string) {
		this.moodTagsService
			.replaceGameTags(gameId, this.moodTags())
			.subscribe();
	}

	private submitReviewIfNeeded(gameId: string) {
		if (!this.isFirstReviewableTransition()) return;
		if (this.hasExistingReview()) return;

		const content = this.reviewContent().trim();
		const rating = this.form.get("userRating")?.value;
		if (!content && !rating) return;

		const data: { content?: string; rating?: number } = {};
		if (content) data.content = content;
		if (rating) data.rating = rating;

		this.reviewsService.createReview(gameId, data).subscribe();
	}
}
