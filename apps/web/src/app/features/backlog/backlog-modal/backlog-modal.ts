import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	type ElementRef,
	inject,
	type OnInit,
	signal,
	viewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { form, FormField, max, min, required } from "@angular/forms/signals";
import { RouterLink } from "@angular/router";
import { injectDialogRef } from "ng-primitives/dialog";
import { type Observable, of, switchMap } from "rxjs";

import { type GamePlatinum } from "../../../core/models";
import { type Game } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { GamesService } from "../../../core/services/games";
import { PlatinumService } from "../../../core/services/platinum";
import { QueueService } from "../../../core/services/queue";
import { ReviewsService } from "../../../core/services/reviews";
import { type Review } from "../../../core/services/reviews.model";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { ToastService } from "../../../core/services/toast";
import { BacklogStatusBadge } from "../../../shared/components/backlog-status-badge/backlog-status-badge";
import { DialogDeleteAction } from "../../../shared/components/dialog-delete-action/dialog-delete-action";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { GameSearchStep } from "../../../shared/components/game-search/game-search-step";
import { SelectedGameRow } from "../../../shared/components/game-search/selected-game-row";
import { MoodTagsInput } from "../../../shared/components/mood-tags-input/mood-tags-input";
import { PlatinumTrophy } from "../../../shared/components/platinum-trophy/platinum-trophy";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { GameArtPipe } from "../../../shared/pipes/game-art";
import {
	UiAlert,
	UiAvatar,
	UiButton,
	UiDatePicker,
	UiDialog,
	UiEyebrow,
	UiFieldError,
	UiFieldLabel,
	UiFieldOptional,
	UiIconButton,
	UiInput,
	UiOptionPicker,
	type UiPickerOption,
	UiSelectableRow,
	UiSwitch,
	UiTab,
	UiTabList,
	UiTabPanel,
	UiTabs,
	UiTextarea
} from "../../../shared/ui";
import {
	BACKLOG_STATUS_FILTERS,
	backlogStatusIcon,
	backlogStatusIconColor
} from "../../../shared/utils/backlog-status";
import {
	isNotFound,
	problemTitle,
	reportHttpFailure
} from "../../../shared/utils/http-failure";
import { injectGameSearch } from "../../../shared/utils/inject-game-search";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import { BacklogService } from "../backlog";
import {
	type BacklogReviewDraft,
	type CreateBacklogDto,
	type UpdateBacklogDto
} from "../backlog.model";
import { type BacklogModalData } from "./backlog-modal.model";
import { BacklogEntrySummary } from "./components/backlog-entry-summary";
import {
	BacklogReferenceFields,
	type MissingReferenceCategory
} from "./components/backlog-reference-fields";
import { scrollIntoViewAndFocus } from "./focus-field";
import { injectCoopRun } from "./inject-coop-run";
import { injectProgressNotes } from "./inject-progress-notes";
import {
	MAX_CRITIC_SCORE,
	MIN_REFERENCE_VALUE,
	NO_REFERENCE_PICK,
	pickDefaultDuration,
	roundReferenceValue,
	toCriticScore
} from "./reference-values";
import { type ReferencePick } from "./reference-values.model";

export type BacklogModalResult = "saved" | "newRun";

const BACKLOG_FORM_STATUS_OPTIONS: readonly UiPickerOption[] =
	BACKLOG_STATUS_FILTERS.map(filter => ({
		value: filter.value,
		label: filter.label,
		icon: backlogStatusIcon(filter.value),
		iconClass: backlogStatusIconColor(filter.value)
	}));

const STANDALONE_RUN = "";

type MissingField = "game" | "platform" | "score" | "duration";
type TrackingTooltip = "rating" | "realDuration";

const TRACKING_TOOLTIP_TEXTS: Record<TrackingTooltip, string> = {
	rating: "Your personal rating (0.5–5 stars). Independent of critic score.",
	realDuration:
		"Hours you actually spent. Used to calculate your Personal Ratio."
};

const MISSING_FIELD_LABELS: Record<MissingField, string> = {
	game: "Game",
	platform: "Platform",
	score: "Critic score",
	duration: "Duration"
};

@Component({
	selector: "app-backlog-modal",
	imports: [
		UiAlert,
		BacklogStatusBadge,
		BacklogReferenceFields,
		DatePipe,
		FormField,
		RouterLink,
		StarRating,
		MoodTagsInput,
		BacklogEntrySummary,
		DialogDeleteAction,
		GamePoster,
		GameSearchStep,
		UiOptionPicker,
		PlatinumTrophy,
		SelectedGameRow,
		UiAvatar,
		UiButton,
		UiDatePicker,
		UiDialog,
		UiEyebrow,
		UiFieldError,
		UiFieldLabel,
		UiFieldOptional,
		UiIconButton,
		UiInput,
		UiSelectableRow,
		UiSwitch,
		UiTabs,
		UiTabList,
		UiTab,
		UiTabPanel,
		UiTextarea,
		GameArtPipe
	],
	templateUrl: "./backlog-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogModal implements OnInit {
	private readonly backlogService = inject(BacklogService);
	private readonly gamesService = inject(GamesService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly queueService = inject(QueueService);
	private readonly reviewsService = inject(ReviewsService);
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly authService = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly platinumService = inject(PlatinumService);

	private readonly compilationOptions =
		viewChild<ElementRef<HTMLElement>>("compilationOptions");
	private readonly platformField =
		viewChild<ElementRef<HTMLElement>>("platformField");
	private readonly referenceFields = viewChild(BacklogReferenceFields);

	protected readonly reportFeedback = signal("");

	protected readonly openTooltip = signal<TrackingTooltip | null>(null);
	protected readonly tooltipText = computed(() => {
		const tooltip = this.openTooltip();
		return tooltip ? TRACKING_TOOLTIP_TEXTS[tooltip] : null;
	});

	protected toggleTooltip(tooltip: TrackingTooltip) {
		this.openTooltip.update(current =>
			current === tooltip ? null : tooltip
		);
	}

	protected reportMissing(category: MissingReferenceCategory) {
		const game = this.selectedGame();
		if (!game) return;
		const message =
			category === "missing_score"
				? "Missing critic score data for this game."
				: "Missing duration estimate for this game.";
		this.gamesService.reportGame(game.id, message, category).subscribe({
			next: () => {
				this.reportFeedback.set("Thanks! Report sent.");
				this.toast.success("Missing data reported.");
			},
			error: (error: unknown) => {
				if (
					error instanceof HttpErrorResponse &&
					error.status === 409
				) {
					this.reportFeedback.set("Already reported.");
					return;
				}
				this.reportFeedback.set("");
				reportHttpFailure(
					this.toast,
					error,
					"Couldn't send the report. Try again."
				);
			}
		});
	}

	private readonly destroyRef = inject(DestroyRef);
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
	protected readonly allowNewRun = this.dialogRef.data.allowNewRun ?? false;

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly selectedGame = signal<Game | null>(null);
	protected readonly searchQuery = signal("");
	protected readonly search = injectGameSearch(
		this.searchQuery,
		signal(true)
	);
	protected readonly returnedToSearch = signal(false);
	protected readonly statusOptions = BACKLOG_FORM_STATUS_OPTIONS;
	protected readonly platformOptions = computed<UiPickerOption[]>(() =>
		(this.selectedGame()?.platforms ?? []).map(platform => ({
			value: platform.id,
			label: platform.name,
			icon: "sports_esports"
		}))
	);
	protected readonly addToQueue = signal(false);
	protected readonly isInQueue = signal(false);
	protected readonly addToShelf = signal(false);
	protected readonly isPublic = signal(true);
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
	protected readonly compilationParentOptions = computed<UiPickerOption[]>(
		() => [
			{
				value: STANDALONE_RUN,
				label: "None — track as standalone",
				icon: "videogame_asset"
			},
			...this.availableCompilationParents().map(parent => ({
				value: parent.id,
				label: parent.title,
				icon: "library_books"
			}))
		]
	);

	protected readonly isEdit = signal(false);
	protected readonly viewMode = signal<"summary" | "edit">("edit");
	protected readonly heading = computed(() => {
		if (!this.isEdit()) return "Add to My Games";
		return this.viewMode() === "summary" ? "Your run" : "Edit run";
	});
	protected readonly isSearchStep = computed(
		() =>
			!this.isEdit() && !this.selectedGame() && !this.compilationParent()
	);
	protected readonly subheading = computed(() => {
		if (this.isSearchStep()) {
			return "Search the catalog for a game to track";
		}
		return this.isEdit() && this.viewMode() === "edit"
			? this.entry!.game.title
			: null;
	});
	protected readonly activeFormTab = signal<"tracking" | "notes">("tracking");
	protected readonly referenceExpanded = signal(false);

	protected switchToEdit() {
		this.viewMode.set("edit");
	}

	protected readonly model = signal({
		gameId: "",
		platformId: "",
		score: null as number | null,
		duration: null as number | null,
		status: "not_started",
		startedAt: "",
		finishedAt: "",
		realDuration: null as number | null,
		userRating: null as number | null,
		notes: ""
	});

	protected readonly form = form(this.model, path => {
		required(path.gameId, { message: "Pick a game" });
		required(path.platformId, { message: "Pick a platform" });
		required(path.score, { message: "Required to compute the ratio" });
		min(path.score, MIN_REFERENCE_VALUE, {
			message: "Must be greater than 0"
		});
		max(path.score, MAX_CRITIC_SCORE, {
			message: `Max ${MAX_CRITIC_SCORE}`
		});
		required(path.duration, { message: "Required to compute the ratio" });
		min(path.duration, MIN_REFERENCE_VALUE, {
			message: "Must be greater than 0"
		});
	});

	protected readonly missingFields = computed<MissingField[]>(() => {
		if (this.isSearchStep()) return [];
		if (this.form.gameId().invalid()) return ["game"];
		const missing: MissingField[] = [];
		if (this.form.platformId().invalid()) missing.push("platform");
		if (this.form.score().invalid()) missing.push("score");
		if (this.form.duration().invalid()) missing.push("duration");
		return missing;
	});
	protected readonly missingFieldLabels = MISSING_FIELD_LABELS;
	protected readonly showPlatformError = computed(
		() =>
			this.form.platformId().touched() && this.form.platformId().invalid()
	);

	private readonly statusValue = computed(() => this.form.status().value());
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
	protected readonly coop = injectCoopRun({
		entryId: () => this.entry?.id,
		onSynced: () => this.dialogRef.close("saved")
	});

	protected readonly progress = injectProgressNotes(() => this.entry?.id);

	protected readonly moodTags = signal<string[]>([]);
	protected readonly moodTagsSuggestions = signal<string[]>([]);

	protected updateMoodTags(tags: string[]) {
		this.moodTags.set(tags);
	}

	protected readonly hasExistingReview = computed(
		() => !!this.entry?.review || !!this.existingReview()
	);

	protected readonly existingPlatinum = signal<GamePlatinum | null>(null);
	protected readonly platinumInRun = signal(false);
	protected readonly platinumDate = signal("");

	private readonly platinumIsThisRun = computed(
		() =>
			!!this.entry && this.existingPlatinum()?.backlogId === this.entry.id
	);

	protected readonly platinumElsewhere = computed(() => {
		const platinum = this.existingPlatinum();
		return platinum && !this.platinumIsThisRun() ? platinum : null;
	});

	protected readonly showPlatinumSection = computed(
		() =>
			this.isEdit() &&
			(this.statusValue() === "completed" || this.platinumIsThisRun())
	);

	protected setPlatinumInRun(checked: boolean) {
		this.platinumInRun.set(checked);
		if (checked && !this.platinumDate()) {
			this.platinumDate.set(
				this.form.finishedAt().value() || todayIsoDate()
			);
		}
	}

	private applyExistingPlatinum(platinum: GamePlatinum | null) {
		this.existingPlatinum.set(platinum);
		const isThisRun = !!platinum && platinum.backlogId === this.entry?.id;
		this.platinumInRun.set(isThisRun);
		this.platinumDate.set(isThisRun ? (platinum.platinumedAt ?? "") : "");
	}

	private syncPlatinum(gameId: string): Observable<unknown> {
		const wanted = this.platinumInRun();
		const wasThisRun = this.platinumIsThisRun();
		const date = this.platinumDate() || null;

		if (!wanted)
			return wasThisRun ? this.platinumService.remove(gameId) : of(null);
		if (wasThisRun && this.existingPlatinum()?.platinumedAt === date)
			return of(null);

		return this.platinumService.save(gameId, {
			backlogId: this.entry!.id,
			platinumedAt: date,
			notes: this.existingPlatinum()?.notes ?? null
		});
	}

	ngOnInit() {
		this.scoreSourcesService.load();
		this.moodTagsService
			.getMyTags()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(tags =>
				this.moodTagsSuggestions.set(tags.map(t => t.tag))
			);

		const e = this.entry;
		if (e) {
			this.isEdit.set(true);
			this.viewMode.set("summary");
			this.moodTags.set(e.moodTags ?? []);
			this.moodTagsService
				.getGameTags(e.game.id)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe(tags => this.moodTags.set(tags));
			this.progress.load();
			this.coop.load();
			this.selectedGame.set({
				id: e.game.id,
				code: e.game.code,
				title: e.game.title,
				coverUrl: e.game.coverUrl,
				backgroundUrl: e.game.backgroundUrl
			} as Game);
			if (e.compilationGame) {
				this.compilationParent.set({
					id: e.compilationGame.id,
					code: e.compilationGame.code,
					title: e.compilationGame.title,
					coverUrl: e.compilationGame.coverUrl,
					backgroundUrl: e.compilationGame.backgroundUrl
				} as Game);
			}
			this.applyExistingPlatinum(e.platinum ?? null);
			this.gamesService
				.getByCode(e.game.code)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: full => {
						this.selectedGame.set(full);
						this.refreshAvailableCompilationParents(full);
						if (full.userPlatinum !== undefined)
							this.applyExistingPlatinum(full.userPlatinum);
					}
				});
			this.model.set({
				gameId: e.game.id,
				platformId: e.platform.id,
				score: roundReferenceValue(e.score),
				duration: roundReferenceValue(e.duration),
				status: e.status,
				startedAt: e.startedAt ? e.startedAt.split("T")[0] : "",
				finishedAt: e.finishedAt ? e.finishedAt.split("T")[0] : "",
				realDuration: e.realDuration ?? null,
				userRating: e.userRating ?? null,
				notes: e.notes ?? ""
			});
			this.isPublic.set(e.isPublic);

			this.queueService
				.getMyQueue()
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe(queue => {
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

	protected pickCompilationChild(child: {
		id: string;
		code: string;
		title: string;
	}) {
		this.gamesService
			.getByCode(child.code)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: game => this.selectGame(game)
			});
	}

	protected selectWholeCompilation() {
		const parent = this.compilationParent();
		if (!parent) return;
		this.gamesService
			.getByCode(parent.code)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
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
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(tags => this.moodTags.set(tags));

		const duration = pickDefaultDuration(game.times);
		this.activeDurationSource.set(duration.source);
		this.referenceExpanded.set(false);

		const platforms = game.platforms ?? [];
		this.model.update(m => ({
			...m,
			gameId: game.id,
			platformId: platforms.length === 1 ? platforms[0].id : "",
			duration: duration.value
		}));
		this.prefillScoreOnceSourcesLoad(game);
	}

	private clearCompilationChild() {
		this.selectedGame.set(null);
		this.existingReview.set(null);
		this.model.update(m => ({ ...m, gameId: "", platformId: "" }));
	}

	private fetchExistingReview(gameId: string) {
		const userId = this.authService.user()?.id;
		if (!userId) {
			this.existingReview.set(null);
			return;
		}
		this.reviewsService
			.getReviews(gameId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: reviews => {
					const mine = reviews.find(r => r.user?.id === userId);
					this.existingReview.set(mine ?? null);
				},
				error: () => this.existingReview.set(null)
			});
	}

	protected clearCompilationParent() {
		this.compilationParent.set(null);
		if (!this.selectedGame()) this.returnedToSearch.set(true);
	}

	protected onCompilationParentChange(parentId: string) {
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

	protected selectGame(game: Game) {
		if (game.isCompilation && !this.isEdit()) {
			this.selectedGame.set(null);
			this.model.update(m => ({ ...m, gameId: "", platformId: "" }));
			if (
				game.compilationItems !== undefined &&
				game.compilationItems.length > 0
			) {
				this.compilationParent.set(game);
			} else {
				this.gamesService
					.getByCode(game.code)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe({
						next: full => this.compilationParent.set(full)
					});
			}
			return;
		}

		this.applyGameSelection(game);
	}

	protected revealMissingFields() {
		this.form().markAsTouched();
	}

	protected focusMissingField(field: MissingField) {
		this.revealMissingFields();
		if (field === "score" || field === "duration") {
			this.referenceFields()?.focusField(field);
			return;
		}
		const target =
			field === "game" ? this.compilationOptions() : this.platformField();
		if (target) scrollIntoViewAndFocus(target.nativeElement);
	}

	private prefillScoreOnceSourcesLoad(game: Game) {
		this.scoreSourcesService
			.whenLoaded()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				if (this.selectedGame()?.id !== game.id) return;
				const score = this.pickScore(game);
				this.activeScoreSource.set(score.source);
				this.model.update(m => ({ ...m, score: score.value }));
			});
	}

	private pickScore(game: Game): ReferencePick {
		const priority = this.scoreSourcesService
			.sources()
			.map(source => source.code);
		for (const source of priority) {
			const found = game.scores?.find(s => s.source === source);
			if (found) {
				return {
					value: toCriticScore(
						this.scoreSourcesService.normalize(found.score, source)
					),
					source
				};
			}
		}
		return NO_REFERENCE_PICK;
	}

	protected clearGame() {
		this.selectedGame.set(null);
		this.existingReview.set(null);
		this.model.update(m => ({ ...m, gameId: "", platformId: "" }));
		if (!this.compilationParent()) this.returnedToSearch.set(true);
	}

	protected setPlatform(platformId: string) {
		this.model.update(m => ({ ...m, platformId }));
	}

	protected setStatus(status: string) {
		this.model.update(m => ({ ...m, status }));
	}

	protected onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid()) {
			this.revealMissingFields();
			return;
		}
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form().value();

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
				isPublic: this.isPublic(),
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
					this.syncPlatinum(val.gameId!).subscribe({
						next: () => this.handleQueueChange(this.entry!.id),
						error: () => {
							this.toast.error(
								"The run was saved, but the platinum could not be updated"
							);
							this.handleQueueChange(this.entry!.id);
						}
					});
				},
				error: (err: unknown) => {
					if (isNotFound(err)) {
						this.closeBecauseRunIsGone();
						return;
					}
					this.isLoading.set(false);
					this.error.set(problemTitle(err) ?? "Update failed");
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
				isPublic: this.isPublic(),
				compilationGameId: this.compilationParent()?.id ?? undefined,
				addToQueue: this.addToQueue() || undefined,
				addToShelf: this.addToShelf() || undefined,
				moodTags: this.moodTags(),
				review: this.pendingReview() ?? undefined,
				progressNote: this.progress.draft().trim() || undefined
			};
			this.backlogService.create(dto).subscribe({
				next: () => this.dialogRef.close("saved"),
				error: (err: unknown) => {
					this.isLoading.set(false);
					this.error.set(problemTitle(err) ?? "Creation failed");
				}
			});
		}
	}

	private handleQueueChange(backlogId: string) {
		const want = this.addToQueue();
		const was = this.isInQueue();

		if (want && !was) {
			this.queueService.addFromBacklog(backlogId).subscribe({
				next: () => this.dialogRef.close("saved"),
				error: (error: unknown) => this.closeAfterQueueFailure(error)
			});
		} else if (!want && was) {
			this.queueService
				.getMyQueue()
				.pipe(
					switchMap(queue =>
						this.queueService.reorder(
							queue
								.filter(w => w.backlog.id !== backlogId)
								.map(w => w.backlog.id)
						)
					)
				)
				.subscribe({
					next: () => this.dialogRef.close("saved"),
					error: (error: unknown) =>
						this.closeAfterQueueFailure(error)
				});
		} else {
			this.dialogRef.close("saved");
		}
	}

	private closeAfterQueueFailure(error: unknown) {
		reportHttpFailure(
			this.toast,
			error,
			"The run was saved, but Up Next could not be updated."
		);
		this.dialogRef.close("saved");
	}

	private closeBecauseRunIsGone() {
		this.toast.error("This run no longer exists.");
		this.dialogRef.close("saved");
	}

	protected onDelete() {
		this.isLoading.set(true);
		this.backlogService.delete(this.entry!.id).subscribe({
			next: () => this.dialogRef.close("saved"),
			error: (err: unknown) => {
				if (isNotFound(err)) {
					this.closeBecauseRunIsGone();
					return;
				}
				this.isLoading.set(false);
				this.error.set(problemTitle(err) ?? "Delete failed");
			}
		});
	}

	protected onClose() {
		this.dialogRef.close();
	}

	protected onNewRun() {
		this.dialogRef.close("newRun");
	}

	private persistMoodTagsIfChanged(gameId: string) {
		this.moodTagsService
			.replaceGameTags(gameId, this.moodTags())
			.subscribe({
				error: (error: unknown) =>
					reportHttpFailure(
						this.toast,
						error,
						"The run was saved, but the mood tags could not be updated."
					)
			});
	}

	private submitReviewIfNeeded(gameId: string) {
		const review = this.pendingReview();
		if (review)
			this.reviewsService.createReview(gameId, review).subscribe({
				error: (error: unknown) =>
					reportHttpFailure(
						this.toast,
						error,
						"The run was saved, but the review could not be posted."
					)
			});
	}

	private pendingReview(): BacklogReviewDraft | null {
		if (!this.isFirstReviewableTransition()) return null;
		if (this.hasExistingReview()) return null;

		const content = this.reviewContent().trim();
		const rating = this.form().value().userRating;
		if (!content && !rating) return null;

		const review: BacklogReviewDraft = {};
		if (content) review.content = content;
		if (rating) review.rating = rating;
		return review;
	}
}

function todayIsoDate() {
	return new Date().toISOString().split("T")[0];
}
