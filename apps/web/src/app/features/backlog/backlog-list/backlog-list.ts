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
import { FormsModule } from "@angular/forms";
import { BacklogEntry, BacklogStatus, Genre, Platform } from "../../../core/models";
import { GameFilterPanel } from "../../../shared/components/game-filter-panel/game-filter-panel";
import { BacklogService, BacklogFilters } from "../backlog";
import { SavedFiltersService, SavedFilter } from "../saved-filters";
import { QueueService } from "../../queue/queue";
import { FavoritesService } from "../../favorites/favorites";
import { GamesService } from "../../games/games";
import { ActivatedRoute, ParamMap, Router, RouterLink } from "@angular/router";
import { BacklogModal } from "../backlog-modal/backlog-modal";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { PersonalStats } from "../../../shared/components/personal-stats/personal-stats";
import { ReviewsService } from "../../games/reviews";
import { UiButton, UiEmptyState, UiIconButton, UiInput, UiPagination, UiSearchBar, UiSelect, UiSkeleton, UiSwitch, UiTextarea } from "../../../shared/ui";
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
	imports: [DatePipe, FormsModule, BacklogModal, StarRating, PersonalStats, RouterLink, UiButton, UiEmptyState, UiIconButton, UiInput, UiPagination, UiSearchBar, UiSelect, UiSkeleton, UiSwitch, UiTextarea, GameFilterPanel],
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
	protected readonly showModal = signal(false);
	protected readonly editingEntry = signal<BacklogEntry | null>(null);
	private readonly queueBacklogIds = signal<Set<string>>(new Set());
	protected readonly statusMenuOpenId = signal<string | null>(null);
	protected readonly pendingStatusUpdate = signal<PendingStatusUpdate | null>(null);
	protected readonly updatingStatusIds = signal<Set<string>>(new Set());
	protected readonly reviewExpandedIds = signal<Set<string>>(new Set());

	private readonly queryParamMap = toSignal(this.route.queryParamMap);
	private readonly savedFiltersLoaded = signal(false);

	private readonly applyFromUrlEffect = effect(() => {
		if (!this.savedFiltersLoaded()) return;
		const params = this.queryParamMap();
		if (!params) return;
		untracked(() => this.applyFiltersFromUrl(params));
	});

	protected readonly viewMode = signal<"diary" | "hardcore">(
		(localStorage.getItem("completr.backlog.viewMode") as "diary" | "hardcore") ||
			"diary"
	);

	setViewMode(mode: "diary" | "hardcore") {
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

	protected readonly savedFilters = signal<SavedFilter[]>([]);
	protected readonly backlogFilters = signal<SavedFilter[]>([]);
	protected readonly activeFilterId = signal<string | null>(null);
	protected readonly activeFilterDescription = signal("");
	protected readonly newFilterName = signal("");
	protected readonly savingFilter = signal(false);

	protected readonly hasActiveFilters = () => this.activeFiltersCount() > 0;

	protected readonly activeFiltersCount = () => {
		let count = 0;
		if (this.selectedPlatform() !== "") count++;
		if (this.selectedPlatforms().size > 0) count++;
		if (this.selectedGenres().size > 0) count++;
		if (this.yearFrom() !== null || this.yearTo() !== null) count++;
		if (this.startedFrom() !== "" || this.startedTo() !== "") count++;
		if (this.finishedFrom() !== "" || this.finishedTo() !== "") count++;
		if (this.minRating() !== null || this.maxRating() !== null) count++;
		if (
			this.minRealDuration() !== null ||
			this.maxRealDuration() !== null
		)
			count++;
		if (this.minRatio() !== null || this.maxRatio() !== null) count++;
		if (
			this.minPersonalRatio() !== null ||
			this.maxPersonalRatio() !== null
		)
			count++;
		if (this.activeStatuses().size > 0) count++;
		return count;
	};

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
			const sorted = filters.sort((a, b) => a.name.localeCompare(b.name));
			this.savedFilters.set(sorted);
			this.backlogFilters.set(sorted.filter(f => f.showInBacklog));
			this.savedFiltersLoaded.set(true);
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

		const status = f["status"];
		this.activeStatuses.set(status ? new Set(status.split(",")) : new Set());

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
			this.queueBacklogIds.set(
				new Set(entries.map(e => e.backlog.id))
			);
		});
	}

	private loadSavedFilters() {
		this.savedFiltersService.getAll().subscribe(filters => {
			const sorted = filters.sort((a, b) => a.name.localeCompare(b.name));
			this.savedFilters.set(sorted);
			this.backlogFilters.set(sorted.filter(f => f.showInBacklog));
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
		this.activeStatuses.set(new Set());
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
				sortOrder: this.sortOrder()
			})
			.subscribe({
				next: () => {
					this.savingFilter.set(false);
					this.newFilterName.set("");
					this.loadSavedFilters();
				},
				error: () => this.savingFilter.set(false)
			});
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

	statusClass(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "bg-fg-muted/10 text-fg-muted",
			playing: "bg-warning/10 text-warning",
			completed: "bg-success/10 text-success",
			abandoned: "bg-danger/10 text-danger",
			endless: "bg-brand-subtle text-brand"
		};
		return map[status] ?? "";
	}

	statusLabel(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned",
			endless: "Endless"
		};
		return map[status] ?? status;
	}

	statusIcon(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "schedule",
			playing: "play_circle",
			completed: "check_circle",
			abandoned: "cancel",
			endless: "all_inclusive"
		};
		return map[status] ?? "schedule";
	}

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
				newStatus === "completed" || newStatus === "abandoned" ? today : "",
			realDuration: entry.realDuration != null ? String(entry.realDuration) : "",
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
		this.editingEntry.set(null);
		this.showModal.set(true);
	}

	openEdit(entry: BacklogEntry, event?: MouseEvent) {
		if (event) {
			const target = event.target as HTMLElement;
			if (target.closest("a") || target.closest("button")) return;
		}
		this.editingEntry.set(entry);
		this.showModal.set(true);
	}

	onModalClosed() {
		this.showModal.set(false);
		this.editingEntry.set(null);
	}

	onModalSaved() {
		this.showModal.set(false);
		this.editingEntry.set(null);
		this.loadBacklog();
	}

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadBacklog();
	}

	private loadBacklog() {
		this.isLoading.set(true);
		const filters: BacklogFilters = {
			limit: this.limit,
			offset: this.offset(),
			sort_by: this.sortBy(),
			sort_order: this.sortOrder()
		};

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
		if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

		this.backlogService.getMyBacklog(filters).subscribe({
			next: res => {
				this.entries.set(res.data.backlog);
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
