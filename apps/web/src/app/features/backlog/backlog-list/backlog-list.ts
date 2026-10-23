import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	Injector,
	type OnInit,
	signal,
	untracked,
	viewChild
} from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, type ParamMap, Router } from "@angular/router";
import {
	catchError,
	debounceTime,
	distinctUntilChanged,
	forkJoin,
	map,
	of,
	startWith,
	Subject,
	switchMap
} from "rxjs";

import {
	type BacklogEntry,
	type BacklogStatus,
	type Genre,
	type Platform
} from "../../../core/models";
import { DialogService } from "../../../core/services/dialog";
import { PointerService } from "../../../core/services/pointer";
import { ToastService } from "../../../core/services/toast";
import {
	BacklogEntryCard,
	type BacklogStatusOption
} from "../../../shared/components/backlog-entry-card/backlog-entry-card";
import { BacklogStatusPills } from "../../../shared/components/backlog-status-pills/backlog-status-pills";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	OptionPicker,
	type PickerAction,
	type PickerOption
} from "../../../shared/components/option-picker/option-picker";
import {
	type ViewModeOption,
	ViewModeToggle
} from "../../../shared/components/view-mode-toggle/view-mode-toggle";
import { SwipeActions } from "../../../shared/directives/swipe-actions";
import {
	UiButton,
	UiCountBadge,
	UiEmptyState,
	UiNoMatches,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import {
	BACKLOG_STATUS_FILTERS,
	BACKLOG_STATUS_PICKER_OPTIONS,
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { FavoritesService } from "../../favorites/favorites";
import { GamesService } from "../../games/games";
import { ReviewsService } from "../../games/reviews";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import { QueueService } from "../../queue/queue";
import { type BacklogFilters, BacklogService } from "../backlog";
import { BacklogCalendar } from "../backlog-calendar/backlog-calendar";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "../backlog-modal/backlog-modal";
import {
	BacklogFiltersPanel,
	type SortOrder
} from "../components/backlog-filters-panel/backlog-filters-panel";
import { BacklogTable } from "../components/backlog-table/backlog-table";
import { BacklogToolsSheet } from "../components/backlog-tools-sheet/backlog-tools-sheet";
import { EntryRatingSheet } from "../components/entry-rating-sheet/entry-rating-sheet";
import { EntryStatusSheet } from "../components/entry-status-sheet/entry-status-sheet";
import { ReorderViewsDialog } from "../components/reorder-views-dialog/reorder-views-dialog";
import { SavedViewStats } from "../components/saved-view-stats/saved-view-stats";
import { SavedViewStatsPanel } from "../components/saved-view-stats-panel/saved-view-stats-panel";
import {
	type PendingStatusUpdate,
	StatusChangeDialog
} from "../components/status-change-dialog/status-change-dialog";
import { savedFilterColorHex } from "../saved-filter-appearance";
import {
	DEFAULT_ENABLED_STATS,
	type SavedFilter,
	SavedFiltersService,
	type SavedFilterStats,
	STAT_KEYS,
	type StatKey
} from "../saved-filters";
import { SurpriseMe } from "../surprise-me/surprise-me";

const MIXED_STATUS_VALUE = "__mixed__";

type BacklogViewMode = "diary" | "hardcore" | "calendar";

const NEW_VIEW_PARAM = "newView";

interface ClearAction {
	label: string;
	description: string;
	icon: string;
}

const EXIT_VIEW_ACTION: ClearAction = {
	label: "Exit view",
	description: "Exit the saved view and show all games",
	icon: "bookmark_remove"
};

const BACKLOG_VIEW_MODES: readonly ViewModeOption<BacklogViewMode>[] = [
	{
		value: "diary",
		label: "Diary",
		icon: "view_agenda",
		title: "Diary view"
	},
	{
		value: "hardcore",
		label: "Hardcore",
		icon: "table_rows",
		title: "Hardcore (table) view"
	},
	{
		value: "calendar",
		label: "Calendar",
		icon: "calendar_month",
		title: "Calendar view"
	}
];

@Component({
	selector: "app-backlog-list",
	imports: [
		ViewModeToggle,
		BacklogTable,
		BacklogStatusPills,
		OptionPicker,
		BacklogCalendar,
		SurpriseMe,
		BacklogEntryCard,
		LibraryHero,
		SwipeActions,
		UiButton,
		UiCountBadge,
		UiEmptyState,
		UiNoMatches,
		UiPagination,
		UiSearchBar,
		UiSkeleton,
		BacklogFiltersPanel,
		BacklogToolsSheet,
		EntryRatingSheet,
		EntryStatusSheet,
		ReorderViewsDialog,
		SavedViewStats,
		SavedViewStatsPanel,
		StatusChangeDialog
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
	protected readonly pointer = inject(PointerService);
	protected readonly statusSheetEntry = signal<BacklogEntry | null>(null);
	protected readonly ratingSheetEntry = signal<BacklogEntry | null>(null);
	protected readonly toolsSheetOpen = signal(false);

	protected readonly activeView = computed(
		() =>
			this.savedFilters().find(
				view => view.id === this.activeFilterId()
			) ?? null
	);

	private readonly singleActiveStatus = computed(() => {
		const active = this.activeStatuses();
		return active.size === 1 ? ([...active][0] as BacklogStatus) : null;
	});

	protected readonly quickStatusLabel = computed(() => {
		const count = this.activeStatuses().size;
		const single = this.singleActiveStatus();
		if (count === 0) return "All games";
		if (single) return this.statusLabel(single);
		return `${count} statuses`;
	});

	protected readonly quickStatusIcon = computed(() => {
		const count = this.activeStatuses().size;
		const single = this.singleActiveStatus();
		if (count === 0) return "apps";
		if (single) return this.statusIcon(single);
		return "filter_list";
	});

	protected readonly statusPickerOptions = BACKLOG_STATUS_PICKER_OPTIONS;
	protected readonly selectedStatuses = computed(() => [
		...this.activeStatuses()
	]);

	protected readonly statusPickerValue = computed(() => {
		if (this.activeStatuses().size === 0) return "";
		return this.singleActiveStatus() ?? MIXED_STATUS_VALUE;
	});

	protected readonly viewPickerViews = computed(() => {
		const pinned = this.backlogFilters();
		const active = this.activeView();
		return active && !active.showInBacklog ? [...pinned, active] : pinned;
	});

	protected readonly viewPickerOptions = computed<PickerOption[]>(() => [
		{ value: "", label: "None", icon: "bookmark_border" },
		...this.viewPickerViews().map(view => ({
			value: view.id,
			label: view.name,
			icon: view.icon || "bookmark_border",
			iconColor: view.icon ? this.colorHex(view.color) : null,
			hint: view.showInBacklog ? undefined : "Not pinned"
		}))
	]);

	protected readonly viewPickerActions = computed<PickerAction[]>(() => [
		...(this.backlogFilters().length > 1
			? [
					{
						id: "reorder",
						label: "Reorder pinned views",
						icon: "swap_vert"
					}
				]
			: []),
		{ id: "manage", label: "Manage saved views", icon: "settings" }
	]);

	protected readonly quickStatusIconColor = computed(() => {
		const single = this.singleActiveStatus();
		return single ? this.statusIconColor(single) : "text-fg-secondary";
	});
	protected readonly flippedEntryIds = signal<ReadonlySet<string>>(new Set());

	protected readonly heroPosters = computed(() =>
		this.entries().map(entry => ({
			src: entry.game.backgroundUrl,
			title: entry.game.title
		}))
	);
	protected readonly sortBy = signal("createdAt");
	protected readonly sortOrder = signal<SortOrder>("desc");
	protected readonly queueBacklogIds = signal<Set<string>>(new Set());
	protected readonly surpriseMeFilters = signal<BacklogFilters | null>(null);
	protected readonly statusMenuOpenId = signal<string | null>(null);
	protected readonly pendingStatusUpdate = signal<PendingStatusUpdate | null>(
		null
	);
	protected readonly updatingStatusIds = signal<Set<string>>(new Set());
	private readonly queryParamMap = toSignal(this.route.queryParamMap);
	private readonly savedFiltersLoaded = signal(false);
	private eagerlyAppliedParams: ParamMap | null = null;
	private newViewPending = false;

	private readonly applyFromUrlEffect = effect(() => {
		const params = this.queryParamMap();
		if (!params) return;
		const filtersLoaded = this.savedFiltersLoaded();
		untracked(() => {
			if (params.has(NEW_VIEW_PARAM)) {
				this.startNewView();
				return;
			}
			if (this.newViewPending) {
				if (filtersLoaded) this.newViewPending = false;
				return;
			}
			if (!filtersLoaded) {
				if (params.get("savedFilterId")) return;
				this.eagerlyAppliedParams = params;
				this.applyFiltersFromUrl(params);
				return;
			}
			const hasDefault = this.savedFilters().some(f => f.isDefault);
			if (
				this.eagerlyAppliedParams === params &&
				(params.get("status") !== null ||
					params.get("mood_tags") !== null ||
					!hasDefault)
			) {
				return;
			}
			this.eagerlyAppliedParams = null;
			this.applyFiltersFromUrl(params);
		});
	});

	protected readonly viewMode = signal<BacklogViewMode>(
		(localStorage.getItem(
			"completr.backlog.viewMode"
		) as BacklogViewMode) || "diary"
	);

	protected readonly viewModes = BACKLOG_VIEW_MODES;

	setViewMode(mode: BacklogViewMode) {
		this.viewMode.set(mode);
		localStorage.setItem("completr.backlog.viewMode", mode);
	}

	protected readonly showFilters = signal(false);
	protected readonly creatingView = signal(false);
	protected readonly showAdvancedFilters = signal(false);
	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly allGenres = signal<Genre[]>([]);
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
	protected readonly savingReorder = signal(false);

	protected readonly stats = signal<SavedFilterStats | null>(null);
	protected readonly statsLoading = signal(false);
	protected readonly statsError = signal(false);
	protected readonly statsExpanded = signal(
		localStorage.getItem("completr.backlog.statsExpanded") === "true"
	);
	protected readonly showStatsPanel = signal(false);
	protected readonly statsConfigSaving = signal(false);

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

	protected readonly enabledStatKeys = computed<ReadonlySet<StatKey>>(() => {
		const enabled = this.getActiveFilter()?.enabledStats;
		if (enabled === undefined || enabled === null)
			return new Set(DEFAULT_ENABLED_STATS);
		return new Set(STAT_KEYS.filter(key => enabled.includes(key)));
	});

	protected hasAnyStatEnabled(): boolean {
		return this.enabledStatKeys().size > 0;
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

	protected readonly hasActiveFilters = () => this.activeFiltersCount() > 0;

	protected readonly activeFiltersCount = () => {
		let count = 0;
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

	protected readonly clearAction = computed<ClearAction | null>(() => {
		if (this.activeFilterId()) return EXIT_VIEW_ACTION;
		const count = this.activeFiltersCount();
		if (count === 0) return null;
		return {
			label: `Clear (${count})`,
			description: `Clear ${count} active ${count === 1 ? "filter" : "filters"}`,
			icon: "filter_alt_off"
		};
	});

	protected setCoopOnly(value: boolean) {
		this.coopOnly.set(value);
		this.activeFilterId.set(null);
	}

	protected readonly statusFilters: BacklogStatusOption[] = [
		...BACKLOG_STATUS_FILTERS
	];

	private readonly previewFilters = computed(
		() => (this.showFilters() ? this.buildBaseFilters() : null),
		{ equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
	);

	protected readonly previewTotal = toSignal(
		toObservable(this.previewFilters).pipe(
			debounceTime(250),
			switchMap(filters =>
				filters
					? this.backlogService
							.getMyBacklog({ ...filters, limit: 1 })
							.pipe(
								map(res => res.data.total),
								catchError(() => of(null)),
								startWith(null)
							)
					: of(null)
			)
		),
		{ initialValue: null }
	);

	ngOnInit() {
		this.setupSearch();
		this.loadQueueIds();
		this.favoritesService.ensureIdsLoaded().subscribe();
		this.gamesService.getGenres().subscribe(g => this.allGenres.set(g));
		forkJoin({
			platforms: this.gamesService
				.getPlatforms()
				.pipe(catchError(() => of([]))),
			filters: this.savedFiltersService.getAll()
		}).subscribe(({ platforms, filters }) => {
			this.allPlatforms.set(platforms);
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

		const moodTagsParam = params.get("mood_tags");
		if (moodTagsParam) {
			this.resetFilterState();
			this.selectedMoodTags.set(moodTagsParam.split(",").filter(Boolean));
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
		this.selectedPlatforms.set(this.platformCodesOf(f));
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
		if (filter.sortOrder) this.sortOrder.set(filter.sortOrder as SortOrder);

		if (this.hasAdvancedFiltersActive()) this.showAdvancedFilters.set(true);
	}

	private platformCodesOf(filters: Record<string, string>): Set<string> {
		const codes = new Set(
			filters["platforms"]?.split(",").filter(Boolean) ?? []
		);
		const legacyPlatform = this.allPlatforms().find(
			platform => platform.id === filters["platform_id"]
		);
		if (legacyPlatform) codes.add(legacyPlatform.code);
		return codes;
	}

	private resetFilterState() {
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
	}

	protected openSurpriseMe(): void {
		this.surpriseMeFilters.set(this.buildBaseFilters());
	}

	isInQueue(entry: BacklogEntry): boolean {
		return this.queueBacklogIds().has(entry.id);
	}

	protected loadQueueIds() {
		this.queueService.getMyQueueBacklogIds().subscribe(ids => {
			this.queueBacklogIds.set(new Set(ids));
		});
	}

	private loadSavedFilters() {
		this.savedFiltersService.getAll().subscribe(filters => {
			this.savedFilters.set(filters);
			this.backlogFilters.set(filters.filter(f => f.showInBacklog));
		});
	}

	openReorderModal() {
		this.showReorderModal.set(true);
	}

	closeReorderModal() {
		this.showReorderModal.set(false);
	}

	saveReorder(ids: string[]) {
		this.savingReorder.set(true);
		this.savedFiltersService.reorder(ids).subscribe({
			next: () => {
				this.savingReorder.set(false);
				this.showReorderModal.set(false);
				this.loadSavedFilters();
			},
			error: () => this.savingReorder.set(false)
		});
	}

	setQuickStatus(status: string | null) {
		this.activeStatuses.set(status ? new Set([status]) : new Set());
		this.applyFilters();
	}

	protected openFilters() {
		this.showStatsPanel.set(false);
		this.toolsSheetOpen.set(false);
		this.showFilters.set(true);
	}

	protected closeFilters() {
		this.showFilters.set(false);
		this.creatingView.set(false);
		this.returnFocusToToolsButton();
	}

	protected closeStatsPanel() {
		this.showStatsPanel.set(false);
		this.returnFocusToToolsButton();
	}

	private readonly injector = inject(Injector);
	private readonly mobileToolsButton = viewChild<
		string,
		ElementRef<HTMLButtonElement>
	>("mobileToolsButton", { read: ElementRef });
	private focusToolsButtonOnClose = false;

	private returnFocusToToolsButton() {
		if (!this.focusToolsButtonOnClose) return;
		this.focusToolsButtonOnClose = false;
		afterNextRender(
			() =>
				this.mobileToolsButton()?.nativeElement.focus({
					preventScroll: true
				}),
			{ injector: this.injector }
		);
	}

	protected applyAndCloseFilters() {
		this.applyFilters();
		this.closeFilters();
	}

	protected openMobileTools() {
		if (this.activeFilterId()) this.toolsSheetOpen.set(true);
		else this.openFilters();
	}

	protected setStatuses(values: readonly string[]) {
		this.activeStatuses.set(new Set(values));
		this.activeFilterId.set(null);
	}

	private startNewView() {
		this.newViewPending = true;
		this.clearFilters();
		this.newFilterName.set("");
		this.newFilterPinned.set(true);
		this.openFilters();
		this.creatingView.set(true);
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { [NEW_VIEW_PARAM]: null },
			queryParamsHandling: "merge",
			replaceUrl: true
		});
	}

	applyFilters() {
		if (!this.activeFilterId()) this.saveCurrentFilter();
		this.activeFilterId.set(null);
		this.offset.set(0);
		this.loadBacklog();
	}

	clearFilters() {
		this.searchQuery.set("");
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
				error: () => this.savingFilter.set(false)
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
				error: () => this.savingFilter.set(false)
			});
	}

	private buildFiltersObject(): Record<string, string> {
		const filters: Record<string, string> = {};
		const statuses = this.activeStatuses();
		if (statuses.size > 0) filters["status"] = [...statuses].join(",");
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

	protected statusLabel = backlogStatusLabel;
	protected statusIcon = backlogStatusIcon;
	protected statusIconColor = backlogStatusIconColor;

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
		if (this.pointer.isCoarse()) {
			this.statusSheetEntry.set(entry);
			return;
		}
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
			reviewContent: "",
			notes: entry.notes ?? ""
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
		const allowsNotes = hasFinishedAt;
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
			notes?: string | null;
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
		const notes = pending.notes.trim();
		if (allowsNotes && notes !== (entry.notes ?? "").trim()) {
			payload.notes = notes || null;
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

	hasAdvancedFiltersActive(): boolean {
		return (
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

	isFavorite(gameId: string): boolean {
		return this.favoritesService.isFavorite(gameId);
	}

	toggleFavorite(gameId: string, event?: Event) {
		event?.stopPropagation();
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

	protected selectStatusFromSheet(
		entry: BacklogEntry,
		status: string,
		event: Event
	) {
		this.statusSheetEntry.set(null);
		this.selectNewStatus(entry, status, event);
	}

	protected openRatingSheet(entry: BacklogEntry, event: Event) {
		event.stopPropagation();
		this.ratingSheetEntry.set(entry);
	}

	protected saveRatingSheet(entry: BacklogEntry, value: number | null) {
		this.ratingSheetEntry.set(null);
		if (value !== (entry.userRating ?? null)) {
			this.onQuickRate(entry, value);
		}
	}

	protected openFiltersFromSheet() {
		this.openFilters();
		this.focusToolsButtonOnClose = true;
	}

	protected openStatsFromSheet() {
		this.toolsSheetOpen.set(false);
		this.closeFilters();
		this.toggleStatsPanel();
		this.focusToolsButtonOnClose = true;
	}

	protected pickStatus(value: string) {
		if (value === MIXED_STATUS_VALUE) return;
		this.setQuickStatus(value || null);
	}

	protected pickView(id: string) {
		if (!id) {
			if (this.activeFilterId()) {
				this.clearFilters();
				this.showFilters.set(false);
			}
			return;
		}
		const view = this.backlogFilters().find(item => item.id === id);
		if (view && view.id !== this.activeFilterId())
			this.applySavedFilter(view);
	}

	protected runViewAction(id: string) {
		if (id === "reorder") this.openReorderModal();
		if (id === "manage") this.router.navigate(["/saved-views"]);
	}

	protected isFlipped(entryId: string): boolean {
		return this.flippedEntryIds().has(entryId);
	}

	protected toggleFlip(entry: BacklogEntry, event: Event) {
		event.stopPropagation();
		this.statusMenuOpenId.set(null);
		const next = new Set(this.flippedEntryIds());
		if (next.has(entry.id)) next.delete(entry.id);
		else next.add(entry.id);
		this.flippedEntryIds.set(next);
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
