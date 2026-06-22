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
	CompilationItemInput,
	CreateGameDto,
	GamesService,
	RawgDetail,
	UpdateGameDto
} from "../games.service";
import { forkJoin } from "rxjs";
import { ToastService } from "../../../core/services/toast.service";
import { UiSelect, UiTextarea } from "../../../shared/ui";

type CompilationRowMode = "link" | "create";

interface CompilationRow {
	mode: CompilationRowMode;
	title: string;
	linkedGame: Game | null;
	searchQuery: string;
	searching: boolean;
	searchResults: Game[];
}

@Component({
	selector: "app-admin-game-editor",
	imports: [FormsModule, UiSelect, UiTextarea],
	templateUrl: "./admin-game-editor.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGameEditor implements OnInit {
	game = input<Game | null>(null);
	saved = output<void>();
	created = output<Game>();
	split = output<Game>();

	protected readonly isEditMode = computed(() => !!this.game());

	private readonly gamesService = inject(GamesService);
	private readonly toast = inject(ToastService);

	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly allGenres = signal<Genre[]>([]);

	protected readonly rawgSlug = signal("");
	protected readonly fetchingRawg = signal(false);
	protected readonly rawgError = signal("");
	protected readonly rawgId = signal<number | null>(null);

	protected readonly title = signal("");
	protected readonly description = signal("");
	protected readonly releaseAt = signal("");
	protected readonly backgroundUrl = signal("");
	protected readonly isDlc = signal(false);
	protected readonly variant = signal("");
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
		this.variant.set(g.variant ?? "");
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
		const variantValue = this.variant().trim();
		const dto: CreateGameDto = {
			title: this.title(),
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
				if (err.status === 429) {
					this.saveError.set(
						"Rate limit reached. Game was NOT created. Try again in a moment."
					);
				} else if (err?.error?.type === "GAME_VARIANT_REQUIRED") {
					this.saveError.set(
						"Another game shares this external id. Set a variant label on both games."
					);
				} else {
					this.saveError.set("Failed to create game.");
				}
			}
		});
	}

	private doUpdate() {
		const g = this.game()!;
		const variantTrim = this.variant().trim();
		const dto: UpdateGameDto = {
			title: this.title(),
			description: this.description() || undefined,
			releaseAt: this.releaseAt() || undefined,
			backgroundUrl: this.backgroundUrl() || undefined,
			isDlc: this.isDlc(),
			variant: variantTrim ? variantTrim : null,
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
				} else if (err?.error?.type === "GAME_VARIANT_REQUIRED") {
					this.saveError.set(
						"Another game shares this external id. Set a variant label on both games."
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

	openSplitModal() {
		const g = this.game();
		if (!g) return;
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
		this.splitVariants.update(arr => [...arr, { title: "", variant: "" }]);
	}

	removeSplitVariant(index: number) {
		if (this.splitVariants().length <= 2) return;
		this.splitVariants.update(arr => arr.filter((_, i) => i !== index));
	}

	updateSplitVariantTitle(index: number, value: string) {
		this.splitVariants.update(arr =>
			arr.map((v, i) => (i === index ? { ...v, title: value } : v))
		);
	}

	updateSplitVariantLabel(index: number, value: string) {
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
			this.splitError.set("All variants need a title and a variant label.");
			return;
		}
		const titles = new Set(cleaned.map(v => v.title.toLowerCase()));
		if (titles.size !== cleaned.length) {
			this.splitError.set("Variant titles must be unique.");
			return;
		}

		this.splitting.set(true);
		this.splitError.set("");

		this.gamesService.splitGame(g.id, { variants: cleaned }).subscribe({
			next: games => {
				this.splitting.set(false);
				this.splitOpen.set(false);
				if (games.length > 0) {
					this.toast.success(
						`Split into ${games.length} variants.`
					);
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
						"A target title collides with an existing game. Use unique titles."
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
		if (!g) return;
		this.compilationError.set("");
		const existing = (g.compilationItems ?? [])
			.filter(item => item.game)
			.map(item => ({
				mode: "link" as CompilationRowMode,
				title: "",
				linkedGame: {
					id: item.game!.id,
					title: item.game!.title,
					code: item.game!.code,
					backgroundUrl: item.game!.backgroundUrl
				} as Game,
				searchQuery: "",
				searching: false,
				searchResults: []
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
		this.compilationOpen.set(false);
	}

	private makeEmptyCompilationRow(mode: CompilationRowMode): CompilationRow {
		return {
			mode,
			title: "",
			linkedGame: null,
			searchQuery: "",
			searching: false,
			searchResults: []
		};
	}

	addCompilationRow() {
		if (this.compilationRows().length >= 50) return;
		this.compilationRows.update(rows => [
			...rows,
			this.makeEmptyCompilationRow("link")
		]);
	}

	removeCompilationRow(index: number) {
		if (this.compilationRows().length <= 1) return;
		this.compilationRows.update(rows => rows.filter((_, i) => i !== index));
	}

	setCompilationRowMode(index: number, mode: CompilationRowMode) {
		this.compilationRows.update(rows =>
			rows.map((r, i) =>
				i === index
					? {
							...r,
							mode,
							title: "",
							linkedGame: null,
							searchQuery: "",
							searchResults: []
						}
					: r
			)
		);
	}

	updateCompilationRowTitle(index: number, value: string) {
		this.compilationRows.update(rows =>
			rows.map((r, i) => (i === index ? { ...r, title: value } : r))
		);
	}

	updateCompilationRowQuery(index: number, value: string) {
		this.compilationRows.update(rows =>
			rows.map((r, i) =>
				i === index ? { ...r, searchQuery: value, linkedGame: null } : r
			)
		);
		const trimmed = value.trim();
		if (trimmed.length < 2) {
			this.compilationRows.update(rows =>
				rows.map((r, i) =>
					i === index
						? { ...r, searchResults: [], searching: false }
						: r
				)
			);
			return;
		}
		this.compilationRows.update(rows =>
			rows.map((r, i) => (i === index ? { ...r, searching: true } : r))
		);
		this.gamesService.searchLocal(trimmed).subscribe({
			next: games => {
				this.compilationRows.update(rows =>
					rows.map((r, i) =>
						i === index
							? {
									...r,
									searching: false,
									searchResults: games.slice(0, 8)
								}
							: r
					)
				);
			},
			error: () => {
				this.compilationRows.update(rows =>
					rows.map((r, i) =>
						i === index
							? { ...r, searching: false, searchResults: [] }
							: r
					)
				);
			}
		});
	}

	pickCompilationRowGame(index: number, picked: Game) {
		this.compilationRows.update(rows =>
			rows.map((r, i) =>
				i === index
					? {
							...r,
							linkedGame: picked,
							searchQuery: picked.title,
							searchResults: []
						}
					: r
			)
		);
	}

	clearCompilationRowGame(index: number) {
		this.compilationRows.update(rows =>
			rows.map((r, i) =>
				i === index
					? {
							...r,
							linkedGame: null,
							searchQuery: "",
							searchResults: []
						}
					: r
			)
		);
	}

	previewSlug(title: string): string {
		return title
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
				items.push({ mode: "link", gameId: row.linkedGame.id });
			} else {
				const title = row.title.trim();
				if (!title) {
					this.compilationError.set(
						"All create rows must have a title."
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
			this.compilationError.set("Created titles must produce unique slugs.");
			return;
		}

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
					this.compilationError.set("Parent or a linked game not found.");
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
		return this.scoreSources.filter(s => !used.has(s));
	}

	protected get availableTimeSources() {
		const used = new Set(this.times().map(t => t.source));
		return this.timeSources.filter(s => !used.has(s));
	}
}
