import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	OnInit,
	signal,
	untracked
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
	CdkDrag,
	CdkDragDrop,
	CdkDragHandle,
	CdkDropList,
	moveItemInArray
} from "@angular/cdk/drag-drop";
import { FormsModule } from "@angular/forms";
import {
	BacklogEntry,
	BacklogStatus,
	Genre,
	Platform
} from "../../../core/models";
import { GameFilterPanel } from "../../../shared/components/game-filter-panel/game-filter-panel";
import {
	backlogStatusClass,
	backlogStatusLabel,
	backlogStatusIcon,
	backlogStatusIconColor
} from "../../../shared/utils/backlog-status";
import { BacklogService, BacklogFilters } from "../backlog";
import { savedFilterColorHex } from "../saved-filter-appearance";
import {
	SavedFiltersService,
	SavedFilter,
	SavedFilterStats,
	STAT_KEYS,
	StatKey,
	DEFAULT_ENABLED_STATS,
	STAT_LABELS
} from "../saved-filters";
import { QueueService } from "../../queue/queue";
import { FavoritesService } from "../../favorites/favorites";
import { GamesService } from "../../games/games";
import { ActivatedRoute, ParamMap, Router, RouterLink } from "@angular/router";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "../backlog-modal/backlog-modal";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { BacklogCalendar } from "../backlog-calendar/backlog-calendar";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { GameTitleCell } from "../../../shared/components/game-title-cell/game-title-cell";
import { FloatingXScrollbar } from "../../../shared/directives/floating-x-scrollbar";
import { CoverUrlPipe } from "../../../shared/pipes/cover-url";
import { PersonalStats } from "../../../shared/components/personal-stats/personal-stats";
import { ReviewsService } from "../../games/reviews";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import { MoodTagsInput } from "../../../shared/components/mood-tags-input/mood-tags-input";
import {
	UiButton,
	UiEmptyState,
	UiIconButton,
	UiInput,
	UiPagination,
	UiSearchBar,
	UiSelect,
	UiSkeleton,
	UiSwitch,
	UiTextarea
} from "../../../shared/ui";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

interface PendingStatusUpdate {
	entry: BacklogEntry;
	status: BacklogStatus;
	startedAt: string;
	finishedAt: string;
	realDuration: string;
	rating: number | null;
	reviewToggle: boolean;
	reviewContent: string;
}

@Component({
	selector: "app-backlog-list",
	imports: [
		DatePipe,
		FormsModule,
		BacklogCalendar,
		StarRating,
		GameTitleCell,
		FloatingXScrollbar,
		PersonalStats,
		RouterLink,
		UiButton,
		UiEmptyState,
		UiIconButton,
		UiInput,
		UiPagination,
		UiSearchBar,
		UiSelect,
		UiSkeleton,
		UiSwitch,
		UiTextarea,
		GameFilterPanel,
		MoodTagsInput,
		CdkDropList,
		CdkDrag,
		CdkDragHandle,
		CoverUrlPipe
	],
	templateUrl: "./backlog-list.html",
	host: {
		"(document:click)": "onDocumentClick()"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogList implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly backlogService = inject(BacklogService);
	private readonly savedFiltersService = inject(SavedFiltersService);
	private readonly queueService = inject(QueueService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly gamesService = inject(GamesService);
	private readonly reviewsService = inject(ReviewsService);
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);

	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly skeletonRange = Array.from({ length: 6 }, (_, i) => i);
	protected readonly isInitialLoad = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly activeStatuses = signal<Set<string>>(new Set());
	protected readonly sortBy = signal("createdAt");
	protected readonly sortOrder = signal<"asc" | "desc">("desc");
	private readonly queueBacklogIds = signal<Set<string>>(new Set());
	protected readonly statusMenuOpenId = signal<string | null>(null);
	protected readonly pendingStatusUpdate = signal<PendingStatusUpdate | null>(
		null
	);
	protected readonly updatingStatusIds = signal<Set<string>>(new Set());
	protected readonly reviewExpandedIds = signal<Set<string>>(new Set());

	private readonly queryParamMap = toSignal(this.route.queryParamMap);
	private readonly savedFiltersLoaded = signal(false);
	private eagerlyAppliedParams: ParamMap | null = null;

	private readonly applyFromUrlEffect = effect(() => {
		const params = this.queryParamMap();
		if (!params) return;
		const filtersLoaded = this.savedFiltersLoaded();
		untracked(() => {
			if (!filtersLoaded) {
				if (params.get("savedFilterId")) return;
				this.eagerlyAppliedParams = params;
				this.applyFiltersFromUrl(params);
				return;
			}
			const hasDefault = this.savedFilters().some(f => f.isDefault);
			if (
				this.eagerlyAppliedParams === params &&
				(params.get("status") !== null || !hasDefault)
			) {
				return;
			}
			this.eagerlyAppliedParams = null;
			this.applyFiltersFromUrl(params);
		});
	});

	protected readonly viewMode = signal<"diary" | "hardcore" | "calendar">(
		(localStorage.getItem("completr.backlog.viewMode") as
			| "diary"
			| "hardcore"
			| "calendar") || "diary"
	);

	setViewMode(mode: "diary" | "hardcore" | "calendar") {
		this.viewMode.set(mode);
		localStorage.setItem("completr.backlog.viewMode", mode);
	}

	protected readonly showFilters = signal(false);
	protected readonly showAdvancedFilters = signal(false);
	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly allGenres = signal<Genre[]>([]);
	protected readonly selectedPlatform = signal("");
	protected readonly selectedPlatforms = signal<Set<string>>(new Set());
	protected readonly selectedGenres = signal<Set<string>>(new Set());
	protected readonly yearFrom = signal<number | null>(null);
	protected readonly yearTo = signal<number | null>(null);
	protected readonly startedFrom = signal("");
	protected readonly startedTo = signal("");
	protected readonly finishedFrom = signal("");
	protected readonly finishedTo = signal("");
	protected readonly minRating = signal<number | null>(null);
	protected readonly maxRating = signal<number | null>(null);
	protected readonly minRealDuration = signal<number | null>(null);
	protected readonly maxRealDuration = signal<number | null>(null);
	protected readonly minRatio = signal<number | null>(null);
	protected readonly maxRatio = signal<number | null>(null);
	protected readonly minPersonalRatio = signal<number | null>(null);
	protected readonly maxPersonalRatio = signal<number | null>(null);
	protected readonly selectedMoodTags = signal<string[]>([]);
	protected readonly moodTagsSuggestions = signal<string[]>([]);
	protected readonly coopOnly = signal(false);

	protected readonly appliedFilters = signal<BacklogFilters>({});
	protected readonly savedFilters = signal<SavedFilter[]>([]);
	protected readonly backlogFilters = signal<SavedFilter[]>([]);
	protected readonly colorHex = savedFilterColorHex;
	protected readonly activeFilterId = signal<string | null>(null);
	protected readonly activeFilterDescription = signal("");
	protected readonly newFilterName = signal("");
	protected readonly newFilterPinned = signal(true);
	protected readonly savingFilter = signal(false);
	protected readonly showReorderModal = signal(false);
	protected readonly reorderItems = signal<SavedFilter[]>([]);
	protected readonly savingReorder = signal(false);

	protected readonly stats = signal<SavedFilterStats | null>(null);
	protected readonly statsLoading = signal(false);
	protected readonly statsError = signal(false);
	protected readonly statsExpanded = signal(
		localStorage.getItem("completr.backlog.statsExpanded") === "true"
	);
	protected readonly showStatsPanel = signal(false);
	protected readonly statsConfigSaving = signal(false);
	protected readonly allStatKeys = STAT_KEYS;
	protected readonly statLabels = STAT_LABELS;

	protected enabledStatsCount(): number {
		const filter = this.getActiveFilter();
		if (!filter) return 0;
		const enabled = filter.enabledStats;
		if (enabled === undefined || enabled === null) {
			return DEFAULT_ENABLED_STATS.length;
		}
		return enabled.length;
	}

	protected isStatsCustom(): boolean {
		const filter = this.getActiveFilter();
		if (!filter) return false;
		return (
			filter.enabledStats !== undefined && filter.enabledStats !== null
		);
	}

	protected toggleStatsPanel() {
		if (!this.activeFilterId()) return;
		this.showStatsPanel.update(v => !v);
	}

	private readonly loadStatsEffect = effect(() => {
		const id = this.activeFilterId();
		if (!id) {
			untracked(() => {
				this.stats.set(null);
				this.statsLoading.set(false);
				this.statsError.set(false);
			});
			return;
		}
		untracked(() => this.loadStats(id));
	});

	private loadStats(id: string) {
		this.statsLoading.set(true);
		this.statsError.set(false);
		this.savedFiltersService.getStats(id).subscribe({
			next: stats => {
				this.stats.set(stats);
				this.statsLoading.set(false);
			},
			error: () => {
				this.stats.set(null);
				this.statsLoading.set(false);
				this.statsError.set(true);
			}
		});
	}

	retryStats() {
		const id = this.activeFilterId();
		if (id) this.loadStats(id);
	}

	toggleStatsExpanded() {
		const next = !this.statsExpanded();
		this.statsExpanded.set(next);
		localStorage.setItem("completr.backlog.statsExpanded", String(next));
	}

	protected onActiveFilterChangedCloseStatsPanel = effect(() => {
		const id = this.activeFilterId();
		if (!id) untracked(() => this.showStatsPanel.set(false));
	});

	private getActiveFilter(): SavedFilter | null {
		const id = this.activeFilterId();
		if (!id) return null;
		return this.savedFilters().find(f => f.id === id) ?? null;
	}

	protected isStatEnabled(key: StatKey): boolean {
		const filter = this.getActiveFilter();
		const enabled = filter?.enabledStats;
		if (enabled === undefined || enabled === null) {
			return (DEFAULT_ENABLED_STATS as readonly string[]).includes(key);
		}
		return enabled.includes(key);
	}

	protected hasAnyStatEnabled(): boolean {
		return this.allStatKeys.some(k => this.isStatEnabled(k));
	}

	protected hasAnyHighlightEnabled(): boolean {
		return (
			this.isStatEnabled("longestPlayed") ||
			this.isStatEnabled("bestPersonalRatio") ||
			this.isStatEnabled("highestRated")
		);
	}

	protected hasAnyExpandedStatEnabled(): boolean {
		return (
			this.isStatEnabled("completionRate") ||
			this.isStatEnabled("abandonmentRate") ||
			this.isStatEnabled("avgRealDuration") ||
			this.isStatEnabled("avgEstimatedDuration") ||
			this.isStatEnabled("avgScore") ||
			this.isStatEnabled("avgUserRating") ||
			this.isStatEnabled("estimatedVsRealDelta")
		);
	}

	protected toggleStatKey(key: StatKey) {
		const filter = this.getActiveFilter();
		if (!filter) return;
		const current =
			filter.enabledStats === undefined || filter.enabledStats === null
				? [...DEFAULT_ENABLED_STATS]
				: [...filter.enabledStats];
		const idx = current.indexOf(key);
		if (idx >= 0) current.splice(idx, 1);
		else current.push(key);
		this.persistEnabledStats(filter, current);
	}

	protected resetStatsConfig() {
		const filter = this.getActiveFilter();
		if (!filter) return;
		this.persistEnabledStats(filter, null);
	}

	private persistEnabledStats(filter: SavedFilter, value: string[] | null) {
		this.statsConfigSaving.set(true);
		const next = { ...filter, enabledStats: value };
		this.savedFilters.update(list =>
			list.map(f => (f.id === filter.id ? next : f))
		);
		this.backlogFilters.update(list =>
			list.map(f => (f.id === filter.id ? next : f))
		);
		this.savedFiltersService
			.update(filter.id, { enabledStats: value })
			.subscribe({
				next: updated => {
					this.savedFilters.update(list =>
						list.map(f => (f.id === updated.id ? updated : f))
					);
					this.backlogFilters.update(list =>
						list.map(f => (f.id === updated.id ? updated : f))
					);
					this.statsConfigSaving.set(false);
				},
				error: () => {
					this.savedFilters.update(list =>
						list.map(f => (f.id === filter.id ? filter : f))
					);
					this.backlogFilters.update(list =>
						list.map(f => (f.id === filter.id ? filter : f))
					);
					this.statsConfigSaving.set(false);
				}
			});
	}

	formatStat(value: number | null, suffix = "", decimals = 2): string {
		if (value == null) return "—";
		const rounded =
			decimals === 0
				? Math.round(value).toString()
				: value.toFixed(decimals).replace(/\.?0+$/, "");
		return rounded + suffix;
	}

	formatPercent(value: number | null): string {
		if (value == null) return "—";
		return (value * 100).toFixed(0) + "%";
	}

	protected readonly hasActiveFilters = () => this.activeFiltersCount() > 0;

	protected readonly hasPendingViewName = () =>
		this.newFilterName().trim().length > 0;

	protected readonly activeFiltersCount = () => {
		let count = 0;
		if (this.selectedPlatform() !== "") count++;
		if (this.selectedPlatforms().size > 0) count++;
		if (this.selectedGenres().size > 0) count++;
		if (this.yearFrom() !== null || this.yearTo() !== null) count++;
		if (this.startedFrom() !== "" || this.startedTo() !== "") count++;
		if (this.finishedFrom() !== "" || this.finishedTo() !== "") count++;
		if (this.minRating() !== null || this.maxRating() !== null) count++;
		if (this.minRealDuration() !== null || this.maxRealDuration() !== null)
			count++;
		if (this.minRatio() !== null || this.maxRatio() !== null) count++;
		if (
			this.minPersonalRatio() !== null ||
			this.maxPersonalRatio() !== null
		)
			count++;
		if (this.activeStatuses().size > 0) count++;
		if (this.selectedMoodTags().length > 0) count++;
		if (this.coopOnly()) count++;
		return count;
	};

	updateMoodTagsFilter(tags: string[]) {
		this.selectedMoodTags.set(tags);
	}

	toggleCoopOnly() {
		this.coopOnly.update(v => !v);
		this.activeFilterId.set(null);
	}

	private readonly statuses: { label: string; value: string }[] = [
		{ label: "Not Started", value: "not_started" },
		{ label: "Playing", value: "playing" },
		{ label: "Completed", value: "completed" },
		{ label: "Endless", value: "endless" },
		{ label: "Abandoned", value: "abandoned" }
	];

	protected readonly statusFilters = this.statuses;

	ngOnInit() {
		this.setupSearch();
		this.loadQueueIds();
		this.favoritesService.ensureIdsLoaded().subscribe();
		this.gamesService
			.getPlatforms()
			.subscribe(p => this.allPlatforms.set(p));
		this.gamesService.getGenres().subscribe(g => this.allGenres.set(g));
		this.savedFiltersService.getAll().subscribe(filters => {
			this.savedFilters.set(filters);
			this.backlogFilters.set(filters.filter(f => f.showInBacklog));
			this.savedFiltersLoaded.set(true);
		});
		this.moodTagsService
			.getMyTags()
			.subscribe(tags =>
				this.moodTagsSuggestions.set(tags.map(t => t.tag))
			);
	}

	private applyFiltersFromUrl(params: ParamMap) {
		const filterId = params.get("savedFilterId");
		if (filterId) {
			const match = this.savedFilters().find(f => f.id === filterId);
			if (match) {
				this.applySavedFilterFromUrl(match);
				return;
			}
		}

		const statusParam = params.get("status");
		if (statusParam) {
			this.resetFilterState();
			this.activeStatuses.set(new Set(statusParam.split(",")));
			this.offset.set(0);
			this.loadBacklog();
			return;
		}

		const defaultFilter = this.savedFilters().find(f => f.isDefault);
		if (defaultFilter && this.activeFilterId() !== defaultFilter.id) {
			this.applySavedFilterFromUrl(defaultFilter);
			return;
		}

		if (!defaultFilter) {
			this.resetFilterState();
			this.loadBacklog();
		}
	}

	private applySavedFilterFromUrl(filter: SavedFilter) {
		this.applySavedFilterState(filter);
		this.activeFilterId.set(filter.id);
		this.activeFilterDescription.set(filter.description ?? "");
		this.offset.set(0);
		this.loadBacklog();
	}

	private applySavedFilterState(filter: SavedFilter) {
		const f = filter.filters as Record<string, string>;
		this.selectedPlatform.set(f["platform_id"] ?? "");
		this.selectedPlatforms.set(
			f["platforms"] ? new Set(f["platforms"].split(",")) : new Set()
		);
		this.selectedGenres.set(
			f["genres"] ? new Set(f["genres"].split(",")) : new Set()
		);
		this.yearFrom.set(
			f["release_year_from"] ? Number(f["release_year_from"]) : null
		);
		this.yearTo.set(
			f["release_year_to"] ? Number(f["release_year_to"]) : null
		);
		this.startedFrom.set(f["started_from"] ?? "");
		this.startedTo.set(f["started_to"] ?? "");
		this.finishedFrom.set(f["finished_from"] ?? "");
		this.finishedTo.set(f["finished_to"] ?? "");
		this.minRating.set(f["min_rating"] ? Number(f["min_rating"]) : null);
		this.maxRating.set(f["max_rating"] ? Number(f["max_rating"]) : null);
		this.minRealDuration.set(
			f["min_real_duration"] ? Number(f["min_real_duration"]) : null
		);
		this.maxRealDuration.set(
			f["max_real_duration"] ? Number(f["max_real_duration"]) : null
		);
		this.minRatio.set(f["min_ratio"] ? Number(f["min_ratio"]) : null);
		this.maxRatio.set(f["max_ratio"] ? Number(f["max_ratio"]) : null);
		this.minPersonalRatio.set(
			f["min_personal_ratio"] ? Number(f["min_personal_ratio"]) : null
		);
		this.maxPersonalRatio.set(
			f["max_personal_ratio"] ? Number(f["max_personal_ratio"]) : null
		);
		this.selectedMoodTags.set(
			f["mood_tags"] ? f["mood_tags"].split(",").filter(Boolean) : []
		);
		this.coopOnly.set(f["coop_only"] === "true");

		const status = f["status"];
		this.activeStatuses.set(
			status ? new Set(status.split(",")) : new Set()
		);

		if (filter.sortBy) this.sortBy.set(filter.sortBy);
		if (filter.sortOrder)
			this.sortOrder.set(filter.sortOrder as "asc" | "desc");

		if (this.hasAdvancedFiltersActive()) this.showAdvancedFilters.set(true);
	}

	private resetFilterState() {
		this.selectedPlatform.set("");
		this.startedFrom.set("");
		this.startedTo.set("");
		this.finishedFrom.set("");
		this.finishedTo.set("");
		this.minRating.set(null);
		this.maxRating.set(null);
		this.activeStatuses.set(new Set());
		this.coopOnly.set(false);
		this.activeFilterId.set(null);
		this.activeFilterDescription.set("");
		this.sortBy.set("createdAt");
		this.sortOrder.set("desc");
	}

	isInQueue(entry: BacklogEntry): boolean {
		return this.queueBacklogIds().has(entry.id);
	}

	private loadQueueIds() {
		this.queueService.getMyQueue().subscribe(entries => {
			this.queueBacklogIds.set(new Set(entries.map(e => e.backlog.id)));
		});
	}

	private loadSavedFilters() {
		this.savedFiltersService.getAll().subscribe(filters => {
			this.savedFilters.set(filters);
			this.backlogFilters.set(filters.filter(f => f.showInBacklog));
		});
	}

	openReorderModal() {
		this.reorderItems.set([...this.backlogFilters()]);
		this.showReorderModal.set(true);
	}

	closeReorderModal() {
		this.showReorderModal.set(false);
	}

	moveReorderUp(index: number) {
		if (index === 0) return;
		const items = [...this.reorderItems()];
		[items[index - 1], items[index]] = [items[index], items[index - 1]];
		this.reorderItems.set(items);
	}

	moveReorderDown(index: number) {
		const items = [...this.reorderItems()];
		if (index >= items.length - 1) return;
		[items[index], items[index + 1]] = [items[index + 1], items[index]];
		this.reorderItems.set(items);
	}

	onReorderDrop(event: CdkDragDrop<SavedFilter[]>) {
		if (event.previousIndex === event.currentIndex) return;
		const items = [...this.reorderItems()];
		moveItemInArray(items, event.previousIndex, event.currentIndex);
		this.reorderItems.set(items);
	}

	saveReorder() {
		this.savingReorder.set(true);
		const ids = this.reorderItems().map(f => f.id);
		this.savedFiltersService.reorder(ids).subscribe({
			next: () => {
				this.savingReorder.set(false);
				this.showReorderModal.set(false);
				this.loadSavedFilters();
			},
			error: () => this.savingReorder.set(false)
		});
	}

	toggleStatus(status: string) {
		const current = new Set(this.activeStatuses());
		if (current.has(status)) {
			current.delete(status);
		} else {
			current.add(status);
		}
		this.activeStatuses.set(current);
		this.activeFilterId.set(null);
	}

	isStatusActive(status: string): boolean {
		return this.activeStatuses().has(status);
	}

	toggleFilters() {
		this.showFilters.set(!this.showFilters());
	}

	applyFilters() {
		if (!this.activeFilterId()) this.saveCurrentFilter();
		this.activeFilterId.set(null);
		this.offset.set(0);
		this.loadBacklog();
	}

	clearFilters() {
		this.searchQuery.set("");
		this.selectedPlatform.set("");
		this.selectedPlatforms.set(new Set());
		this.selectedGenres.set(new Set());
		this.yearFrom.set(null);
		this.yearTo.set(null);
		this.startedFrom.set("");
		this.startedTo.set("");
		this.finishedFrom.set("");
		this.finishedTo.set("");
		this.minRating.set(null);
		this.maxRating.set(null);
		this.minRealDuration.set(null);
		this.maxRealDuration.set(null);
		this.minRatio.set(null);
		this.maxRatio.set(null);
		this.minPersonalRatio.set(null);
		this.maxPersonalRatio.set(null);
		this.selectedMoodTags.set([]);
		this.activeStatuses.set(new Set());
		this.coopOnly.set(false);
		this.activeFilterId.set(null);
		this.activeFilterDescription.set("");
		this.sortBy.set("createdAt");
		this.sortOrder.set("desc");
		this.offset.set(0);
		this.loadBacklog();
	}

	applySavedFilter(filter: SavedFilter) {
		if (this.activeFilterId() === filter.id) {
			this.clearFilters();
			this.showFilters.set(false);
			return;
		}

		this.applySavedFilterState(filter);

		this.activeFilterId.set(filter.id);
		this.activeFilterDescription.set(filter.description ?? "");
		this.offset.set(0);
		this.loadBacklog();
	}

	updateCurrentFilter() {
		const id = this.activeFilterId();
		if (!id) return;

		this.savingFilter.set(true);
		const filters = this.buildFiltersObject();

		this.savedFiltersService
			.update(id, {
				filters,
				sortBy: this.sortBy(),
				sortOrder: this.sortOrder()
			})
			.subscribe({
				next: () => {
					this.savingFilter.set(false);
					this.loadSavedFilters();
					this.loadStats(id);
				},
				error: err => {
					this.savingFilter.set(false);
					this.notifyFilterLimit(err);
				}
			});
	}

	deleteSavedFilter(filter: SavedFilter) {
		this.savedFiltersService.delete(filter.id).subscribe(() => {
			this.loadSavedFilters();
			if (this.activeFilterId() === filter.id) {
				this.activeFilterId.set(null);
			}
		});
	}

	saveCurrentFilter() {
		const name = this.newFilterName().trim();
		if (!name) return;

		this.savingFilter.set(true);
		const filters = this.buildFiltersObject();

		this.savedFiltersService
			.create({
				name,
				filters,
				sortBy: this.sortBy(),
				sortOrder: this.sortOrder(),
				showInBacklog: this.newFilterPinned()
			})
			.subscribe({
				next: () => {
					this.savingFilter.set(false);
					this.newFilterName.set("");
					this.newFilterPinned.set(true);
					this.loadSavedFilters();
				},
				error: err => {
					this.savingFilter.set(false);
					this.notifyFilterLimit(err);
				}
			});
	}

	private notifyFilterLimit(error: unknown) {
		if (error instanceof HttpErrorResponse && error.status === 402)
			this.toast.error(
				"You've reached the free limit of 5 saved views. Delete one to save a new view."
			);
	}

	private buildFiltersObject(): Record<string, string> {
		const filters: Record<string, string> = {};
		const statuses = this.activeStatuses();
		if (statuses.size > 0) filters["status"] = [...statuses].join(",");
		if (this.selectedPlatform())
			filters["platform_id"] = this.selectedPlatform();
		if (this.selectedPlatforms().size > 0)
			filters["platforms"] = [...this.selectedPlatforms()].join(",");
		if (this.selectedGenres().size > 0)
			filters["genres"] = [...this.selectedGenres()].join(",");
		if (this.yearFrom() !== null)
			filters["release_year_from"] = String(this.yearFrom());
		if (this.yearTo() !== null)
			filters["release_year_to"] = String(this.yearTo());
		if (this.startedFrom()) filters["started_from"] = this.startedFrom();
		if (this.startedTo()) filters["started_to"] = this.startedTo();
		if (this.finishedFrom()) filters["finished_from"] = this.finishedFrom();
		if (this.finishedTo()) filters["finished_to"] = this.finishedTo();
		if (this.minRating() !== null)
			filters["min_rating"] = String(this.minRating());
		if (this.maxRating() !== null)
			filters["max_rating"] = String(this.maxRating());
		if (this.minRealDuration() !== null)
			filters["min_real_duration"] = String(this.minRealDuration());
		if (this.maxRealDuration() !== null)
			filters["max_real_duration"] = String(this.maxRealDuration());
		if (this.minRatio() !== null)
			filters["min_ratio"] = String(this.minRatio());
		if (this.maxRatio() !== null)
			filters["max_ratio"] = String(this.maxRatio());
		if (this.minPersonalRatio() !== null)
			filters["min_personal_ratio"] = String(this.minPersonalRatio());
		if (this.maxPersonalRatio() !== null)
			filters["max_personal_ratio"] = String(this.maxPersonalRatio());
		if (this.selectedMoodTags().length > 0)
			filters["mood_tags"] = this.selectedMoodTags().join(",");
		if (this.coopOnly()) filters["coop_only"] = "true";
		return filters;
	}

	private readonly searchSubject = new Subject<string>();

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadBacklog();
			return;
		}
		this.searchSubject.next(query);
	}

	private setupSearch() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(() => {
				this.offset.set(0);
				this.loadBacklog();
			});
	}

	sort(column: string) {
		if (this.sortBy() === column) {
			this.sortOrder.set(this.sortOrder() === "asc" ? "desc" : "asc");
		} else {
			this.sortBy.set(column);
			this.sortOrder.set("desc");
		}
		this.offset.set(0);
		this.loadBacklog();
	}

	ariaSortFor(column: string): "ascending" | "descending" | "none" {
		if (this.sortBy() !== column) return "none";
		return this.sortOrder() === "asc" ? "ascending" : "descending";
	}

	protected statusClass = backlogStatusClass;
	protected statusLabel = backlogStatusLabel;
	protected statusIcon = backlogStatusIcon;
	protected statusIconColor = backlogStatusIconColor;

	canChangeStatus(status: BacklogStatus): boolean {
		return (
			status === "not_started" ||
			status === "playing" ||
			status === "endless"
		);
	}

	canQuickRate(entry: BacklogEntry): boolean {
		return entry.status !== "not_started" && entry.userRating == null;
	}

	onQuickRate(entry: BacklogEntry, rating: number | null) {
		if (rating == null) return;
		this.entries.set(
			this.entries().map(e =>
				e.id === entry.id ? { ...e, userRating: rating } : e
			)
		);
		this.backlogService
			.update(entry.id, { userRating: rating })
			.subscribe();
	}

	onDocumentClick() {
		this.statusMenuOpenId.set(null);
	}

	toggleStatusMenu(entry: BacklogEntry, event: Event) {
		event.stopPropagation();
		const current = this.statusMenuOpenId();
		this.statusMenuOpenId.set(current === entry.id ? null : entry.id);
	}

	isStatusUpdating(entry: BacklogEntry): boolean {
		return this.updatingStatusIds().has(entry.id);
	}

	selectNewStatus(entry: BacklogEntry, status: string, event: Event) {
		event.stopPropagation();
		this.statusMenuOpenId.set(null);
		const newStatus = status as BacklogStatus;
		if (newStatus === entry.status) return;
		const today = this.todayDateString();
		this.pendingStatusUpdate.set({
			entry,
			status: newStatus,
			startedAt: newStatus === "playing" ? today : "",
			finishedAt:
				newStatus === "completed" || newStatus === "abandoned"
					? today
					: "",
			realDuration:
				entry.realDuration != null ? String(entry.realDuration) : "",
			rating: entry.review?.rating ?? entry.userRating ?? null,
			reviewToggle: false,
			reviewContent: ""
		});
	}

	cancelStatusChange() {
		this.pendingStatusUpdate.set(null);
	}

	protected updatePendingStatus(patch: Partial<PendingStatusUpdate>) {
		this.pendingStatusUpdate.update(s => (s ? { ...s, ...patch } : s));
	}

	saveAndOpenReview() {
		const pending = this.pendingStatusUpdate();
		if (!pending) return;
		const gameCode = pending.entry.game.code;
		this.updatePendingStatus({ reviewToggle: false });
		this.confirmStatusChange();
		this.router.navigate(["/games", gameCode], {
			queryParams: { review: "open" }
		});
	}

	confirmStatusChange() {
		const pending = this.pendingStatusUpdate();
		if (!pending) return;
		const { entry, status } = pending;
		const hasFinishedAt = status === "completed" || status === "abandoned";
		const allowsRating =
			status === "completed" ||
			status === "abandoned" ||
			status === "endless";

		const payload: {
			status: BacklogStatus;
			startedAt?: string;
			finishedAt?: string;
			realDuration?: number;
			userRating?: number | null;
		} = { status };
		if (status === "playing" && pending.startedAt)
			payload.startedAt = pending.startedAt;
		if (hasFinishedAt && pending.finishedAt)
			payload.finishedAt = pending.finishedAt;
		if (status === "completed") {
			const realDurationRaw = pending.realDuration.trim();
			if (realDurationRaw) {
				const parsed = Number(realDurationRaw);
				if (!Number.isNaN(parsed) && parsed > 0)
					payload.realDuration = parsed;
			}
		}
		if (allowsRating && pending.rating != null) {
			payload.userRating = pending.rating;
		}

		const reviewSubmit = allowsRating && pending.reviewToggle;
		const reviewRating = pending.rating ?? undefined;
		const reviewContent = pending.reviewContent.trim() || undefined;
		const shouldSubmitReview =
			reviewSubmit && (reviewRating !== undefined || reviewContent);

		this.pendingStatusUpdate.set(null);

		const updating = new Set(this.updatingStatusIds());
		updating.add(entry.id);
		this.updatingStatusIds.set(updating);

		const clearUpdating = () => {
			const next = new Set(this.updatingStatusIds());
			next.delete(entry.id);
			this.updatingStatusIds.set(next);
		};

		this.backlogService.update(entry.id, payload).subscribe({
			next: ({ backlog, queueRemoved }) => {
				this.entries.set(
					this.entries().map(e => (e.id === entry.id ? backlog : e))
				);
				if (queueRemoved) this.loadQueueIds();

				if (!shouldSubmitReview) {
					clearUpdating();
					return;
				}

				const reviewAction = entry.review
					? this.reviewsService.updateReview(entry.game.id, {
							content: reviewContent ?? null,
							rating: reviewRating ?? null
						})
					: this.reviewsService.createReview(entry.game.id, {
							content: reviewContent,
							rating: reviewRating
						});

				reviewAction.subscribe({
					next: () => clearUpdating(),
					error: clearUpdating
				});
			},
			error: clearUpdating
		});
	}

	private todayDateString(): string {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}

	parseNumber(value: string): number | null {
		const trimmed = value?.trim();
		return trimmed ? Number(trimmed) : null;
	}

	hasAdvancedFiltersActive(): boolean {
		return (
			this.selectedPlatforms().size > 0 ||
			this.selectedGenres().size > 0 ||
			this.yearFrom() !== null ||
			this.yearTo() !== null ||
			this.minRealDuration() !== null ||
			this.maxRealDuration() !== null ||
			this.minRatio() !== null ||
			this.maxRatio() !== null ||
			this.minPersonalRatio() !== null ||
			this.maxPersonalRatio() !== null
		);
	}

	toggleAdvancedFilters() {
		this.showAdvancedFilters.update(v => !v);
	}

	isFavorite(gameId: string): boolean {
		return this.favoritesService.isFavorite(gameId);
	}

	toggleFavorite(gameId: string, event: Event) {
		event.stopPropagation();
		this.favoritesService.toggle(gameId).subscribe();
	}

	toggleQueue(entry: BacklogEntry) {
		if (!this.isInQueue(entry)) {
			this.queueService.addFromBacklog(entry.id).subscribe(() => {
				this.loadQueueIds();
			});
			return;
		}
		this.queueService.removeByBacklogId(entry.id).subscribe(() => {
			this.loadQueueIds();
		});
	}

	isReviewExpanded(entryId: string) {
		return this.reviewExpandedIds().has(entryId);
	}

	toggleReview(entry: BacklogEntry, event: Event) {
		event.stopPropagation();
		if (!entry.hasReview || !entry.notes) return;
		const next = new Set(this.reviewExpandedIds());
		if (next.has(entry.id)) next.delete(entry.id);
		else next.add(entry.id);
		this.reviewExpandedIds.set(next);
	}

	openCreate() {
		this.openBacklog(null);
	}

	openEdit(entry: BacklogEntry, event?: Event) {
		if (event) {
			const target = event.target as HTMLElement;
			if (target.closest("a") || target.closest("button")) return;
		}
		this.openBacklog(entry);
	}

	private openBacklog(entry: BacklogEntry | null) {
		const ref = this.dialogs.open<BacklogModalData, BacklogModalResult>(
			BacklogModal,
			{
				data: {
					entry,
					preselectedGame: null,
					preselectedCompilationParent: null,
					preselectAddToQueue: false
				}
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadBacklog();
		});
	}

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadBacklog();
	}

	private buildBaseFilters(): BacklogFilters {
		const filters: BacklogFilters = {};

		const statuses = this.activeStatuses();
		if (statuses.size > 0) {
			filters.status = [...statuses].join(",");
		}

		if (this.selectedPlatform()) {
			filters.platform_id = this.selectedPlatform();
		}
		if (this.selectedPlatforms().size > 0) {
			filters.platforms = [...this.selectedPlatforms()].join(",");
		}
		if (this.selectedGenres().size > 0) {
			filters.genres = [...this.selectedGenres()].join(",");
		}
		if (this.yearFrom() !== null)
			filters.release_year_from = this.yearFrom()!;
		if (this.yearTo() !== null) filters.release_year_to = this.yearTo()!;
		if (this.startedFrom()) filters.started_from = this.startedFrom();
		if (this.startedTo()) filters.started_to = this.startedTo();
		if (this.finishedFrom()) filters.finished_from = this.finishedFrom();
		if (this.finishedTo()) filters.finished_to = this.finishedTo();
		if (this.minRating() !== null) filters.min_rating = this.minRating()!;
		if (this.maxRating() !== null) filters.max_rating = this.maxRating()!;
		if (this.minRealDuration() !== null)
			filters.min_real_duration = this.minRealDuration()!;
		if (this.maxRealDuration() !== null)
			filters.max_real_duration = this.maxRealDuration()!;
		if (this.minRatio() !== null) filters.min_ratio = this.minRatio()!;
		if (this.maxRatio() !== null) filters.max_ratio = this.maxRatio()!;
		if (this.minPersonalRatio() !== null)
			filters.min_personal_ratio = this.minPersonalRatio()!;
		if (this.maxPersonalRatio() !== null)
			filters.max_personal_ratio = this.maxPersonalRatio()!;
		if (this.selectedMoodTags().length > 0)
			filters.mood_tags = this.selectedMoodTags().join(",");
		if (this.coopOnly()) filters.coop_only = true;
		if (this.searchQuery().trim())
			filters.search = this.searchQuery().trim();

		return filters;
	}

	private loadSeq = 0;

	private loadBacklog() {
		const seq = ++this.loadSeq;
		this.isLoading.set(true);
		const base = this.buildBaseFilters();
		this.appliedFilters.set(base);
		const filters: BacklogFilters = {
			...base,
			limit: this.limit,
			offset: this.offset(),
			sort_by: this.sortBy(),
			sort_order: this.sortOrder()
		};

		this.backlogService.getMyBacklog(filters).subscribe({
			next: res => {
				if (seq !== this.loadSeq) return;
				this.entries.set(res.data.backlog);
				this.total.set(res.data.total);
				this.isLoading.set(false);
				this.isInitialLoad.set(false);
			},
			error: () => {
				if (seq !== this.loadSeq) return;
				this.isLoading.set(false);
				this.isInitialLoad.set(false);
			}
		});
	}
}
