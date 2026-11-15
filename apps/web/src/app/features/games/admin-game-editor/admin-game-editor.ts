import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	type OnInit,
	output,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { form, FormField, maxLength, validate } from "@angular/forms/signals";
import { forkJoin, type Subscription } from "rxjs";

import {
	type Game,
	type GameSummary,
	type Genre,
	type OnlineSearchSource,
	type Platform
} from "../../../core/models";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import { FilterSection } from "../../../shared/components/filter-section/filter-section";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { SelectedGameRow } from "../../../shared/components/game-search/selected-game-row";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiChipGroup,
	type UiChipOption,
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
	UiSegmentedControl,
	type UiSegmentedOption,
	UiSwitch,
	UiTextarea
} from "../../../shared/ui";
import { FranchisesService } from "../../franchises/franchises";
import { type Franchise } from "../../franchises/franchises.model";
import { GamesService } from "../games";
import {
	type CreateGameDto,
	type ExternalGameDetail,
	type UpdateGameDto
} from "../games.model";
import {
	type CompilationRowMode,
	type ManualExternalSource
} from "./admin-game-editor.model";
import { CatalogGamePicker } from "./catalog-game-picker";
import {
	buildHltbSearchUrl,
	buildMetacriticGameUrl,
	normalizeHltbId,
	normalizeMetacriticSlug
} from "./external-id-input";
import { injectGameCompilation } from "./game-compilation";
import { previewSlug } from "./game-slug-preview";
import { injectGameSplit } from "./game-split";

const CREATE_VARIANT_MISSING_MESSAGE =
	"Another game already uses this external id. Set a variant label on this game (e.g. Collection) to tell them apart.";
const CREATE_SIBLING_VARIANT_MISSING_MESSAGE =
	"Another game with this external id has no variant label. Add one to that game first, then create this one.";

const HLTB_ID_ERROR =
	"Enter the HowLongToBeat game ID (a whole number above 0) or paste its game page URL.";
const METACRITIC_SLUG_ERROR =
	"Use lowercase letters, numbers and hyphens (e.g. the-witcher-3-wild-hunt) or paste the Metacritic game URL.";

const LOOKUP_SOURCES: UiSegmentedOption<OnlineSearchSource>[] = [
	{ value: "rawg", label: "RAWG" },
	{ value: "igdb", label: "IGDB" }
];

const LOOKUP_SOURCE_LABELS: Record<OnlineSearchSource, string> = {
	rawg: "RAWG",
	igdb: "IGDB"
};

const LOOKUP_SLUG_EXAMPLES: Record<OnlineSearchSource, string> = {
	rawg: "resident-evil-4",
	igdb: "hollow-knight"
};

const FRANCHISES_PAGE_SIZE = 100;
const NOT_FOUND_STATUS = 404;
const SERVICE_UNAVAILABLE_STATUS = 503;

const COMPILATION_ROW_MODES: UiSegmentedOption<CompilationRowMode>[] = [
	{ value: "link", label: "Link existing", icon: "link" },
	{ value: "create", label: "Create new", icon: "add_circle_outline" }
];

@Component({
	selector: "app-admin-game-editor",
	imports: [
		CatalogGamePicker,
		UiChipGroup,
		FilterSection,
		FormField,
		GamePoster,
		UiOptionPicker,
		UiSegmentedControl,
		SelectedGameRow,
		UiAlert,
		UiBadge,
		UiButton,
		UiDatePicker,
		UiDialog,
		UiEyebrow,
		UiFieldLabel,
		UiFieldOptional,
		UiIconButton,
		UiInput,
		UiSwitch,
		UiTextarea,
		UiFieldError
	],
	templateUrl: "./admin-game-editor.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGameEditor implements OnInit {
	game = input<Game | null>(null);
	embedded = input(false);
	saved = output<void>();
	created = output<Game>();
	split = output<Game>();

	protected readonly isEditMode = computed(() => !!this.game());

	private readonly gamesService = inject(GamesService);
	private readonly franchisesService = inject(FranchisesService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly allGenres = signal<Genre[]>([]);
	protected readonly allFranchises = signal<Franchise[]>([]);
	protected readonly selectedFranchiseId = signal<string>("");
	protected readonly compilationRowModes = COMPILATION_ROW_MODES;
	protected readonly lookupSources = LOOKUP_SOURCES;

	protected readonly platformOptions = computed<UiChipOption[]>(() =>
		this.allPlatforms().map(platform => ({
			value: platform.code,
			label: platform.abbreviation,
			hint: platform.name
		}))
	);
	protected readonly genreOptions = computed<UiChipOption[]>(() =>
		this.allGenres().map(genre => ({
			value: genre.code,
			label: genre.name
		}))
	);
	protected readonly franchiseOptions = computed<UiPickerOption[]>(() => [
		{ value: "", label: "None", icon: "block" },
		...this.allFranchises().map(franchise => ({
			value: franchise.id,
			label: franchise.name,
			icon: "collections_bookmark"
		}))
	]);

	protected readonly model = signal({
		lookupSlug: "",
		title: "",
		description: "",
		releaseAt: "",
		backgroundUrl: "",
		isDlc: false,
		variant: "",
		hltbId: "",
		metacriticSlug: ""
	});
	readonly form = form(this.model, path => {
		maxLength(path.variant, 100);
		validate(path.hltbId, ({ value }) =>
			normalizeHltbId(value()) === null
				? { kind: "hltbId", message: HLTB_ID_ERROR }
				: null
		);
		validate(path.metacriticSlug, ({ value }) =>
			normalizeMetacriticSlug(value()) === null
				? { kind: "metacriticSlug", message: METACRITIC_SLUG_ERROR }
				: null
		);
	});
	protected readonly lookupSlug = computed(() =>
		this.form.lookupSlug().value()
	);
	protected readonly title = computed(() => this.form.title().value());
	protected readonly description = computed(() =>
		this.form.description().value()
	);
	protected readonly releaseAt = computed(() =>
		this.form.releaseAt().value()
	);
	protected readonly backgroundUrl = computed(() =>
		this.form.backgroundUrl().value()
	);
	protected readonly isDlc = computed(() => this.form.isDlc().value());
	protected readonly variant = computed(() => this.form.variant().value());

	private readonly normalizedHltbId = computed(() =>
		normalizeHltbId(this.form.hltbId().value())
	);
	private readonly normalizedMetacriticSlug = computed(() =>
		normalizeMetacriticSlug(this.form.metacriticSlug().value())
	);
	protected readonly savedHltbId = computed(() =>
		this.savedExternalId("hltb")
	);
	protected readonly savedMetacriticSlug = computed(() =>
		this.savedExternalId("metacritic")
	);
	protected readonly hltbIdError = computed(() =>
		this.visibleFieldError(this.form.hltbId())
	);
	protected readonly metacriticSlugError = computed(() =>
		this.visibleFieldError(this.form.metacriticSlug())
	);
	protected readonly hltbIdCleared = computed(
		() => !!this.savedHltbId() && this.normalizedHltbId() === ""
	);
	protected readonly metacriticSlugCleared = computed(
		() =>
			!!this.savedMetacriticSlug() &&
			this.normalizedMetacriticSlug() === ""
	);
	protected readonly hltbSearchUrl = computed(() =>
		buildHltbSearchUrl(this.title())
	);
	protected readonly metacriticPageUrl = computed(() => {
		const slug = this.normalizedMetacriticSlug();
		return slug ? buildMetacriticGameUrl(slug) : null;
	});
	private readonly hasInvalidExternalIds = computed(
		() =>
			this.normalizedHltbId() === null ||
			this.normalizedMetacriticSlug() === null
	);

	protected readonly lookupSource = signal<OnlineSearchSource>("rawg");
	protected readonly lookupSourceLabel = computed(
		() => LOOKUP_SOURCE_LABELS[this.lookupSource()]
	);
	protected readonly lookupSlugPlaceholder = computed(
		() =>
			`${this.lookupSourceLabel()} slug (e.g. ${LOOKUP_SLUG_EXAMPLES[this.lookupSource()]})`
	);
	protected readonly fetchingLookup = signal(false);
	protected readonly lookupError = signal("");
	protected readonly appliedLookup = signal<{
		source: OnlineSearchSource;
		externalId: string;
	} | null>(null);
	protected readonly appliedLookupLabel = computed(() => {
		const applied = this.appliedLookup();
		return applied ? LOOKUP_SOURCE_LABELS[applied.source] : "";
	});
	private fetchedCoverUrl: string | null = null;
	private lookupRequest: {
		source: OnlineSearchSource;
		slug: string;
		subscription: Subscription;
	} | null = null;

	protected readonly parentGame = signal<GameSummary | null>(null);
	protected readonly parentCleared = signal(false);
	protected readonly parentRemovalPending = computed(
		() =>
			!!this.game()?.parentGame &&
			this.parentCleared() &&
			!this.parentGame()
	);
	protected readonly parentFocus = signal<"search" | "selected" | null>(null);
	protected readonly parentExcludedIds = computed(() => {
		const ownId = this.game()?.id;
		return ownId ? [ownId] : [];
	});
	protected readonly selectedPlatforms = signal<Set<string>>(new Set());
	protected readonly selectedGenres = signal<Set<string>>(new Set());
	protected readonly platformValues = computed(() => [
		...this.selectedPlatforms()
	]);
	protected readonly genreValues = computed(() => [...this.selectedGenres()]);
	protected readonly scores = signal<{ source: string; score: number }[]>([]);
	protected readonly times = signal<{ source: string; duration: number }[]>(
		[]
	);

	protected readonly saving = signal(false);
	protected readonly saveError = signal("");

	private readonly splitFlow = injectGameSplit(this.game, firstVariant =>
		this.split.emit(firstVariant)
	);
	private readonly compilationFlow = injectGameCompilation(this.game, () =>
		this.saved.emit()
	);
	protected readonly splitOpen = this.splitFlow.open;
	protected readonly splitting = this.splitFlow.splitting;
	protected readonly splitError = this.splitFlow.error;
	protected readonly splitVariants = this.splitFlow.variants;
	protected readonly openSplitModal = this.splitFlow.openModal;
	protected readonly closeSplitModal = this.splitFlow.closeModal;
	protected readonly addSplitVariant = this.splitFlow.addVariant;
	protected readonly removeSplitVariant = this.splitFlow.removeVariant;
	protected readonly updateSplitVariantTitle =
		this.splitFlow.updateVariantTitle;
	protected readonly updateSplitVariantLabel =
		this.splitFlow.updateVariantLabel;
	protected readonly submitSplit = this.splitFlow.submit;

	protected readonly compilationOpen = this.compilationFlow.open;
	protected readonly compilationSaving = this.compilationFlow.saving;
	protected readonly compilationClearing = this.compilationFlow.clearing;
	protected readonly compilationError = this.compilationFlow.error;
	protected readonly compilationRows = this.compilationFlow.rows;
	protected readonly compilationExcludedIds =
		this.compilationFlow.excludedIds;
	protected readonly openCompilationModal = this.compilationFlow.openModal;
	protected readonly closeCompilationModal = this.compilationFlow.closeModal;
	protected readonly addCompilationRow = this.compilationFlow.addRow;
	protected readonly removeCompilationRow = this.compilationFlow.removeRow;
	protected readonly setCompilationRowMode = this.compilationFlow.setRowMode;
	protected readonly updateCompilationRowTitle =
		this.compilationFlow.updateRowTitle;
	protected readonly pickCompilationRowGame =
		this.compilationFlow.pickRowGame;
	protected readonly clearCompilationRowGame =
		this.compilationFlow.clearRowGame;
	protected readonly submitCompilation = this.compilationFlow.submit;
	protected readonly clearCompilation = this.compilationFlow.clear;
	protected readonly previewSlug = previewSlug;

	protected readonly newScoreSource = signal("");
	protected readonly newScoreValue = signal<number | null>(null);
	protected readonly newTimeSource = signal("");
	protected readonly newTimeValue = signal<number | null>(null);

	private readonly scoreSourcesService = inject(ScoreSourcesService);
	protected readonly timeSources = ["hltb", "rawg"];

	protected readonly scoreErrors = computed(() =>
		this.scores().map(entry =>
			this.scoreErrorFor(entry.source, entry.score)
		)
	);
	protected readonly timeErrors = computed(() =>
		this.times().map(entry => this.durationErrorFor(entry.duration))
	);
	protected readonly newScoreError = computed(() => {
		const value = this.newScoreValue();
		return value === null
			? null
			: this.scoreErrorFor(this.newScoreSource(), value);
	});
	protected readonly newTimeError = computed(() => {
		const value = this.newTimeValue();
		return value === null ? null : this.durationErrorFor(value);
	});
	private readonly hasInvalidValues = computed(
		() =>
			this.scoreErrors().some(Boolean) || this.timeErrors().some(Boolean)
	);

	ngOnInit() {
		this.scoreSourcesService.load();
		this.loadSelects();
		const g = this.game();
		if (g) this.populateFromGame(g);
	}

	private loadSelects() {
		forkJoin([
			this.gamesService.getPlatforms(),
			this.gamesService.getGenres(),
			this.franchisesService.getFranchises({
				limit: FRANCHISES_PAGE_SIZE
			})
		])
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(([platforms, genres, franchises]) => {
				this.allPlatforms.set(platforms);
				this.allGenres.set(genres);
				this.allFranchises.set(franchises.franchises);
			});
	}

	private populateFromGame(g: Game) {
		this.model.update(m => ({
			...m,
			title: g.title,
			description: g.description ?? "",
			releaseAt: g.releaseAt ?? "",
			backgroundUrl: g.backgroundUrl ?? "",
			isDlc: g.isDlc,
			variant: g.variant ?? "",
			hltbId: externalIdOf(g, "hltb"),
			metacriticSlug: externalIdOf(g, "metacritic")
		}));
		this.selectedPlatforms.set(new Set(g.platforms.map(p => p.code)));
		this.selectedGenres.set(new Set(g.genres.map(ge => ge.code)));
		this.selectedFranchiseId.set(g.franchise?.id ?? "");
		this.parentGame.set(g.parentGame ?? null);
		this.scores.set(g.scores.map(s => ({ ...s })));
		this.times.set(g.times.map(t => ({ ...t })));
	}

	pickParentGame(picked: Game) {
		if (picked.id === this.game()?.id) return;
		this.parentGame.set(picked);
		this.parentCleared.set(false);
		this.parentFocus.set("selected");
	}

	clearParentGame() {
		if (this.parentGame()) this.parentCleared.set(true);
		this.parentGame.set(null);
		this.parentFocus.set("search");
	}

	setLookupSource(source: OnlineSearchSource) {
		if (source === this.lookupSource()) return;
		this.lookupSource.set(source);
		this.cancelLookup();
		this.lookupError.set("");
	}

	private cancelLookup() {
		this.lookupRequest?.subscription.unsubscribe();
		this.lookupRequest = null;
		this.fetchingLookup.set(false);
	}

	fetchLookup() {
		const source = this.lookupSource();
		const slug = this.lookupSlug().trim();
		if (!slug) return;
		if (
			this.lookupRequest?.source === source &&
			this.lookupRequest.slug === slug
		)
			return;

		this.lookupRequest?.subscription.unsubscribe();
		this.fetchingLookup.set(true);
		this.lookupError.set("");

		const subscription = this.gamesService
			.externalGameBySlug(source, slug)
			.subscribe({
				next: detail => {
					this.lookupRequest = null;
					this.applyLookupData(detail);
				},
				error: (err: { status?: number }) => {
					this.lookupRequest = null;
					this.lookupError.set(
						this.lookupFailureMessage(source, err)
					);
					this.fetchingLookup.set(false);
				}
			});
		this.lookupRequest = { source, slug, subscription };
	}

	private lookupFailureMessage(
		source: OnlineSearchSource,
		err: { status?: number }
	) {
		const label = LOOKUP_SOURCE_LABELS[source];
		if (err.status === NOT_FOUND_STATUS)
			return `Game not found on ${label}`;
		if (err.status === SERVICE_UNAVAILABLE_STATUS)
			return `${label} is not available right now`;
		return `Couldn't reach ${label} right now. Try again in a moment.`;
	}

	private applyLookupData(detail: ExternalGameDetail) {
		this.appliedLookup.set({
			source: detail.source,
			externalId: detail.externalId
		});
		if (detail.coverUrl) this.fetchedCoverUrl = detail.coverUrl;
		this.model.update(m => ({
			...m,
			title: detail.title,
			description: detail.description ?? "",
			releaseAt: detail.releaseAt ?? "",
			backgroundUrl: detail.backgroundUrl ?? ""
		}));

		if (detail.platforms.length > 0) {
			this.selectedPlatforms.set(new Set(detail.platforms));
		}
		if (detail.genres.length > 0) {
			this.selectedGenres.set(new Set(detail.genres));
		}

		this.mergeScores(detail.scores);
		this.mergeTimes(detail.times);

		this.fetchingLookup.set(false);
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

	setPlatforms(codes: readonly string[]) {
		this.selectedPlatforms.set(new Set(codes));
	}

	setGenres(codes: readonly string[]) {
		this.selectedGenres.set(new Set(codes));
	}

	setDlc(isDlc: boolean) {
		this.form.isDlc().value.set(isDlc);
	}

	removeScore(index: number) {
		const current = [...this.scores()];
		current.splice(index, 1);
		this.scores.set(current);
	}

	protected scaleOf(source: string) {
		return this.scoreSourcesService.getScale(source);
	}

	private scoreErrorFor(source: string, score: number) {
		if (!Number.isFinite(score) || score < 0)
			return "Score can't be negative.";
		const scale = source ? this.scaleOf(source) : null;
		if (scale !== null && score > scale)
			return `Score can't be above ${scale} for ${source}.`;
		return null;
	}

	private durationErrorFor(duration: number) {
		return Number.isFinite(duration) && duration > 0
			? null
			: "Duration must be greater than 0.";
	}

	addScore() {
		const source = this.newScoreSource();
		const score = this.newScoreValue();
		if (!source || score === null || this.newScoreError()) return;
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
		if (!source || duration === null || this.newTimeError()) return;
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

	private savedExternalId(source: ManualExternalSource) {
		const g = this.game();
		return g ? externalIdOf(g, source) : "";
	}

	private visibleFieldError(field: {
		touched: () => boolean;
		errors: () => readonly { message?: string }[];
	}) {
		if (!field.touched()) return null;
		return field.errors()[0]?.message ?? null;
	}

	normalizeHltbIdField() {
		const normalized = this.normalizedHltbId();
		if (normalized && normalized !== this.form.hltbId().value())
			this.form.hltbId().value.set(normalized);
	}

	normalizeMetacriticSlugField() {
		const normalized = this.normalizedMetacriticSlug();
		if (normalized && normalized !== this.form.metacriticSlug().value())
			this.form.metacriticSlug().value.set(normalized);
	}

	private externalIdsToSend() {
		const externalIds: { source: string; externalId: string }[] = [];
		const applied = this.appliedLookup();
		if (applied) externalIds.push({ ...applied });
		const manualIds: [ManualExternalSource, string | null][] = [
			["hltb", this.normalizedHltbId()],
			["metacritic", this.normalizedMetacriticSlug()]
		];
		for (const [source, externalId] of manualIds) {
			if (externalId && externalId !== this.savedExternalId(source))
				externalIds.push({ source, externalId });
		}
		return externalIds;
	}

	save() {
		if (this.saving()) return;
		if (this.hasInvalidExternalIds()) {
			this.form.hltbId().markAsTouched();
			this.form.metacriticSlug().markAsTouched();
			this.saveError.set(
				"Fix the highlighted external IDs before saving."
			);
			return;
		}
		if (this.hasInvalidValues()) {
			this.saveError.set(
				"Fix the highlighted scores and durations before saving."
			);
			return;
		}
		this.saving.set(true);
		this.saveError.set("");

		if (this.isEditMode()) {
			this.doUpdate();
		} else {
			this.doCreate();
		}
	}

	private saveFailureMessage(
		err: { status?: number },
		rateLimitMessage: string,
		fallback: string
	) {
		if (err.status === 429) return rateLimitMessage;
		return adminErrorMessage(err) ?? fallback;
	}

	private doCreate() {
		const variantValue = this.variant().trim();
		const dto: CreateGameDto = {
			title: this.title().trim(),
			description: this.description() || undefined,
			releaseAt: this.releaseAt() || undefined,
			coverUrl: this.fetchedCoverUrl ?? undefined,
			backgroundUrl: this.backgroundUrl() || undefined,
			isDlc: this.isDlc(),
			variant: variantValue || undefined,
			platforms: [...this.selectedPlatforms()],
			genres: [...this.selectedGenres()],
			scores: this.scores(),
			times: this.times()
		};

		const parent = this.parentGame();
		if (this.isDlc() && parent) {
			dto.parentGameId = parent.id;
		}

		const externalIds = this.externalIdsToSend();
		if (externalIds.length > 0) dto.externalIds = externalIds;

		this.gamesService
			.createGame(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: game => {
					this.saving.set(false);
					this.created.emit(game);
				},
				error: err => {
					this.saving.set(false);
					this.saveError.set(
						isVariantRequiredError(err)
							? createVariantRequiredMessage(variantValue)
							: this.saveFailureMessage(
									err,
									"Rate limit reached. Game was NOT created. Try again in a moment.",
									"Failed to create game."
								)
					);
				}
			});
	}

	private doUpdate() {
		const g = this.game()!;
		const variantTrim = this.variant().trim();
		const dto: UpdateGameDto = {
			title: this.title().trim(),
			description: this.description() || undefined,
			releaseAt: this.releaseAt() || undefined,
			coverUrl: this.fetchedCoverUrl ?? undefined,
			backgroundUrl: this.backgroundUrl() || undefined,
			isDlc: this.isDlc(),
			variant: variantTrim ? variantTrim : null,
			platforms: [...this.selectedPlatforms()],
			genres: [...this.selectedGenres()],
			franchiseId: this.selectedFranchiseId() || null
		};

		const parent = this.parentGame();
		if (this.isDlc() && parent) dto.parentGameId = parent.id;
		else if (this.isDlc() && this.parentCleared()) dto.parentGameId = null;

		const externalIds = this.externalIdsToSend();
		if (externalIds.length > 0) dto.externalIds = externalIds;

		this.gamesService
			.updateGame(g.id, dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => this.saveScoresAndTimes(g.id),
				error: err => {
					this.saving.set(false);
					this.saveError.set(
						this.saveFailureMessage(
							err,
							"Rate limit reached. Changes were NOT saved. Try again in a moment.",
							"Failed to update game."
						)
					);
				}
			});
	}

	private saveScoresAndTimes(gameId: string) {
		const g = this.game()!;
		const requests = [];

		if (this.scoresChanged(g.scores)) {
			requests.push(
				this.gamesService.replaceScores(
					gameId,
					this.scores().map(({ source, score }) => ({
						source,
						score
					}))
				)
			);
		}

		if (this.timesChanged(g.times)) {
			requests.push(
				this.gamesService.replaceTimes(
					gameId,
					this.times().map(({ source, duration }) => ({
						source,
						duration
					}))
				)
			);
		}

		if (requests.length === 0) {
			this.saving.set(false);
			this.toast.success("Game saved.");
			this.saved.emit();
			return;
		}

		forkJoin(requests)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
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
						const reason = adminErrorMessage(err);
						this.saveError.set(
							reason
								? `Game info saved, but scores/times were not: ${reason}`
								: "Game updated but some scores/times failed to save."
						);
					}
				}
			});
	}

	private scoresChanged(original: { source: string; score: number }[]) {
		const current = this.scores();
		if (current.length !== original.length) return true;
		const originalBySource = new Map(
			original.map(s => [s.source, s.score])
		);
		return current.some(s => originalBySource.get(s.source) !== s.score);
	}

	private timesChanged(original: { source: string; duration: number }[]) {
		const current = this.times();
		if (current.length !== original.length) return true;
		const originalBySource = new Map(
			original.map(t => [t.source, t.duration])
		);
		return current.some(t => originalBySource.get(t.source) !== t.duration);
	}

	protected readonly availableScoreSources = computed<UiPickerOption[]>(
		() => {
			const used = new Set(this.scores().map(s => s.source));
			return this.scoreSourcesService
				.manualSources()
				.filter(source => !used.has(source.code))
				.map(source => ({
					value: source.code,
					label: source.code,
					icon: "star_outline"
				}));
		}
	);

	protected readonly availableTimeSources = computed<UiPickerOption[]>(() => {
		const used = new Set(this.times().map(t => t.source));
		return this.timeSources
			.filter(source => !used.has(source))
			.map(source => ({
				value: source,
				label: source,
				icon: "schedule"
			}));
	});
}

function externalIdOf(game: Game, source: ManualExternalSource) {
	return (
		game.externalLinks?.find(link => link.source === source)?.externalId ??
		""
	);
}

function isVariantRequiredError(err: { error?: { type?: unknown } }) {
	return err.error?.type === "GAME_VARIANT_REQUIRED";
}

function createVariantRequiredMessage(variant: string) {
	return variant
		? CREATE_SIBLING_VARIANT_MISSING_MESSAGE
		: CREATE_VARIANT_MISSING_MESSAGE;
}
