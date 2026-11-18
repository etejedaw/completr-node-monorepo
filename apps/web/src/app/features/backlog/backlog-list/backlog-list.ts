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
	rxResource,
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
	type UiChipOption,
	UiCountBadge,
	UiEmptyState,
	UiFiltersButton,
	UiLoadError,
	UiNoMatches,
	UiOptionPicker,
	UiPagination,
	type UiPickerAction,
	type UiPickerOption,
	UiSkeleton
} from "../../../shared/ui";
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
import { MoodTagsService } from "../../mood-tags/mood-tags";
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
	joinTagList,
	myTagOption,
	parseTagList,
	popularTagOption
} from "../backlog-tag-params";
import {
	BacklogFiltersPanel,
	type SortOrder
} from "../components/backlog-filters-panel/backlog-filters-panel";
import { BacklogTable } from "../components/backlog-table/backlog-table";
import { BacklogTagFilter } from "../components/backlog-tag-filter/backlog-tag-filter";
import { type BacklogTagFilterStatus } from "../components/backlog-tag-filter/backlog-tag-filter.model";
import { BulkRatingDialog } from "../components/bulk-rating-dialog/bulk-rating-dialog";
import { BulkStatusDialog } from "../components/bulk-status-dialog/bulk-status-dialog";
import { EntryRatingSheet } from "../components/entry-rating-sheet/entry-rating-sheet";
import { ReorderViewsDialog } from "../components/reorder-views-dialog/reorder-views-dialog";
import { SavedViewStats } from "../components/saved-view-stats/saved-view-stats";
import { SavedViewStatsPanel } from "../components/saved-view-stats-panel/saved-view-stats-panel";
import { StatusChangeDialog } from "../components/status-change-dialog/status-change-dialog";
import { type PendingStatusUpdate } from "../components/status-change-dialog/status-change-dialog.model";
import { savedFilterColorHex } from "../saved-filter-appearance";
import { SavedFiltersService } from "../saved-filters";
import { type SavedFilter } from "../saved-filters.model";
import { SurpriseMe } from "../surprise-me/surprise-me";
import { type BacklogTagSource, type ClearAction } from "./backlog-list.model";
import { injectViewStats } from "./inject-view-stats";

const MIXED_STATUS_VALUE = "__mixed__";

type BacklogViewMode = "diary" | "hardcore" | "calendar";

const NEW_VIEW_PARAM = "newView";

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

const VIEW_MODE_STORAGE_KEY = "completr.backlog.viewMode";
const TAG_SOURCE_STORAGE_KEY = "completr.backlog.tagSource";
const MOOD_TAGS_PARAM = "mood_tags";
const COMMUNITY_TAGS_PARAM = "community_tags";
const TAG_PARAMS: ReadonlySet<string> = new Set([
	MOOD_TAGS_PARAM,
	COMMUNITY_TAGS_PARAM
]);

function differsOnlyInTagParams(previous: ParamMap, next: ParamMap) {
	const keys = new Set([...previous.keys, ...next.keys]);
	return [...keys].every(
		key =>
			TAG_PARAMS.has(key) ||
			JSON.stringify(previous.getAll(key)) ===
				JSON.stringify(next.getAll(key))
	);
}

@Component({
	selector: "app-backlog-list",
	imports: [
		ExportActions,
		ViewModeToggle,
		BacklogTable,
		BacklogTagFilter,
		BacklogStatusPills,
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

	private readonly applyFromUrlEffect = effect(() => {
		const params = this.queryParamMap();
		if (!params) return;
		const filtersLoaded = this.savedFiltersLoaded();
		untracked(() => {
			const previous = this.lastQueryParams;
			this.lastQueryParams = params;
			if (previous && this.isOwnTagSync(previous, params)) {
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
				if (params.get("savedFilterId")) return;
				this.eagerlyAppliedParams = params;
				this.applyFiltersFromUrl(params);
				return;
			}
			const hasDefault = this.savedFilters().some(f => f.isDefault);
			if (
				this.eagerlyAppliedParams === params &&
				(params.get("status") !== null ||
					params.get(MOOD_TAGS_PARAM) !== null ||
					params.get(COMMUNITY_TAGS_PARAM) !== null ||
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
	protected readonly selectedCommunityTags = signal<string[]>([]);
	private readonly myTagOptions = signal<UiChipOption[]>([]);
	private readonly myTagsStatus = signal<BacklogTagFilterStatus>("loading");
	protected readonly tagSource = signal<BacklogTagSource>(
		this.storage.get(TAG_SOURCE_STORAGE_KEY) === "community"
			? "community"
			: "mine"
	);
	private readonly communityTagsRequested = signal(
		this.tagSource() === "community"
	);
	private readonly popularTagsResource = rxResource({
		params: () => (this.communityTagsRequested() ? true : undefined),
		stream: () => this.backlogService.getPopularTags()
	});
	private readonly communityTagOptions = computed(() =>
		this.popularTagsResource.hasValue()
			? this.popularTagsResource.value().map(popularTagOption)
			: []
	);
	private readonly communityTagsStatus = computed<BacklogTagFilterStatus>(
		() => {
			if (this.popularTagsResource.error()) return "error";
			return this.popularTagsResource.hasValue() ? "ready" : "loading";
		}
	);
	protected readonly tagFilterOptions = computed(() =>
		this.tagSource() === "mine"
			? this.myTagOptions()
			: this.communityTagOptions()
	);
	protected readonly tagFilterSelected = computed(() =>
		this.tagSource() === "mine"
			? this.selectedMoodTags()
			: this.selectedCommunityTags()
	);
	protected readonly tagFilterStatus = computed(() =>
		this.tagSource() === "mine"
			? this.myTagsStatus()
			: this.communityTagsStatus()
	);
	protected readonly coopOnly = signal(false);
	protected readonly platinumedOnly = signal(false);

	protected readonly appliedFilters = signal<BacklogFilters>({});
	protected readonly exportParams = computed<BacklogFilters>(() =>
		this.withSort(this.buildBaseFilters())
	);
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

	protected readonly viewStats = injectViewStats({
		activeFilterId: this.activeFilterId,
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
		if (this.selectedCommunityTags().length > 0) count++;
		if (this.coopOnly()) count++;
		if (this.platinumedOnly()) count++;
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

	protected setPlatinumedOnly(value: boolean) {
		this.platinumedOnly.set(value);
		this.activeFilterId.set(null);
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
		this.myTagsStatus.set("loading");
		this.moodTagsService
			.getMyTags()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: tags => {
					this.myTagOptions.set(
						[...tags]
							.sort(
								(a, b) =>
									b.usageCount - a.usageCount ||
									a.tag.localeCompare(b.tag)
							)
							.map(t =>
								myTagOption(t.tag, t.usageCount, t.description)
							)
					);
					this.myTagsStatus.set("ready");
				},
				error: () => this.myTagsStatus.set("error")
			});
	}

	protected setTagSource(source: BacklogTagSource) {
		this.tagSource.set(source);
		this.storage.set(TAG_SOURCE_STORAGE_KEY, source);
		if (source === "community") this.communityTagsRequested.set(true);
	}

	protected setTagSelection(tags: string[]) {
		if (this.tagSource() === "mine") this.selectedMoodTags.set(tags);
		else this.selectedCommunityTags.set(tags);
		this.applyFilters();
	}

	protected retryTagFilter() {
		if (this.tagFilterStatus() !== "error") return;
		if (this.tagSource() === "mine") this.loadMyTags();
		else this.popularTagsResource.reload();
	}

	protected warnTagLimit(limit: number) {
		this.toast.warning(`You can filter by up to ${limit} tags at a time.`);
	}

	private applyTagParams(params: ParamMap) {
		const moodTags = parseTagList(params.get(MOOD_TAGS_PARAM));
		const communityTags = parseTagList(params.get(COMMUNITY_TAGS_PARAM));
		this.selectedMoodTags.set(moodTags);
		this.selectedCommunityTags.set(communityTags);
		if (communityTags.length > 0 && moodTags.length === 0)
			this.setTagSource("community");
		else if (moodTags.length > 0 && communityTags.length === 0)
			this.setTagSource("mine");
	}

	private hasTagParams(params: ParamMap): boolean {
		return (
			parseTagList(params.get(MOOD_TAGS_PARAM)).length > 0 ||
			parseTagList(params.get(COMMUNITY_TAGS_PARAM)).length > 0
		);
	}

	private isOwnTagSync(previous: ParamMap, next: ParamMap): boolean {
		return (
			previous !== next &&
			differsOnlyInTagParams(previous, next) &&
			next.get(MOOD_TAGS_PARAM) === this.tagParamValue("mine") &&
			next.get(COMMUNITY_TAGS_PARAM) === this.tagParamValue("community")
		);
	}

	private tagParamValue(source: BacklogTagSource): string | null {
		if (this.activeFilterId()) return null;
		return joinTagList(
			source === "mine"
				? this.selectedMoodTags()
				: this.selectedCommunityTags()
		);
	}

	private syncTagParamsToUrl() {
		const moodTags = this.tagParamValue("mine");
		const communityTags = this.tagParamValue("community");
		const current = this.route.snapshot.queryParamMap;
		if (
			current.get(MOOD_TAGS_PARAM) === moodTags &&
			current.get(COMMUNITY_TAGS_PARAM) === communityTags
		)
			return;
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: {
				[MOOD_TAGS_PARAM]: moodTags,
				[COMMUNITY_TAGS_PARAM]: communityTags
			},
			queryParamsHandling: "merge",
			replaceUrl: true
		});
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

		const searchParam = params.get("search")?.trim();
		if (searchParam) {
			this.resetFilterState();
			this.searchQuery.set(searchParam);
			this.offset.set(0);
			this.loadBacklog();
			return;
		}

		const statusParam = params.get("status");
		if (statusParam || this.hasTagParams(params)) {
			this.resetFilterState();
			if (statusParam)
				this.activeStatuses.set(new Set(statusParam.split(",")));
			this.applyTagParams(params);
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
		this.selectedMoodTags.set(parseTagList(f[MOOD_TAGS_PARAM]));
		this.selectedCommunityTags.set(parseTagList(f[COMMUNITY_TAGS_PARAM]));
		this.coopOnly.set(f["coop_only"] === "true");
		this.platinumedOnly.set(f["platinumed_only"] === "true");

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
		this.selectedCommunityTags.set([]);
		this.activeStatuses.set(new Set());
		this.coopOnly.set(false);
		this.platinumedOnly.set(false);
		this.activeFilterId.set(null);
		this.activeFilterDescription.set("");
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

	protected readonly mobileToolsItems = computed<UiActionMenuItem[]>(() => {
		const filters = this.activeFiltersCount();
		const stats = this.viewStats.enabledCount();
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
			}
		];
	});

	protected runMobileTool(id: string) {
		if (id === "filters") this.openFiltersFromSheet();
		else if (id === "stats") this.openStatsFromSheet();
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

	private applyFilters() {
		if (!this.activeFilterId()) this.saveCurrentFilter();
		this.activeFilterId.set(null);
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
		this.selectedCommunityTags.set([]);
		this.activeStatuses.set(new Set());
		this.coopOnly.set(false);
		this.platinumedOnly.set(false);
		this.activeFilterId.set(null);
		this.activeFilterDescription.set("");
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

		this.applySavedFilterState(filter);

		this.activeFilterId.set(filter.id);
		this.activeFilterDescription.set(filter.description ?? "");
		this.offset.set(0);
		this.loadBacklog();
	}

	protected updateCurrentFilter() {
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
					this.viewStats.load(id);
				},
				error: (error: unknown) => {
					this.savingFilter.set(false);
					this.reportViewWriteFailure(
						error,
						"Couldn't update this view."
					);
				}
			});
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
		if (this.selectedCommunityTags().length > 0)
			filters[COMMUNITY_TAGS_PARAM] =
				this.selectedCommunityTags().join(",");
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
		if (this.selectedCommunityTags().length > 0)
			filters.community_tags = this.selectedCommunityTags().join(",");
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
		this.syncTagParamsToUrl();
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
