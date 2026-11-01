import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router, RouterLink } from "@angular/router";
import { catchError, debounceTime, of, Subject, switchMap } from "rxjs";

import { type Game } from "../../../core/models";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import { ChipGroup } from "../../../shared/components/chip-group/chip-group";
import { type ChipOption } from "../../../shared/components/chip-group/chip-group.model";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { SegmentedControl } from "../../../shared/components/segmented-control/segmented-control";
import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control.model";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiEmptyState,
	UiIconButton,
	UiNoMatches,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { AdminGameEditor } from "../../games/admin-game-editor/admin-game-editor";
import { GamesService } from "../../games/games";
import {
	type ExternalDataRefreshResponse,
	type ExternalDataSource,
	type GamesQuery
} from "../../games/games.model";
import { AdminExternalDataDialog } from "../admin-external-data-dialog/admin-external-data-dialog";
import { type ExternalDataRefreshState } from "../admin-external-data-dialog/admin-external-data-dialog.model";
import { externalDataRefreshErrorMessage } from "../admin-external-data-dialog/external-data-refresh-error";
import { ReportsService } from "../services/reports.service";

@Component({
	selector: "app-admin-games",
	imports: [
		RouterLink,
		AdminExternalDataDialog,
		AdminGameEditor,
		ChipGroup,
		GamePoster,
		LibraryHero,
		LibraryToolbar,
		SegmentedControl,
		UiAlert,
		UiButton,
		UiDialog,
		UiEmptyState,
		UiIconButton,
		UiNoMatches,
		UiPagination,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./admin-games.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGames implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly reportsService = inject(ReportsService);
	private readonly router = inject(Router);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly gamesRequests = new Subject<GamesQuery>();
	private readonly searchChanges = new Subject<void>();

	protected readonly Math = Math;
	protected readonly games = signal<Game[]>([]);
	protected readonly reportedGameIds = signal<Set<string>>(new Set());
	protected readonly total = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly skeletonRange = [0, 1, 2, 3, 4, 5];
	protected readonly activeFilterOptions: SegmentedOption<
		"active" | "inactive" | "all"
	>[] = [
		{ value: "active", label: "Active" },
		{ value: "inactive", label: "Deactivated" },
		{ value: "all", label: "All" }
	];
	protected readonly searchQuery = signal("");
	protected readonly offset = signal(0);
	protected readonly limit = 50;
	protected readonly noScores = signal(false);
	protected readonly noTimes = signal(false);
	protected readonly noPlatforms = signal(false);
	protected readonly noScoreSources = signal<Set<string>>(new Set());
	protected readonly noTimeSources = signal<Set<string>>(new Set());
	protected readonly activeFilter = signal<"active" | "inactive" | "all">(
		"active"
	);
	protected readonly reactivatingIds = signal<Set<string>>(new Set());
	protected readonly showCreateEditor = signal(false);
	protected readonly editingGame = signal<Game | null>(null);
	protected readonly loadingEditorId = signal<string | null>(null);
	protected readonly deactivateTarget = signal<Game | null>(null);
	protected readonly isDeactivating = signal(false);
	protected readonly externalDataTarget = signal<Game | null>(null);
	protected readonly externalDataState = signal<ExternalDataRefreshState>({
		status: "idle"
	});
	protected readonly refreshingExternalIds = signal<Set<string>>(new Set());

	private readonly scoreSourcesService = inject(ScoreSourcesService);
	protected readonly manualScoreSources = computed(() =>
		this.scoreSourcesService.manualSources()
	);
	protected readonly TIME_SOURCES = [
		{ code: "hltb", name: "HowLongToBeat" },
		{ code: "rawg", name: "RAWG" }
	];

	ngOnInit() {
		this.gamesRequests
			.pipe(
				switchMap(query =>
					this.gamesService
						.getGames(query)
						.pipe(catchError(() => of(null)))
				),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(res => this.applyGamesResponse(res));
		this.searchChanges
			.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.loadGames());
		this.scoreSourcesService
			.whenLoaded()
			.subscribe({ error: () => undefined });
		this.loadGames();
		this.loadReports();
	}

	toggleFilter(filter: "noScores" | "noTimes" | "noPlatforms") {
		this[filter].update(v => !v);
		this.offset.set(0);
		this.loadGames();
	}

	setActiveFilter(value: "active" | "inactive" | "all") {
		this.activeFilter.set(value);
		this.offset.set(0);
		this.loadGames();
	}

	toggleScoreSource(source: string) {
		const next = new Set(this.noScoreSources());
		if (next.has(source)) next.delete(source);
		else next.add(source);
		this.noScoreSources.set(next);
		this.offset.set(0);
		this.loadGames();
	}

	toggleTimeSource(source: string) {
		const next = new Set(this.noTimeSources());
		if (next.has(source)) next.delete(source);
		else next.add(source);
		this.noTimeSources.set(next);
		this.offset.set(0);
		this.loadGames();
	}

	protected readonly hasActiveFilters = computed(
		() =>
			this.searchQuery().trim().length > 0 ||
			this.activeFilter() !== "active" ||
			this.noScores() ||
			this.noTimes() ||
			this.noPlatforms() ||
			this.noScoreSources().size > 0 ||
			this.noTimeSources().size > 0
	);

	protected readonly generalMissingOptions: ChipOption[] = [
		{ value: "noScores", label: "No scores" },
		{ value: "noTimes", label: "No times" },
		{ value: "noPlatforms", label: "No platforms" }
	];

	protected readonly scoreMissingOptions = computed<ChipOption[]>(() =>
		this.manualScoreSources().map(source => ({
			value: `score:${source.code}`,
			label: source.name
		}))
	);

	protected readonly timeMissingOptions: ChipOption[] = this.TIME_SOURCES.map(
		source => ({
			value: `time:${source.code}`,
			label: source.name
		})
	);

	protected readonly missingValue = computed(() => [
		...(this.noScores() ? ["noScores"] : []),
		...(this.noTimes() ? ["noTimes"] : []),
		...(this.noPlatforms() ? ["noPlatforms"] : []),
		...[...this.noScoreSources()].map(src => `score:${src}`),
		...[...this.noTimeSources()].map(src => `time:${src}`)
	]);

	protected onMissingChange(
		next: readonly string[],
		group: readonly ChipOption[]
	) {
		const groupValues = new Set(group.map(option => option.value));
		const current = new Set(
			this.missingValue().filter(value => groupValues.has(value))
		);
		const incoming = new Set(next);
		const changed = [...groupValues].find(
			value => incoming.has(value) !== current.has(value)
		);
		if (!changed) return;
		if (
			changed === "noScores" ||
			changed === "noTimes" ||
			changed === "noPlatforms"
		)
			this.toggleFilter(changed);
		else if (changed.startsWith("score:"))
			this.toggleScoreSource(changed.slice("score:".length));
		else this.toggleTimeSource(changed.slice("time:".length));
	}

	clearFilters() {
		this.searchQuery.set("");
		this.activeFilter.set("active");
		this.noScores.set(false);
		this.noTimes.set(false);
		this.noPlatforms.set(false);
		this.noScoreSources.set(new Set());
		this.noTimeSources.set(new Set());
		this.offset.set(0);
		this.loadGames();
	}

	reload() {
		this.loadGames();
	}

	isReactivating(gameId: string): boolean {
		return this.reactivatingIds().has(gameId);
	}

	reactivate(game: Game) {
		if (this.isReactivating(game.id)) return;
		const updating = new Set(this.reactivatingIds());
		updating.add(game.id);
		this.reactivatingIds.set(updating);
		this.gamesService.reactivate(game.id).subscribe({
			next: () => {
				this.games.set(
					this.games().map(g =>
						g.id === game.id ? { ...g, isActive: true } : g
					)
				);
				const next = new Set(this.reactivatingIds());
				next.delete(game.id);
				this.reactivatingIds.set(next);
				this.toast.success(`Reactivated "${game.title}"`);
				if (this.activeFilter() === "inactive") this.loadGames();
			},
			error: () => {
				const next = new Set(this.reactivatingIds());
				next.delete(game.id);
				this.reactivatingIds.set(next);
				this.toast.warning("Could not reactivate game.");
			}
		});
	}

	openCreateEditor() {
		this.editingGame.set(null);
		this.showCreateEditor.set(true);
	}

	closeCreateEditor() {
		this.showCreateEditor.set(false);
	}

	openEditor(game: Game) {
		if (this.loadingEditorId() === game.id) return;
		this.showCreateEditor.set(false);
		this.loadingEditorId.set(game.id);
		this.gamesService.getByCode(game.code).subscribe({
			next: fullGame => {
				if (this.loadingEditorId() !== game.id) return;
				this.loadingEditorId.set(null);
				this.editingGame.set(fullGame);
			},
			error: () => {
				if (this.loadingEditorId() === game.id)
					this.loadingEditorId.set(null);
				this.toast.warning("Could not load the game to edit.");
			}
		});
	}

	closeEditor() {
		this.editingGame.set(null);
	}

	onGameCreated(game: Game) {
		this.showCreateEditor.set(false);
		this.toast.success(`Created "${game.title}"`);
		this.loadGames();
	}

	onEditorSaved() {
		this.editingGame.set(null);
		this.loadGames();
	}

	onEditorSplit() {
		this.editingGame.set(null);
		this.loadGames();
	}

	askDeactivate(game: Game) {
		this.deactivateTarget.set(game);
	}

	cancelDeactivate() {
		if (this.isDeactivating()) return;
		this.deactivateTarget.set(null);
	}

	confirmDeactivate(game: Game) {
		if (this.isDeactivating()) return;
		this.isDeactivating.set(true);
		this.gamesService.deactivate(game.id).subscribe({
			next: () => {
				this.isDeactivating.set(false);
				this.deactivateTarget.set(null);
				if (this.editingGame()?.id === game.id)
					this.editingGame.set(null);
				this.toast.success(`Deactivated "${game.title}"`);
				this.loadGames();
			},
			error: (err: { status?: number }) => {
				this.isDeactivating.set(false);
				this.deactivateTarget.set(null);
				this.reportActionError(err, "Could not deactivate game.");
			}
		});
	}

	isRefreshingExternal(gameId: string): boolean {
		return this.refreshingExternalIds().has(gameId);
	}

	openExternalData(game: Game) {
		this.externalDataTarget.set(game);
		this.externalDataState.set(
			this.isRefreshingExternal(game.id)
				? { status: "pending" }
				: { status: "idle" }
		);
	}

	closeExternalData() {
		this.externalDataTarget.set(null);
	}

	refreshExternalData(sources: ExternalDataSource[]) {
		const game = this.externalDataTarget();
		if (!game || this.isRefreshingExternal(game.id)) return;
		this.setRefreshingExternal(game.id, true);
		this.externalDataState.set({ status: "pending" });
		this.gamesService
			.refreshExternalData(game.id, sources)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: response => this.applyExternalDataRefresh(game, response),
				error: error => this.failExternalDataRefresh(game, error)
			});
	}

	private applyExternalDataRefresh(
		requested: Game,
		{ game: updated, results }: ExternalDataRefreshResponse
	) {
		this.setRefreshingExternal(requested.id, false);
		const refreshed = this.replaceGameRow(requested.id, updated);
		if (this.externalDataTarget()?.id !== requested.id) {
			this.toast.success(
				`Finished refreshing external data for "${requested.title}"`
			);
			return;
		}
		this.externalDataTarget.set(refreshed ?? { ...requested, ...updated });
		this.externalDataState.set({ status: "done", results });
	}

	private failExternalDataRefresh(requested: Game, error: unknown) {
		this.setRefreshingExternal(requested.id, false);
		const message = externalDataRefreshErrorMessage(error);
		if (this.externalDataTarget()?.id !== requested.id) {
			this.toast.warning(
				`Couldn't refresh external data for "${requested.title}". ${message}`
			);
			return;
		}
		this.externalDataState.set({ status: "error", message });
	}

	private setRefreshingExternal(gameId: string, refreshing: boolean) {
		const next = new Set(this.refreshingExternalIds());
		if (refreshing) next.add(gameId);
		else next.delete(gameId);
		this.refreshingExternalIds.set(next);
	}

	private replaceGameRow(gameId: string, updated: Game): Game | null {
		let replaced: Game | null = null;
		this.games.set(
			this.games().map(row => {
				if (row.id !== gameId) return row;
				replaced = { ...row, ...updated };
				return replaced;
			})
		);
		return replaced;
	}

	private reportActionError(err: { status?: number }, fallback: string) {
		const alreadyToastedByInterceptor = err.status === 409;
		if (alreadyToastedByInterceptor) return;
		this.toast.warning(adminErrorMessage(err) ?? fallback);
	}

	goToGameReport(gameId: string) {
		this.router.navigate(["/admin/reports"], {
			queryParams: { gameId }
		});
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.offset.set(0);
		this.searchChanges.next();
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.loadGames();
	}

	private loadReports() {
		this.reportsService.getPendingReports().subscribe({
			next: reports => {
				const ids = new Set(reports.map(r => r.gameId));
				this.reportedGameIds.set(ids);
			},
			error: () => undefined
		});
	}

	private loadGames() {
		this.isLoading.set(true);
		this.loadError.set(false);
		const query: GamesQuery = {
			limit: this.limit,
			offset: this.offset(),
			sort_by: "createdAt",
			sort_order: "desc",
			detailed: true
		};
		const search = this.searchQuery().trim();
		if (search.length > 0) query["search"] = search;
		if (this.noScores()) query["no_scores"] = true;
		if (this.noTimes()) query["no_times"] = true;
		if (this.noPlatforms()) query["no_platforms"] = true;
		if (this.activeFilter() === "all") query["include_inactive"] = true;
		if (this.activeFilter() === "inactive") query["only_inactive"] = true;
		const scoreSources = Array.from(this.noScoreSources());
		if (scoreSources.length > 0)
			query["no_score_source"] = scoreSources.join(",");
		const timeSources = Array.from(this.noTimeSources());
		if (timeSources.length > 0)
			query["no_time_source"] = timeSources.join(",");
		this.gamesRequests.next(query);
	}

	private applyGamesResponse(
		res: { data: { games: Game[]; total: number } } | null
	) {
		if (!res) {
			this.loadError.set(true);
			this.isLoading.set(false);
			return;
		}
		const { games, total } = res.data;
		if (games.length === 0 && this.offset() > 0) {
			this.offset.set(
				total > 0
					? Math.floor((total - 1) / this.limit) * this.limit
					: 0
			);
			this.loadGames();
			return;
		}
		this.games.set(games);
		this.total.set(total);
		this.isLoading.set(false);
	}
}
