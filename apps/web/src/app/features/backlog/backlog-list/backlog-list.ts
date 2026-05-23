import {
	ChangeDetectionStrategy,
	Component,
	effect,
	HostListener,
	inject,
	OnInit,
	signal,
	untracked
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BacklogEntry, BacklogStatus, Platform } from "../../../core/models";
import { BacklogService, BacklogFilters } from "../backlog.service";
import { SavedFiltersService, SavedFilter } from "../saved-filters.service";
import { QueueService } from "../../queue/queue.service";
import { GamesService } from "../../games/games.service";
import { ActivatedRoute, ParamMap, RouterLink } from "@angular/router";
import { BacklogModal } from "../backlog-modal/backlog-modal";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { PersonalStats } from "../../../shared/components/personal-stats/personal-stats";
import { UiButton, UiEmptyState, UiIconButton, UiInput, UiPagination, UiSearchBar, UiSkeleton } from "../../../shared/ui";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

@Component({
	selector: "app-backlog-list",
	imports: [DatePipe, FormsModule, BacklogModal, StarRating, PersonalStats, RouterLink, UiButton, UiEmptyState, UiIconButton, UiInput, UiPagination, UiSearchBar, UiSkeleton],
	templateUrl: "./backlog-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogList implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly backlogService = inject(BacklogService);
	private readonly savedFiltersService = inject(SavedFiltersService);
	private readonly queueService = inject(QueueService);
	private readonly gamesService = inject(GamesService);

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
	protected readonly pendingStatusChange = signal<{
		entry: BacklogEntry;
		status: BacklogStatus;
	} | null>(null);
	protected readonly pendingStatusStartedAt = signal<string>("");
	protected readonly pendingStatusFinishedAt = signal<string>("");
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

	// Filters
	protected readonly showFilters = signal(false);
	protected readonly allPlatforms = signal<Platform[]>([]);
	protected readonly selectedPlatform = signal("");
	protected readonly startedFrom = signal("");
	protected readonly startedTo = signal("");
	protected readonly finishedFrom = signal("");
	protected readonly finishedTo = signal("");
	protected readonly minRating = signal<number | null>(null);
	protected readonly maxRating = signal<number | null>(null);

	// Saved filters
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
		if (this.startedFrom() !== "" || this.startedTo() !== "") count++;
		if (this.finishedFrom() !== "" || this.finishedTo() !== "") count++;
		if (this.minRating() !== null || this.maxRating() !== null) count++;
		if (this.activeStatuses().size > 0) count++;
		return count;
	};

	private readonly statuses: { label: string; value: string }[] = [
		{ label: "Not Started", value: "not_started" },
		{ label: "Playing", value: "playing" },
		{ label: "Completed", value: "completed" },
		{ label: "Abandoned", value: "abandoned" }
	];

	protected readonly statusFilters = this.statuses;

	ngOnInit() {
		this.setupSearch();
		this.loadQueueIds();
		this.gamesService
			.getPlatforms()
			.subscribe(p => this.allPlatforms.set(p));
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
		const f = filter.filters as Record<string, string>;
		this.selectedPlatform.set(f["platform_id"] ?? "");
		this.startedFrom.set(f["started_from"] ?? "");
		this.startedTo.set(f["started_to"] ?? "");
		this.finishedFrom.set(f["finished_from"] ?? "");
		this.finishedTo.set(f["finished_to"] ?? "");
		this.minRating.set(f["min_rating"] ? Number(f["min_rating"]) : null);
		this.maxRating.set(f["max_rating"] ? Number(f["max_rating"]) : null);

		const status = f["status"];
		this.activeStatuses.set(status ? new Set(status.split(",")) : new Set());

		if (filter.sortBy) this.sortBy.set(filter.sortBy);
		if (filter.sortOrder)
			this.sortOrder.set(filter.sortOrder as "asc" | "desc");

		this.activeFilterId.set(filter.id);
		this.activeFilterDescription.set(filter.description ?? "");
		this.offset.set(0);
		this.loadBacklog();
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
		this.offset.set(0);
		this.loadBacklog();
	}

	applySavedFilter(filter: SavedFilter) {
		if (this.activeFilterId() === filter.id) {
			this.clearFilters();
			this.showFilters.set(false);
			return;
		}

		const f = filter.filters as Record<string, string>;
		this.selectedPlatform.set(f["platform_id"] ?? "");
		this.startedFrom.set(f["started_from"] ?? "");
		this.startedTo.set(f["started_to"] ?? "");
		this.finishedFrom.set(f["finished_from"] ?? "");
		this.finishedTo.set(f["finished_to"] ?? "");
		this.minRating.set(f["min_rating"] ? Number(f["min_rating"]) : null);
		this.maxRating.set(f["max_rating"] ? Number(f["max_rating"]) : null);

		const status = f["status"];
		if (status) {
			this.activeStatuses.set(new Set(status.split(",")));
		} else {
			this.activeStatuses.set(new Set());
		}

		if (filter.sortBy) this.sortBy.set(filter.sortBy);
		if (filter.sortOrder)
			this.sortOrder.set(filter.sortOrder as "asc" | "desc");

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
		if (this.startedFrom()) filters["started_from"] = this.startedFrom();
		if (this.startedTo()) filters["started_to"] = this.startedTo();
		if (this.finishedFrom()) filters["finished_from"] = this.finishedFrom();
		if (this.finishedTo()) filters["finished_to"] = this.finishedTo();
		if (this.minRating() !== null)
			filters["min_rating"] = String(this.minRating());
		if (this.maxRating() !== null)
			filters["max_rating"] = String(this.maxRating());
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

	statusClass(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "bg-fg-muted/10 text-fg-muted",
			playing: "bg-warning/10 text-warning",
			completed: "bg-success/10 text-success",
			abandoned: "bg-danger/10 text-danger"
		};
		return map[status] ?? "";
	}

	statusLabel(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned"
		};
		return map[status] ?? status;
	}

	statusIcon(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "schedule",
			playing: "play_circle",
			completed: "check_circle",
			abandoned: "cancel"
		};
		return map[status] ?? "schedule";
	}

	canChangeStatus(status: BacklogStatus): boolean {
		return status === "not_started" || status === "playing";
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

	@HostListener("document:click")
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
		this.pendingStatusStartedAt.set(newStatus === "playing" ? today : "");
		this.pendingStatusFinishedAt.set(
			newStatus === "completed" || newStatus === "abandoned" ? today : ""
		);
		this.pendingStatusChange.set({ entry, status: newStatus });
	}

	cancelStatusChange() {
		this.pendingStatusChange.set(null);
	}

	confirmStatusChange() {
		const pending = this.pendingStatusChange();
		if (!pending) return;
		const { entry, status } = pending;
		const payload: {
			status: BacklogStatus;
			startedAt?: string;
			finishedAt?: string;
		} = { status };
		if (status === "playing" && this.pendingStatusStartedAt())
			payload.startedAt = this.pendingStatusStartedAt();
		if (
			(status === "completed" || status === "abandoned") &&
			this.pendingStatusFinishedAt()
		)
			payload.finishedAt = this.pendingStatusFinishedAt();
		this.pendingStatusChange.set(null);

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
				clearUpdating();
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
		if (this.startedFrom()) filters.started_from = this.startedFrom();
		if (this.startedTo()) filters.started_to = this.startedTo();
		if (this.finishedFrom()) filters.finished_from = this.finishedFrom();
		if (this.finishedTo()) filters.finished_to = this.finishedTo();
		if (this.minRating() !== null) filters.min_rating = this.minRating()!;
		if (this.maxRating() !== null) filters.max_rating = this.maxRating()!;
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
