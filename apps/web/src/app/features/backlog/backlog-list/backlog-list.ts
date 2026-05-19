import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BacklogEntry, BacklogStatus, Platform } from "../../../core/models";
import { BacklogService, BacklogFilters } from "../backlog.service";
import { SavedFiltersService, SavedFilter } from "../saved-filters.service";
import { WishlistService } from "../../wishlist/wishlist.service";
import { GamesService } from "../../games/games.service";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { BacklogModal } from "../backlog-modal/backlog-modal";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { UiButton, UiInput } from "../../../shared/ui";

@Component({
	selector: "app-backlog-list",
	imports: [DatePipe, FormsModule, BacklogModal, StarRating, RouterLink, UiButton, UiInput],
	templateUrl: "./backlog-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogList implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly backlogService = inject(BacklogService);
	private readonly savedFiltersService = inject(SavedFiltersService);
	private readonly wishlistService = inject(WishlistService);
	private readonly gamesService = inject(GamesService);

	private readonly allEntries = signal<BacklogEntry[]>([]);
	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly isInitialLoad = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly activeStatuses = signal<Set<string>>(new Set());
	protected readonly sortBy = signal("createdAt");
	protected readonly sortOrder = signal<"asc" | "desc">("desc");
	protected readonly showModal = signal(false);
	protected readonly editingEntry = signal<BacklogEntry | null>(null);
	private readonly wishlistBacklogIds = signal<Set<string>>(new Set());

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

	protected readonly hasActiveFilters = () => {
		return (
			this.selectedPlatform() !== "" ||
			this.startedFrom() !== "" ||
			this.startedTo() !== "" ||
			this.finishedFrom() !== "" ||
			this.finishedTo() !== "" ||
			this.minRating() !== null ||
			this.maxRating() !== null ||
			this.activeStatuses().size > 0
		);
	};

	private readonly statuses: { label: string; value: string }[] = [
		{ label: "Not Started", value: "not_started" },
		{ label: "Playing", value: "playing" },
		{ label: "Completed", value: "completed" },
		{ label: "Abandoned", value: "abandoned" }
	];

	protected readonly statusFilters = this.statuses;

	ngOnInit() {
		this.loadWishlistIds();
		this.gamesService
			.getPlatforms()
			.subscribe(p => this.allPlatforms.set(p));
		this.savedFiltersService.getAll().subscribe(filters => {
			const sorted = filters.sort((a, b) => a.name.localeCompare(b.name));
			this.savedFilters.set(sorted);
			this.backlogFilters.set(sorted.filter(f => f.showInBacklog));

			const filterId =
				this.route.snapshot.queryParamMap.get("savedFilterId");
			if (filterId) {
				const match = sorted.find(f => f.id === filterId);
				if (match) {
					this.applySavedFilter(match);
					return;
				}
			}

			const defaultFilter = sorted.find(f => f.isDefault);
			if (defaultFilter) {
				this.applySavedFilter(defaultFilter);
				return;
			}
			this.loadBacklog();
		});
	}

	isInWishlist(entry: BacklogEntry): boolean {
		return this.wishlistBacklogIds().has(entry.id);
	}

	private loadWishlistIds() {
		this.wishlistService.getMyWishlist().subscribe(entries => {
			this.wishlistBacklogIds.set(
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
		this.loadBacklog();
	}

	clearFilters() {
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

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		this.filterEntries();
	}

	private filterEntries() {
		const query = this.searchQuery().toLowerCase();
		if (!query) {
			this.entries.set(this.allEntries());
			return;
		}
		const filtered = this.allEntries().filter(e =>
			e.game.title.toLowerCase().includes(query)
		);
		this.entries.set(filtered);
	}

	private readonly clientSortFields = new Set([
		"title",
		"ratio",
		"personalRatio"
	]);

	sort(column: string) {
		if (this.sortBy() === column) {
			this.sortOrder.set(this.sortOrder() === "asc" ? "desc" : "asc");
		} else {
			this.sortBy.set(column);
			this.sortOrder.set("desc");
		}

		if (this.clientSortFields.has(column)) {
			this.sortEntriesLocally();
		} else {
			this.loadBacklog();
		}
	}

	private sortEntriesLocally() {
		const field = this.sortBy();
		const order = this.sortOrder();
		const sorted = [...this.allEntries()].sort((a, b) => {
			if (field === "title") {
				const aVal = a.game.title.toLowerCase();
				const bVal = b.game.title.toLowerCase();
				const cmp = aVal.localeCompare(bVal);
				return order === "asc" ? cmp : -cmp;
			}
			const aVal = (a[field as keyof BacklogEntry] as number) ?? 0;
			const bVal = (b[field as keyof BacklogEntry] as number) ?? 0;
			return order === "asc" ? aVal - bVal : bVal - aVal;
		});
		this.allEntries.set(sorted);
		this.filterEntries();
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

	addToWishlist(entry: BacklogEntry) {
		if (this.isInWishlist(entry)) return;
		this.wishlistService.addFromBacklog(entry.id).subscribe(() => {
			this.loadWishlistIds();
		});
	}

	openCreate() {
		this.editingEntry.set(null);
		this.showModal.set(true);
	}

	openEdit(entry: BacklogEntry) {
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

	private loadBacklog() {
		this.isLoading.set(true);
		const isClientSort = this.clientSortFields.has(this.sortBy());
		const filters: BacklogFilters = {};

		if (!isClientSort) {
			filters.sort_by = this.sortBy();
			filters.sort_order = this.sortOrder();
		}

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

		this.backlogService.getMyBacklog(filters).subscribe({
			next: res => {
				this.allEntries.set(res.data.backlog);
				if (isClientSort) this.sortEntriesLocally();
				this.filterEntries();
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
