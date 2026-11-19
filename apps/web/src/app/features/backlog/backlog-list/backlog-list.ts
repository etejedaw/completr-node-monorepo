import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	Injector,
	type OnInit,
	signal,
	untracked,
	viewChild
} from "@angular/core";
import {
	takeUntilDestroyed,
	toObservable,
	toSignal
} from "@angular/core/rxjs-interop";
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
import { FavoritesService } from "../../../core/services/favorites";
import { GamesService } from "../../../core/services/games";
import { MoodTagsService } from "../../../core/services/mood-tags";
import {
	type TagAppearance,
	type UserTag
} from "../../../core/services/mood-tags.model";
import { PlatinumService } from "../../../core/services/platinum";
import { PointerService } from "../../../core/services/pointer";
import { QueueService } from "../../../core/services/queue";
import { ReviewsService } from "../../../core/services/reviews";
import { StorageService } from "../../../core/services/storage";
import { ToastService } from "../../../core/services/toast";
import { BacklogEntryCard } from "../../../shared/components/backlog-entry-card/backlog-entry-card";
import { BacklogStatusPills } from "../../../shared/components/backlog-status-pills/backlog-status-pills";
import { BulkActionBar } from "../../../shared/components/bulk-action-bar/bulk-action-bar";
import { ExportActions } from "../../../shared/components/export-actions/export-actions";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import { ViewModeToggle } from "../../../shared/components/view-mode-toggle/view-mode-toggle";
import { type ViewModeOption } from "../../../shared/components/view-mode-toggle/view-mode-toggle.model";
import { SwipeActions } from "../../../shared/directives/swipe-actions";
import {
	UiActionMenu,
	type UiActionMenuItem,
	UiButton,
	UiCountBadge,
	UiEmptyState,
	UiFiltersButton,
	UiLoadError,
	UiMultiOptionPicker,
	UiNoMatches,
	UiOptionPicker,
	UiPagination,
	type UiPickerAction,
	type UiPickerOption,
	UiSkeleton
} from "../../../shared/ui";
import { appearanceColorHex } from "../../../shared/utils/appearance";
import {
	BACKLOG_STATUS_PICKER_OPTIONS,
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { gameArtUrl } from "../../../shared/utils/game-art";
import {
	isNotFound,
	reportHttpFailure
} from "../../../shared/utils/http-failure";
import { injectLatestLoader } from "../../../shared/utils/inject-latest-loader";
import { injectToggleAction } from "../../../shared/utils/inject-toggle-action";
import { BacklogService } from "../backlog";
import { type BacklogFilters } from "../backlog.model";
import {
	BACKLOG_BULK_NOUN,
	injectBacklogBulkActions
} from "../backlog-bulk-actions";
import { BacklogCalendar } from "../backlog-calendar/backlog-calendar";
import {
	BacklogModal,
	type BacklogModalResult
} from "../backlog-modal/backlog-modal";
import { type BacklogModalData } from "../backlog-modal/backlog-modal.model";
import {
	myTagOption,
	parseTagList,
	TAG_FILTER_LIMIT
} from "../backlog-tag-params";
import {
	BacklogFiltersPanel,
	type SortOrder
} from "../components/backlog-filters-panel/backlog-filters-panel";
import { BacklogTable } from "../components/backlog-table/backlog-table";
import { type BacklogTagFilterStatus } from "../components/backlog-tag-filter/backlog-tag-filter.model";
import { BulkRatingDialog } from "../components/bulk-rating-dialog/bulk-rating-dialog";
import { BulkStatusDialog } from "../components/bulk-status-dialog/bulk-status-dialog";
import { EntryRatingSheet } from "../components/entry-rating-sheet/entry-rating-sheet";
import { ReorderViewsDialog } from "../components/reorder-views-dialog/reorder-views-dialog";
import { SavedViewStats } from "../components/saved-view-stats/saved-view-stats";
import { SavedViewStatsPanel } from "../components/saved-view-stats-panel/saved-view-stats-panel";
import { StatusChangeDialog } from "../components/status-change-dialog/status-change-dialog";
import { type PendingStatusUpdate } from "../components/status-change-dialog/status-change-dialog.model";
import { SavedFiltersService } from "../saved-filters";
import { type SavedFilter } from "../saved-filters.model";
import { SurpriseMe } from "../surprise-me/surprise-me";
import { type ClearAction, type ViewSnapshot } from "./backlog-list.model";
import { injectViewStats } from "./inject-view-stats";
import {
	differsOnlyInUrlState,
	hasFilterParams,
	overlayFilterParams,
	plainUrlState,
	readUrlState,
	sameFilters,
	sameSnapshot,
	SAVED_VIEW_PARAM,
	snapshotQuery,
	SORT_BY_PARAM,
	SORT_ORDER_PARAM,
	type UrlState,
	urlStateKey,
	viewUrlState
} from "./view-url-state";

const MIXED_STATUS_VALUE = "__mixed__";

type BacklogViewMode = "diary" | "hardcore" | "calendar";

const NEW_VIEW_PARAM = "newView";

const EXIT_VIEW_ACTION: ClearAction = {
	label: "Exit view",
	description: "Exit the saved view and show all games",
	icon: "bookmark_remove"
};

const RESET_VIEW_ACTION: ClearAction = {
	label: "Reset view",
	description: "Discard your changes and go back to the saved view",
	icon: "restart_alt"
};

const SAVE_TO_VIEW_ID = "save-view";
const RESET_VIEW_ID = "reset-view";
const SORT_BY_PATTERN = /^[A-Za-z_]{1,50}$/;

function sameStatsFilters(
	a: Record<string, string> | null,
	b: Record<string, string> | null
): boolean {
	if (a === null || b === null) return a === b;
	return sameFilters(a, b);
}

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

const VIEW_MODE_STORAGE_KEY = "completr.backlog.viewMode";
const MOOD_TAGS_PARAM = "mood_tags";

function numberOrNull(value: string | undefined): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

@Component({
	selector: "app-backlog-list",
	imports: [
		ExportActions,
		ViewModeToggle,
		BacklogTable,
		BacklogStatusPills,
		UiMultiOptionPicker,
		UiOptionPicker,
		BacklogCalendar,
		SurpriseMe,
		BacklogEntryCard,
		LibraryHero,
		SwipeActions,
		UiButton,
		UiCountBadge,
		UiFiltersButton,
		UiEmptyState,
		UiLoadError,
		UiNoMatches,
		UiPagination,
		UiSkeleton,
		BacklogFiltersPanel,
		UiActionMenu,
		EntryRatingSheet,
		ReorderViewsDialog,
		SavedViewStats,
		SavedViewStatsPanel,
		StatusChangeDialog,
		BulkActionBar,
		BulkRatingDialog,
		BulkStatusDialog,
		PageSearch
	],
	templateUrl: "./backlog-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogList implements OnInit {
	private readonly destroyRef = inject(DestroyRef);
	private readonly storage = inject(StorageService);
	protected readonly backlogLoader = injectLatestLoader();
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly backlogService = inject(BacklogService);
	private readonly savedFiltersService = inject(SavedFiltersService);
	private readonly queueService = inject(QueueService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly favoriteToggle = injectToggleAction();
	private readonly queueToggle = injectToggleAction();
	private readonly gamesService = inject(GamesService);
	private readonly reviewsService = inject(ReviewsService);
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly platinumService = inject(PlatinumService);
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
	protected readonly ratingSheetEntry = signal<BacklogEntry | null>(null);

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

	protected readonly viewPickerOptions = computed<UiPickerOption[]>(() => [
		{ value: "", label: "None", icon: "bookmark_border" },
		...this.viewPickerViews().map(view => ({
			value: view.id,
			label: view.name,
			icon: view.icon || "bookmark_border",
			iconColor: view.icon ? this.colorHex(view.color) : null,
			hint: view.showInBacklog ? undefined : "Not pinned"
		}))
	]);

	protected readonly viewPickerActions = computed<UiPickerAction[]>(() => [
		...(this.viewModified()
			? [
					{
						id: SAVE_TO_VIEW_ID,
						label: "Save to view",
						icon: "save"
					},
					{
						id: RESET_VIEW_ID,
						label: "Reset view",
						icon: "restart_alt"
					}
				]
			: []),
		...(this.backlogFilters().length > 1
			? [
					{
						id: "reorder",
						label: "Reorder pinned views",
						icon: "swap_vert"
					}
				]
			: []),
		{
			id: "manage",
			label: "Manage saved views",
			icon: "settings",
			link: { routerLink: ["/saved-views"] }
		}
	]);

	protected readonly quickStatusIconColor = computed(() => {
		const single = this.singleActiveStatus();
		return single ? this.statusIconColor(single) : "text-fg-secondary";
	});
	protected readonly flippedEntryIds = signal<ReadonlySet<string>>(new Set());

	protected readonly heroPosters = computed(() =>
		this.entries().map(entry => ({
			src: gameArtUrl(entry.game, "portrait"),
			title: entry.game.title
		}))
	);
	protected readonly sortBy = signal("createdAt");
	protected readonly sortOrder = signal<SortOrder>("desc");
	protected readonly queueBacklogIds = signal<Set<string>>(new Set());
	protected readonly surpriseMeFilters = signal<BacklogFilters | null>(null);
	protected readonly pendingStatusUpdate = signal<PendingStatusUpdate | null>(
		null
	);
	protected readonly updatingStatusIds = signal<Set<string>>(new Set());
	protected readonly bulk = injectBacklogBulkActions({
		entries: this.entries,
		total: this.total,
		queuedIds: this.queueBacklogIds,
		reloadQueue: () => this.loadQueueIds()
	});
	protected readonly bulkNoun = BACKLOG_BULK_NOUN;
	private readonly queryParamMap = toSignal(this.route.queryParamMap);
	private readonly savedFiltersLoaded = signal(false);
	private eagerlyAppliedParams: ParamMap | null = null;
	private lastQueryParams: ParamMap | null = null;
	private newViewPending = false;
	private readonly pendingUrlStates: string[] = [];

	private readonly applyFromUrlEffect = effect(() => {
		const params = this.queryParamMap();
		if (!params) return;
		const filtersLoaded = this.savedFiltersLoaded();
		untracked(() => {
			const previous = this.lastQueryParams;
			this.lastQueryParams = params;
			if (previous && this.isOwnUrlSync(previous, params)) {
				if (this.eagerlyAppliedParams === previous)
					this.eagerlyAppliedParams = params;
				return;
			}
			if (params.has(NEW_VIEW_PARAM)) {
				this.startNewView();
				return;
			}
			if (this.newViewPending) {
				if (filtersLoaded) this.newViewPending = false;
				return;
			}
			if (!filtersLoaded) {
				if (params.get(SAVED_VIEW_PARAM)) return;
				this.eagerlyAppliedParams = params;
				this.applyFiltersFromUrl(params);
				return;
			}
			const hasDefault = this.savedFilters().some(f => f.isDefault);
			if (
				this.eagerlyAppliedParams === params &&
				(hasFilterParams(params) ||
					params.get("search") !== null ||
					!hasDefault)
			) {
				return;
			}
			this.eagerlyAppliedParams = null;
			this.applyFiltersFromUrl(params);
		});
	});

	protected readonly viewMode = signal<BacklogViewMode>(
		(this.storage.get(VIEW_MODE_STORAGE_KEY) as BacklogViewMode) || "diary"
	);

	protected readonly viewModes = BACKLOG_VIEW_MODES;

	protected setViewMode(mode: BacklogViewMode) {
		this.bulk.selection.clear();
		this.viewMode.set(mode);
		this.storage.set(VIEW_MODE_STORAGE_KEY, mode);
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
	private readonly myTags = signal<readonly UserTag[]>([]);
	protected readonly tagOptions = computed<UiPickerOption[]>(() =>
		[...this.myTags()]
			.sort(
				(a, b) =>
					b.usageCount - a.usageCount || a.tag.localeCompare(b.tag)
			)
			.map(myTagOption)
	);
	protected readonly tagAppearance = computed<
		ReadonlyMap<string, TagAppearance>
	>(
		() =>
			new Map(
				this.myTags().map(userTag => [
					userTag.tag,
					{ icon: userTag.icon, color: userTag.color }
				])
			)
	);
	protected readonly tagStatus = signal<BacklogTagFilterStatus>("loading");
	protected readonly tagPickerOptions = computed<UiPickerOption[]>(() => {
		const known = new Set(this.tagOptions().map(option => option.value));
		const missingSelected = this.selectedMoodTags()
			.filter(tag => !known.has(tag))
			.map(tag => ({ value: tag, label: tag }));
		return [...missingSelected, ...this.tagOptions()];
	});
	protected readonly coopOnly = signal(false);
	protected readonly platinumedOnly = signal(false);

	protected readonly appliedFilters = signal<BacklogFilters>({});
	protected readonly exportParams = computed<BacklogFilters>(() =>
		this.withSort(this.buildBaseFilters())
	);
	protected readonly savedFilters = signal<SavedFilter[]>([]);
	protected readonly backlogFilters = signal<SavedFilter[]>([]);
	protected readonly colorHex = appearanceColorHex;
	protected readonly activeFilterId = signal<string | null>(null);
	private readonly viewBaseline = signal<ViewSnapshot | null>(null);
	private readonly appliedSnapshot = signal<ViewSnapshot | null>(null);
	protected readonly viewModified = computed(() => {
		const baseline = this.viewBaseline();
		const applied = this.appliedSnapshot();
		return (
			this.activeView() !== null &&
			baseline !== null &&
			applied !== null &&
			!sameSnapshot(applied, baseline)
		);
	});
	private readonly storedViewFilters = signal<Record<string, string> | null>(
		null
	);
	private readonly statsAppliedFilters = computed(
		() => {
			const stored = this.storedViewFilters();
			const applied = this.appliedSnapshot();
			if (!this.activeView() || !stored || !applied) return null;
			if (sameFilters(applied.filters, stored)) return null;
			return snapshotQuery(applied);
		},
		{ equal: sameStatsFilters }
	);
	protected readonly activeFilterDescription = signal("");
	protected readonly newFilterName = signal("");
	protected readonly newFilterPinned = signal(true);
	protected readonly savingFilter = signal(false);
	protected readonly showReorderModal = signal(false);
	protected readonly savingReorder = signal(false);

	protected readonly viewStats = injectViewStats({
		activeFilterId: this.activeFilterId,
		appliedFilters: this.statsAppliedFilters,
		savedFilters: this.savedFilters,
		backlogFilters: this.backlogFilters
	});

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
		if (this.platinumedOnly()) count++;
		return count;
	};

	protected readonly clearAction = computed<ClearAction | null>(() => {
		if (this.activeFilterId())
			return this.viewModified() ? RESET_VIEW_ACTION : EXIT_VIEW_ACTION;
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
	}

	protected setPlatinumedOnly(value: boolean) {
		this.platinumedOnly.set(value);
	}

	protected runClearAction() {
		if (this.viewModified()) this.resetView();
		else this.clearFilters();
	}

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
			filters: this.savedFiltersService.getAll().pipe(
				catchError((error: unknown) => {
					reportHttpFailure(
						this.toast,
						error,
						"Couldn't load your saved views. Try again."
					);
					return of(null);
				})
			)
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ platforms, filters }) => {
				this.allPlatforms.set(platforms);
				if (filters) {
					this.savedFilters.set(filters);
					this.backlogFilters.set(
						filters.filter(f => f.showInBacklog)
					);
				}
				this.savedFiltersLoaded.set(true);
			});
		this.loadMyTags();
	}

	private loadMyTags() {
		this.tagStatus.set("loading");
		this.moodTagsService
			.getMyTags()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: tags => {
					this.myTags.set(tags);
					this.tagStatus.set("ready");
				},
				error: () => this.tagStatus.set("error")
			});
	}

	protected setTagSelection(tags: readonly string[]) {
		if (tags.length > TAG_FILTER_LIMIT) {
			this.warnTagLimit(TAG_FILTER_LIMIT);
			this.selectedMoodTags.set([...this.selectedMoodTags()]);
			return;
		}
		this.selectedMoodTags.set([...tags]);
		this.applyFilters();
	}

	protected retryTagFilter() {
		if (this.tagStatus() !== "error") return;
		this.loadMyTags();
	}

	protected warnTagLimit(limit: number) {
		this.toast.warning(`You can filter by up to ${limit} tags at a time.`);
	}

	private isOwnUrlSync(previous: ParamMap, next: ParamMap): boolean {
		if (previous === next || !differsOnlyInUrlState(previous, next))
			return false;
		const index = this.pendingUrlStates.indexOf(
			urlStateKey(readUrlState(next))
		);
		if (index < 0) return false;
		this.pendingUrlStates.splice(0, index + 1);
		return true;
	}

	private currentSnapshot(): ViewSnapshot {
		return {
			filters: this.buildFiltersObject(),
			sortBy: this.sortBy(),
			sortOrder: this.sortOrder()
		};
	}

	private desiredUrlState(): UrlState {
		const current = this.currentSnapshot();
		const view = this.activeView();
		const baseline = this.viewBaseline();
		if (view && baseline)
			return viewUrlState(view.id, view.isDefault, current, baseline);
		return plainUrlState(current);
	}

	private syncFiltersToUrl() {
		const desired = this.desiredUrlState();
		const desiredKey = urlStateKey(desired);
		const latestKey =
			this.pendingUrlStates.at(-1) ??
			urlStateKey(readUrlState(this.route.snapshot.queryParamMap));
		if (desiredKey === latestKey) return;
		this.pendingUrlStates.push(desiredKey);
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: desired,
			queryParamsHandling: "merge",
			replaceUrl: true
		});
	}

	private applyFiltersFromUrl(params: ParamMap) {
		const filterId = params.get(SAVED_VIEW_PARAM);
		if (filterId) {
			const match = this.savedFilters().find(f => f.id === filterId);
			if (match) {
				this.applySavedFilterFromUrl(match, params);
				return;
			}
		}

		const searchParam = params.get("search")?.trim();
		if (searchParam) {
			this.resetFilterState();
			this.searchQuery.set(searchParam);
			this.offset.set(0);
			this.loadBacklog();
			return;
		}

		if (hasFilterParams(params)) {
			this.resetFilterState();
			this.applyFilterRecord(overlayFilterParams({}, params));
			this.applySortParams(params);
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

	private applySavedFilterFromUrl(filter: SavedFilter, params?: ParamMap) {
		this.enterView(filter);
		const baseline = this.viewBaseline();
		if (params && baseline && hasFilterParams(params)) {
			this.applyFilterRecord(
				overlayFilterParams(baseline.filters, params)
			);
			this.applySortParams(params);
		}
		this.offset.set(0);
		this.loadBacklog();
	}

	private enterView(filter: SavedFilter) {
		this.applySavedFilterState(filter);
		this.activeFilterId.set(filter.id);
		this.activeFilterDescription.set(filter.description ?? "");
		const baseline = this.currentSnapshot();
		this.viewBaseline.set(baseline);
		this.storedViewFilters.set(baseline.filters);
	}

	private applySortParams(params: ParamMap) {
		const sortBy = params.get(SORT_BY_PARAM);
		const sortOrder = params.get(SORT_ORDER_PARAM);
		if (sortBy && SORT_BY_PATTERN.test(sortBy)) this.sortBy.set(sortBy);
		if (sortOrder === "asc" || sortOrder === "desc")
			this.sortOrder.set(sortOrder);
	}

	private applySavedFilterState(filter: SavedFilter) {
		this.applyFilterRecord(filter.filters as Record<string, string>);
		if (filter.sortBy) this.sortBy.set(filter.sortBy);
		if (filter.sortOrder) this.sortOrder.set(filter.sortOrder as SortOrder);
	}

	private applyFilterRecord(f: Record<string, string>) {
		this.selectedPlatforms.set(this.platformCodesOf(f));
		this.selectedGenres.set(
			f["genres"] ? new Set(f["genres"].split(",")) : new Set()
		);
		this.yearFrom.set(numberOrNull(f["release_year_from"]));
		this.yearTo.set(numberOrNull(f["release_year_to"]));
		this.startedFrom.set(f["started_from"] ?? "");
		this.startedTo.set(f["started_to"] ?? "");
		this.finishedFrom.set(f["finished_from"] ?? "");
		this.finishedTo.set(f["finished_to"] ?? "");
		this.minRating.set(numberOrNull(f["min_rating"]));
		this.maxRating.set(numberOrNull(f["max_rating"]));
		this.minRealDuration.set(numberOrNull(f["min_real_duration"]));
		this.maxRealDuration.set(numberOrNull(f["max_real_duration"]));
		this.minRatio.set(numberOrNull(f["min_ratio"]));
		this.maxRatio.set(numberOrNull(f["max_ratio"]));
		this.minPersonalRatio.set(numberOrNull(f["min_personal_ratio"]));
		this.maxPersonalRatio.set(numberOrNull(f["max_personal_ratio"]));
		this.selectedMoodTags.set(parseTagList(f[MOOD_TAGS_PARAM]));
		this.coopOnly.set(f["coop_only"] === "true");
		this.platinumedOnly.set(f["platinumed_only"] === "true");

		const status = f["status"];
		this.activeStatuses.set(
			new Set(status ? status.split(",").filter(Boolean) : [])
		);

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
		this.platinumedOnly.set(false);
		this.activeFilterId.set(null);
		this.activeFilterDescription.set("");
		this.viewBaseline.set(null);
		this.sortBy.set("createdAt");
		this.sortOrder.set("desc");
	}

	protected openSurpriseMe(): void {
		this.surpriseMeFilters.set(this.buildBaseFilters());
	}

	protected isInQueue(entry: BacklogEntry): boolean {
		return this.queueBacklogIds().has(entry.id);
	}

	protected loadQueueIds() {
		this.queueService.getMyQueueBacklogIds().subscribe(ids => {
			this.queueBacklogIds.set(new Set(ids));
		});
	}

	private loadSavedFilters() {
		this.savedFiltersService.getAll().subscribe({
			next: filters => {
				this.savedFilters.set(filters);
				this.backlogFilters.set(filters.filter(f => f.showInBacklog));
			},
			error: (error: unknown) =>
				reportHttpFailure(
					this.toast,
					error,
					"Couldn't load your views. Try again."
				)
		});
	}

	private openReorderModal() {
		this.showReorderModal.set(true);
	}

	protected closeReorderModal() {
		this.showReorderModal.set(false);
	}

	protected saveReorder(ids: string[]) {
		this.savingReorder.set(true);
		this.savedFiltersService.reorder(ids).subscribe({
			next: () => {
				this.savingReorder.set(false);
				this.showReorderModal.set(false);
				this.loadSavedFilters();
			},
			error: (error: unknown) => {
				this.savingReorder.set(false);
				if (isNotFound(error)) {
					this.toast.error("One of these views no longer exists.");
					this.showReorderModal.set(false);
					this.loadSavedFilters();
					return;
				}
				reportHttpFailure(
					this.toast,
					error,
					"Couldn't save the new order. Try again."
				);
			}
		});
	}

	protected setQuickStatus(status: string | null) {
		this.activeStatuses.set(status ? new Set([status]) : new Set());
		this.applyFilters();
	}

	protected openFilters() {
		this.viewStats.panelOpen.set(false);
		this.showFilters.set(true);
	}

	protected closeFilters() {
		this.showFilters.set(false);
		this.creatingView.set(false);
		this.returnFocusToToolsButton();
	}

	protected closeStatsPanel() {
		this.viewStats.panelOpen.set(false);
		this.returnFocusToToolsButton();
	}

	private readonly injector = inject(Injector);
	private readonly mobileToolsButton = viewChild<
		string,
		ElementRef<HTMLButtonElement>
	>("mobileToolsButton", { read: ElementRef });
	private readonly mobileToolsMenu = viewChild("mobileToolsMenu", {
		read: UiActionMenu
	});
	private focusToolsButtonOnClose = false;

	private returnFocusToToolsButton() {
		if (!this.focusToolsButtonOnClose) return;
		this.focusToolsButtonOnClose = false;
		afterNextRender(
			() => {
				const menu = this.mobileToolsMenu();
				if (menu) menu.focusTrigger();
				else
					this.mobileToolsButton()?.nativeElement.focus({
						preventScroll: true
					});
			},
			{ injector: this.injector }
		);
	}

	protected applyAndCloseFilters() {
		this.applyFilters();
		this.closeFilters();
	}

	protected readonly mobileToolsSubheading = computed(() => {
		const name = this.activeView()?.name ?? null;
		if (!name) return null;
		return this.viewModified() ? `${name} · Modified` : name;
	});

	protected readonly mobileToolsItems = computed<UiActionMenuItem[]>(() => {
		const filters = this.activeFiltersCount();
		const stats = this.viewStats.enabledCount();
		const viewActions: UiActionMenuItem[] = this.viewModified()
			? [
					{
						id: SAVE_TO_VIEW_ID,
						label: "Save to view",
						icon: "save",
						iconClass: "text-brand",
						hint: `Keep these filters in ${this.activeView()?.name}`,
						separated: true
					},
					{
						id: RESET_VIEW_ID,
						label: "Reset view",
						icon: "restart_alt",
						hint: "Go back to the saved filters"
					}
				]
			: [];
		return [
			{
				id: "filters",
				label: "Filters",
				icon: "tune",
				iconClass: "text-brand",
				hint:
					filters > 0
						? `${filters} active`
						: "Platform, rating, tags, genres and more"
			},
			{
				id: "stats",
				label: "Stats",
				icon: "insights",
				iconClass: "text-brand",
				hint:
					stats > 0
						? `${stats} visible`
						: "Choose which stats to show"
			},
			...viewActions
		];
	});

	protected runMobileTool(id: string) {
		if (id === "filters") this.openFiltersFromSheet();
		else if (id === "stats") this.openStatsFromSheet();
		else this.runViewAction(id);
	}

	protected setStatuses(values: readonly string[]) {
		this.activeStatuses.set(new Set(values));
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

	private applyFilters() {
		if (!this.activeFilterId()) this.saveCurrentFilter();
		this.offset.set(0);
		this.loadBacklog();
	}

	protected clearFilters() {
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
		this.platinumedOnly.set(false);
		this.activeFilterId.set(null);
		this.activeFilterDescription.set("");
		this.viewBaseline.set(null);
		this.sortBy.set("createdAt");
		this.sortOrder.set("desc");
		this.offset.set(0);
		this.loadBacklog();
	}

	private applySavedFilter(filter: SavedFilter) {
		if (this.activeFilterId() === filter.id) {
			this.clearFilters();
			this.showFilters.set(false);
			return;
		}

		this.enterView(filter);
		this.offset.set(0);
		this.loadBacklog();
	}

	protected updateCurrentFilter() {
		if (!this.activeView() || this.savingFilter()) return;
		this.offset.set(0);
		this.loadBacklog();
		this.saveToView();
	}

	private saveToView() {
		const view = this.activeView();
		const snapshot = this.appliedSnapshot();
		if (!view || !snapshot || this.savingFilter()) return;
		const previousBaseline = this.viewBaseline();
		const changes = {
			filters: snapshot.filters,
			sortBy: snapshot.sortBy,
			sortOrder: snapshot.sortOrder
		};
		this.savingFilter.set(true);
		this.viewBaseline.set(snapshot);
		this.replaceView({ ...view, ...changes });
		this.syncFiltersToUrl();
		this.savedFiltersService
			.update(view.id, changes)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: updated => {
					this.savingFilter.set(false);
					this.replaceView(updated);
					if (this.activeFilterId() === view.id)
						this.storedViewFilters.set(changes.filters);
					this.toast.success(`Saved your changes to ${view.name}.`);
				},
				error: (error: unknown) => {
					this.savingFilter.set(false);
					this.replaceView(view);
					if (this.activeFilterId() === view.id) {
						this.viewBaseline.set(previousBaseline);
						this.syncFiltersToUrl();
					}
					this.reportViewWriteFailure(
						error,
						`Couldn't save your changes to ${view.name}. Try again.`
					);
				}
			});
	}

	private resetView() {
		const baseline = this.viewBaseline();
		if (!this.activeView() || !baseline) return;
		this.applyFilterRecord(baseline.filters);
		this.sortBy.set(baseline.sortBy);
		this.sortOrder.set(baseline.sortOrder);
		this.offset.set(0);
		this.loadBacklog();
	}

	private replaceView(replacement: SavedFilter) {
		const swap = (views: SavedFilter[]) =>
			views.map(view =>
				view.id === replacement.id ? replacement : view
			);
		this.savedFilters.update(swap);
		this.backlogFilters.update(swap);
	}

	private reportViewWriteFailure(error: unknown, message: string) {
		if (isNotFound(error)) {
			this.toast.error("This view no longer exists.");
			this.clearFilters();
			this.loadSavedFilters();
			return;
		}
		reportHttpFailure(this.toast, error, message);
	}

	private deleteSavedFilter(filter: SavedFilter) {
		this.savedFiltersService.delete(filter.id).subscribe({
			next: () => {
				this.loadSavedFilters();
				if (this.activeFilterId() === filter.id) {
					this.activeFilterId.set(null);
				}
			},
			error: (error: unknown) => {
				if (isNotFound(error)) {
					this.loadSavedFilters();
					if (this.activeFilterId() === filter.id)
						this.activeFilterId.set(null);
					return;
				}
				reportHttpFailure(
					this.toast,
					error,
					"Couldn't delete this view."
				);
			}
		});
	}

	protected saveCurrentFilter() {
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
				error: (error: unknown) => {
					this.savingFilter.set(false);
					reportHttpFailure(
						this.toast,
						error,
						"Couldn't save this view."
					);
				}
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
			filters[MOOD_TAGS_PARAM] = this.selectedMoodTags().join(",");
		if (this.coopOnly()) filters["coop_only"] = "true";
		if (this.platinumedOnly()) filters["platinumed_only"] = "true";
		return filters;
	}

	private readonly searchSubject = new Subject<string>();

	protected onSearch(query: string) {
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
			.pipe(
				debounceTime(300),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(() => {
				this.offset.set(0);
				this.loadBacklog();
			});
	}

	protected sort(column: string) {
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

	protected onQuickRate(entry: BacklogEntry, rating: number | null) {
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

	protected isStatusUpdating(entry: BacklogEntry): boolean {
		return this.updatingStatusIds().has(entry.id);
	}

	protected selectNewStatus(
		entry: BacklogEntry,
		status: BacklogStatus,
		event?: Event
	) {
		event?.stopPropagation();
		const newStatus = status;
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
			notes: entry.notes ?? "",
			markPlatinum: false,
			platinumedAt: today
		});
	}

	protected cancelStatusChange() {
		this.pendingStatusUpdate.set(null);
	}

	protected updatePendingStatus(patch: Partial<PendingStatusUpdate>) {
		this.pendingStatusUpdate.update(s => (s ? { ...s, ...patch } : s));
	}

	protected saveAndOpenReview() {
		const pending = this.pendingStatusUpdate();
		if (!pending) return;
		const gameCode = pending.entry.game.code;
		this.updatePendingStatus({ reviewToggle: false });
		this.confirmStatusChange();
		this.router.navigate(["/games", gameCode], {
			queryParams: { review: "open" }
		});
	}

	protected confirmStatusChange() {
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
		const shouldMarkPlatinum =
			status === "completed" && pending.markPlatinum && !entry.platinum;

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
					this.entries().map(e =>
						e.id === entry.id
							? { ...backlog, platinum: e.platinum }
							: e
					)
				);
				if (queueRemoved) this.loadQueueIds();
				if (shouldMarkPlatinum)
					this.markRunAsPlatinum(entry, pending.platinumedAt);

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

	private markRunAsPlatinum(entry: BacklogEntry, platinumedAt: string) {
		this.platinumService
			.save(entry.game.id, {
				backlogId: entry.id,
				platinumedAt: platinumedAt || null
			})
			.subscribe({
				next: platinum => {
					this.entries.set(
						this.entries().map(e =>
							e.game.id === entry.game.id ? { ...e, platinum } : e
						)
					);
					this.toast.success(`${entry.game.title} platinumed`);
				},
				error: () =>
					this.toast.error(
						`Status saved, but ${entry.game.title} could not be marked as platinumed`
					)
			});
	}

	private todayDateString(): string {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}

	protected hasAdvancedFiltersActive(): boolean {
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

	protected isFavorite(gameId: string): boolean {
		return this.favoritesService.isFavorite(gameId);
	}

	protected toggleFavorite(gameId: string, event?: Event) {
		event?.stopPropagation();
		this.favoriteToggle.run({
			key: gameId,
			request: this.favoritesService.toggle(gameId),
			failureMessage: "Couldn't update your favorites. Try again."
		});
	}

	protected toggleQueue(entry: BacklogEntry) {
		this.queueToggle.run({
			key: entry.id,
			request: this.isInQueue(entry)
				? this.queueService.removeByBacklogId(entry.id)
				: this.queueService.addFromBacklog(entry.id),
			failureMessage: "Couldn't update Up Next. Try again.",
			missingMessage: "This run no longer exists.",
			onSuccess: () => this.loadQueueIds(),
			onMissing: () => this.loadQueueIds()
		});
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
		this.closeFilters();
		this.viewStats.togglePanel();
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
		else if (id === SAVE_TO_VIEW_ID) this.saveToView();
		else if (id === RESET_VIEW_ID) this.resetView();
	}

	protected isFlipped(entryId: string): boolean {
		return this.flippedEntryIds().has(entryId);
	}

	protected toggleFlip(entry: BacklogEntry, event: Event) {
		event.stopPropagation();
		const next = new Set(this.flippedEntryIds());
		if (next.has(entry.id)) next.delete(entry.id);
		else next.add(entry.id);
		this.flippedEntryIds.set(next);
	}

	protected openCreate() {
		this.openBacklog(null);
	}

	protected openEdit(entry: BacklogEntry, event?: Event) {
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

	protected onOffsetChange(offset: number) {
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
		if (this.platinumedOnly()) filters.platinumed_only = true;
		if (this.searchQuery().trim())
			filters.search = this.searchQuery().trim();

		return filters;
	}

	private withSort(filters: BacklogFilters): BacklogFilters {
		return {
			...filters,
			sort_by: this.sortBy(),
			sort_order: this.sortOrder()
		};
	}

	protected loadBacklog() {
		this.isLoading.set(true);
		const base = this.buildBaseFilters();
		this.appliedFilters.set(base);
		this.appliedSnapshot.set(this.currentSnapshot());
		this.syncFiltersToUrl();
		const filters: BacklogFilters = {
			...this.withSort(base),
			limit: this.limit,
			offset: this.offset()
		};

		this.backlogLoader.load(this.backlogService.getMyBacklog(filters), {
			next: res => {
				this.entries.set(this.bulk.withoutPending(res.data.backlog));
				this.total.set(res.data.total);
				this.isLoading.set(false);
				this.isInitialLoad.set(false);
			},
			error: () => {
				this.isLoading.set(false);
				this.isInitialLoad.set(false);
			}
		});
	}
}
