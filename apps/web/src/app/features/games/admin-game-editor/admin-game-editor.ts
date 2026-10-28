import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	type OnInit,
	output,
	signal
} from "@angular/core";
import { form, FormField, maxLength } from "@angular/forms/signals";
import { forkJoin, type Subscription } from "rxjs";

import {
	type Game,
	type GameSummary,
	type Genre,
	type Platform
} from "../../../core/models";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiIconButton,
	UiInput,
	UiSelect,
	UiTextarea
} from "../../../shared/ui";
import { type Franchise, FranchisesService } from "../../franchises/franchises";
import {
	type CompilationItemInput,
	type CreateGameDto,
	GamesService,
	type RawgDetail,
	type UpdateGameDto
} from "../games";

type CompilationRowMode = "link" | "create";

const DIACRITICS = /\p{Diacritic}/gu;

let nextCompilationRowId = 0;

interface CompilationRow {
	id: string;
	mode: CompilationRowMode;
	title: string;
	linkedGame: Game | null;
	searchQuery: string;
	searching: boolean;
	searchResults: Game[];
}

@Component({
	selector: "app-admin-game-editor",
	imports: [
		FormField,
		UiAlert,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiIconButton,
		UiInput,
		UiSelect,
		UiTextarea
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

	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly allGenres = signal<Genre[]>([]);
	protected readonly allFranchises = signal<Franchise[]>([]);
	protected readonly selectedFranchiseId = signal<string>("");

	protected readonly model = signal({
		rawgSlug: "",
		title: "",
		description: "",
		releaseAt: "",
		backgroundUrl: "",
		isDlc: false,
		variant: "",
		parentSlug: ""
	});
	readonly form = form(this.model, path => {
		maxLength(path.variant, 100);
	});
	protected readonly rawgSlug = computed(() => this.form.rawgSlug().value());
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
	protected readonly parentSlug = computed(() =>
		this.form.parentSlug().value()
	);

	protected readonly fetchingRawg = signal(false);
	protected readonly rawgError = signal("");
	protected readonly rawgId = signal<number | null>(null);
	private rawgRequest: { slug: string; subscription: Subscription } | null =
		null;
	private parentRequest: {
		slug: string;
		subscription: Subscription;
	} | null = null;
	private readonly compilationSearches = new Map<string, Subscription>();

	protected readonly parentGame = signal<GameSummary | null>(null);
	private readonly parentCleared = signal(false);
	protected readonly fetchingParent = signal(false);
	protected readonly parentError = signal("");
	protected readonly selectedPlatforms = signal<Set<string>>(new Set());
	protected readonly selectedGenres = signal<Set<string>>(new Set());
	protected readonly scores = signal<{ source: string; score: number }[]>([]);
	protected readonly times = signal<{ source: string; duration: number }[]>(
		[]
	);

	protected readonly saving = signal(false);
	protected readonly saveError = signal("");

	protected readonly splitOpen = signal(false);
	protected readonly splitting = signal(false);
	protected readonly splitError = signal("");
	protected readonly splitVariants = signal<
		{ title: string; variant: string }[]
	>([
		{ title: "", variant: "" },
		{ title: "", variant: "" }
	]);

	protected readonly compilationOpen = signal(false);
	protected readonly compilationSaving = signal(false);
	protected readonly compilationClearing = signal(false);
	protected readonly compilationError = signal("");
	protected readonly compilationRows = signal<CompilationRow[]>([]);

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
			this.franchisesService.getFranchises({ limit: 100 })
		]).subscribe(([platforms, genres, franchises]) => {
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
			variant: g.variant ?? ""
		}));
		this.selectedPlatforms.set(new Set(g.platforms.map(p => p.code)));
		this.selectedGenres.set(new Set(g.genres.map(ge => ge.code)));
		this.selectedFranchiseId.set(g.franchise?.id ?? "");
		this.parentGame.set(g.parentGame ?? null);
		this.scores.set(g.scores.map(s => ({ ...s })));
		this.times.set(g.times.map(t => ({ ...t })));
	}

	fetchParentGame() {
		const slug = this.parentSlug().trim();
		if (!slug || this.parentRequest?.slug === slug) return;
		if (slug.toLowerCase() === this.game()?.code) {
			this.parentError.set("A game can't be its own parent.");
			return;
		}

		this.parentRequest?.subscription.unsubscribe();
		this.fetchingParent.set(true);
		this.parentError.set("");

		const subscription = this.gamesService.getByCode(slug).subscribe({
			next: game => {
				this.parentRequest = null;
				this.fetchingParent.set(false);
				if (game.id === this.game()?.id) {
					this.parentError.set("A game can't be its own parent.");
					return;
				}
				this.parentGame.set(game);
				this.parentCleared.set(false);
			},
			error: () => {
				this.parentRequest = null;
				this.parentError.set("Game not found");
				this.fetchingParent.set(false);
			}
		});
		this.parentRequest = { slug, subscription };
	}

	clearParentGame() {
		this.parentRequest?.subscription.unsubscribe();
		this.parentRequest = null;
		this.fetchingParent.set(false);
		if (this.parentGame()) this.parentCleared.set(true);
		this.parentGame.set(null);
		this.model.update(m => ({ ...m, parentSlug: "" }));
		this.parentError.set("");
	}

	fetchRawg() {
		const slug = this.rawgSlug().trim();
		if (!slug || this.rawgRequest?.slug === slug) return;

		this.rawgRequest?.subscription.unsubscribe();
		this.fetchingRawg.set(true);
		this.rawgError.set("");

		const subscription = this.gamesService.rawgBySlug(slug).subscribe({
			next: detail => {
				this.rawgRequest = null;
				this.applyRawgData(detail);
			},
			error: () => {
				this.rawgRequest = null;
				this.rawgError.set("Game not found on RAWG");
				this.fetchingRawg.set(false);
			}
		});
		this.rawgRequest = { slug, subscription };
	}

	private applyRawgData(detail: RawgDetail) {
		this.rawgId.set(detail.rawgId);
		this.model.update(m => ({
			...m,
			title: detail.title,
			description: detail.description ?? "",
			releaseAt: detail.releaseAt ?? "",
			backgroundUrl: detail.coverUrl ?? ""
		}));

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

	save() {
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
				this.saveError.set(
					this.saveFailureMessage(
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

		if (this.rawgId()) {
			dto.externalIds = [
				{ source: "rawg", externalId: String(this.rawgId()) }
			];
		}

		this.gamesService.updateGame(g.id, dto).subscribe({
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

		forkJoin(requests).subscribe({
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

	openSplitModal() {
		const g = this.game();
		if (!g || this.splitOpen()) return;
		this.splitError.set("");
		this.splitVariants.set([
			{ title: g.title, variant: g.variant ?? "" },
			{ title: "", variant: "" }
		]);
		this.splitOpen.set(true);
	}

	closeSplitModal() {
		if (this.splitting()) return;
		this.splitOpen.set(false);
	}

	addSplitVariant() {
		if (this.splitVariants().length >= 10) return;
		this.splitError.set("");
		this.splitVariants.update(arr => [...arr, { title: "", variant: "" }]);
	}

	removeSplitVariant(index: number) {
		if (this.splitVariants().length <= 2) return;
		this.splitError.set("");
		this.splitVariants.update(arr => arr.filter((_, i) => i !== index));
	}

	updateSplitVariantTitle(index: number, value: string) {
		this.splitError.set("");
		this.splitVariants.update(arr =>
			arr.map((v, i) => (i === index ? { ...v, title: value } : v))
		);
	}

	updateSplitVariantLabel(index: number, value: string) {
		this.splitError.set("");
		this.splitVariants.update(arr =>
			arr.map((v, i) => (i === index ? { ...v, variant: value } : v))
		);
	}

	submitSplit() {
		const g = this.game();
		if (!g) return;
		const cleaned = this.splitVariants().map(v => ({
			title: v.title.trim(),
			variant: v.variant.trim()
		}));
		if (cleaned.some(v => !v.title || !v.variant)) {
			this.splitError.set(
				"All variants need a title and a variant label."
			);
			return;
		}
		if (cleaned.some(v => !this.previewSlug(v.title))) {
			this.splitError.set(
				"Variant titles need letters or numbers to build a slug."
			);
			return;
		}
		const titles = new Set(cleaned.map(v => this.previewSlug(v.title)));
		if (titles.size !== cleaned.length) {
			this.splitError.set("Variant titles must be unique.");
			return;
		}
		const labels = new Set(cleaned.map(v => v.variant.toLowerCase()));
		if (labels.size !== cleaned.length) {
			this.splitError.set("Variant labels must be unique.");
			return;
		}

		this.splitting.set(true);
		this.splitError.set("");

		this.gamesService.splitGame(g.id, { variants: cleaned }).subscribe({
			next: games => {
				this.splitting.set(false);
				this.splitOpen.set(false);
				if (games.length > 0) {
					this.toast.success(`Split into ${games.length} variants.`);
					this.split.emit(games[0]);
				}
			},
			error: err => {
				this.splitting.set(false);
				if (err.status === 429) {
					this.splitError.set(
						"Rate limit reached. Split was NOT applied. Try again in a moment."
					);
				} else if (err?.error?.type === "GAME_UNIQUE_CONSTRAINT") {
					this.splitError.set(
						"A target title produces a slug already used by another game, possibly an inactive one. Use unique titles."
					);
				} else if (err?.error?.type === "GAME_SPLIT_INVALID") {
					this.splitError.set("Invalid split request.");
				} else {
					this.splitError.set("Failed to split the game.");
				}
			}
		});
	}

	openCompilationModal() {
		const g = this.game();
		if (!g || this.compilationOpen()) return;
		this.cancelAllCompilationSearches();
		this.compilationError.set("");
		const existing = (g.compilationItems ?? [])
			.filter(item => item.game)
			.map(item => ({
				...this.makeEmptyCompilationRow("link"),
				linkedGame: {
					id: item.game!.id,
					title: item.game!.title,
					code: item.game!.code,
					backgroundUrl: item.game!.backgroundUrl
				} as Game
			}));
		this.compilationRows.set(
			existing.length > 0
				? existing
				: [
						this.makeEmptyCompilationRow("link"),
						this.makeEmptyCompilationRow("link")
					]
		);
		this.compilationOpen.set(true);
	}

	closeCompilationModal() {
		if (this.compilationSaving() || this.compilationClearing()) return;
		this.cancelAllCompilationSearches();
		this.compilationOpen.set(false);
	}

	private makeEmptyCompilationRow(mode: CompilationRowMode): CompilationRow {
		return {
			id: `compilation-row-${nextCompilationRowId++}`,
			mode,
			title: "",
			linkedGame: null,
			searchQuery: "",
			searching: false,
			searchResults: []
		};
	}

	private cancelCompilationSearch(rowId: string) {
		this.compilationSearches.get(rowId)?.unsubscribe();
		this.compilationSearches.delete(rowId);
	}

	private cancelAllCompilationSearches() {
		this.compilationSearches.forEach(search => search.unsubscribe());
		this.compilationSearches.clear();
	}

	private patchCompilationRow(rowId: string, patch: Partial<CompilationRow>) {
		this.compilationRows.update(rows =>
			rows.map(r => (r.id === rowId ? { ...r, ...patch } : r))
		);
	}

	addCompilationRow() {
		if (this.compilationRows().length >= 50) return;
		this.compilationError.set("");
		this.compilationRows.update(rows => [
			...rows,
			this.makeEmptyCompilationRow("link")
		]);
	}

	removeCompilationRow(index: number) {
		const row = this.compilationRows()[index];
		if (!row || this.compilationRows().length <= 1) return;
		this.compilationError.set("");
		this.cancelCompilationSearch(row.id);
		this.compilationRows.update(rows => rows.filter(r => r.id !== row.id));
	}

	setCompilationRowMode(index: number, mode: CompilationRowMode) {
		const row = this.compilationRows()[index];
		if (!row) return;
		this.compilationError.set("");
		this.cancelCompilationSearch(row.id);
		this.patchCompilationRow(row.id, {
			mode,
			title: "",
			linkedGame: null,
			searchQuery: "",
			searching: false,
			searchResults: []
		});
	}

	updateCompilationRowTitle(index: number, value: string) {
		const row = this.compilationRows()[index];
		if (!row) return;
		this.compilationError.set("");
		this.patchCompilationRow(row.id, { title: value });
	}

	updateCompilationRowQuery(index: number, value: string) {
		const row = this.compilationRows()[index];
		if (!row) return;
		this.compilationError.set("");
		this.cancelCompilationSearch(row.id);
		const trimmed = value.trim();
		if (trimmed.length < 2) {
			this.patchCompilationRow(row.id, {
				searchQuery: value,
				linkedGame: null,
				searchResults: [],
				searching: false
			});
			return;
		}
		this.patchCompilationRow(row.id, {
			searchQuery: value,
			linkedGame: null,
			searching: true
		});
		const ownId = this.game()?.id;
		const search = this.gamesService.searchLocal(trimmed).subscribe({
			next: games => {
				this.compilationSearches.delete(row.id);
				this.patchCompilationRow(row.id, {
					searching: false,
					searchResults: games
						.filter(found => found.id !== ownId)
						.slice(0, 8)
				});
			},
			error: () => {
				this.compilationSearches.delete(row.id);
				this.patchCompilationRow(row.id, {
					searching: false,
					searchResults: []
				});
			}
		});
		this.compilationSearches.set(row.id, search);
	}

	pickCompilationRowGame(index: number, picked: Game) {
		const row = this.compilationRows()[index];
		if (!row) return;
		this.compilationError.set("");
		this.cancelCompilationSearch(row.id);
		this.patchCompilationRow(row.id, {
			linkedGame: picked,
			searchQuery: picked.title,
			searching: false,
			searchResults: []
		});
	}

	clearCompilationRowGame(index: number) {
		const row = this.compilationRows()[index];
		if (!row) return;
		this.compilationError.set("");
		this.patchCompilationRow(row.id, {
			linkedGame: null,
			searchQuery: "",
			searchResults: []
		});
	}

	previewSlug(title: string): string {
		return title
			.normalize("NFD")
			.replace(DIACRITICS, "")
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	submitCompilation() {
		const g = this.game();
		if (!g) return;
		const rows = this.compilationRows();
		const items: CompilationItemInput[] = [];
		for (const row of rows) {
			if (row.mode === "link") {
				if (!row.linkedGame) {
					this.compilationError.set(
						"All linked rows must have a selected game."
					);
					return;
				}
				if (row.linkedGame.id === g.id) {
					this.compilationError.set(
						"A compilation can't contain itself."
					);
					return;
				}
				items.push({ mode: "link", gameId: row.linkedGame.id });
			} else {
				const title = row.title.trim();
				if (!title) {
					this.compilationError.set(
						"All create rows must have a title."
					);
					return;
				}
				if (!this.previewSlug(title)) {
					this.compilationError.set(
						"Created titles need letters or numbers to build a slug."
					);
					return;
				}
				items.push({ mode: "create", title });
			}
		}
		const linkedIds = items
			.filter(i => i.mode === "link")
			.map(i => (i as { gameId: string }).gameId);
		if (new Set(linkedIds).size !== linkedIds.length) {
			this.compilationError.set("Linked games must be unique.");
			return;
		}
		const createSlugs = items
			.filter(i => i.mode === "create")
			.map(i => this.previewSlug((i as { title: string }).title));
		if (new Set(createSlugs).size !== createSlugs.length) {
			this.compilationError.set(
				"Created titles must produce unique slugs."
			);
			return;
		}

		this.cancelAllCompilationSearches();
		this.compilationSaving.set(true);
		this.compilationError.set("");

		this.gamesService.setCompilationItems(g.id, { items }).subscribe({
			next: () => {
				this.compilationSaving.set(false);
				this.compilationOpen.set(false);
				this.toast.success("Compilation saved.");
				this.saved.emit();
			},
			error: err => {
				this.compilationSaving.set(false);
				if (err.status === 429) {
					this.compilationError.set(
						"Rate limit reached. Compilation was NOT saved. Try again in a moment."
					);
				} else if (err?.error?.type === "GAME_UNIQUE_CONSTRAINT") {
					this.compilationError.set(
						"A new title collides with an existing game code."
					);
				} else if (err?.error?.type === "GAME_COMPILATION_INVALID") {
					this.compilationError.set(
						"Invalid compilation: duplicates or self-reference."
					);
				} else if (err?.error?.type === "GAME_NOT_FOUND") {
					this.compilationError.set(
						"Parent or a linked game not found."
					);
				} else {
					this.compilationError.set("Failed to save compilation.");
				}
			}
		});
	}

	clearCompilation() {
		const g = this.game();
		if (!g) return;
		if (this.compilationClearing()) return;
		this.compilationClearing.set(true);
		this.compilationError.set("");
		this.gamesService.clearCompilation(g.id).subscribe({
			next: () => {
				this.compilationClearing.set(false);
				this.compilationOpen.set(false);
				this.toast.success("Compilation cleared.");
				this.saved.emit();
			},
			error: () => {
				this.compilationClearing.set(false);
				this.compilationError.set("Failed to clear compilation.");
			}
		});
	}

	protected get availableScoreSources() {
		const used = new Set(this.scores().map(s => s.source));
		return this.scoreSourcesService
			.manualSources()
			.map(source => source.code)
			.filter(code => !used.has(code));
	}

	protected get availableTimeSources() {
		const used = new Set(this.times().map(t => t.source));
		return this.timeSources.filter(s => !used.has(s));
	}
}
