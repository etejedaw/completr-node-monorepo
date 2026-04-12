import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { BacklogEntry, BacklogStatus } from "../../../core/models";
import { BacklogService, BacklogFilters } from "../backlog.service";
import { WishlistService } from "../../wishlist/wishlist.service";
import { RouterLink } from "@angular/router";
import { BacklogModal } from "../backlog-modal/backlog-modal";
import { StarRating } from "../../../shared/components/star-rating/star-rating";

@Component({
	selector: "app-backlog-list",
	imports: [DatePipe, BacklogModal, StarRating, RouterLink],
	templateUrl: "./backlog-list.html",
	styleUrl: "./backlog-list.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogList implements OnInit {
	private readonly backlogService = inject(BacklogService);
	private readonly wishlistService = inject(WishlistService);

	private readonly allEntries = signal<BacklogEntry[]>([]);
	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly isInitialLoad = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly activeStatus = signal<string>("");
	protected readonly sortBy = signal("createdAt");
	protected readonly sortOrder = signal<"asc" | "desc">("desc");
	protected readonly showModal = signal(false);
	protected readonly editingEntry = signal<BacklogEntry | null>(null);

	private readonly statuses: { label: string; value: string }[] = [
		{ label: "All", value: "" },
		{ label: "Not Started", value: "not_started" },
		{ label: "Playing", value: "playing" },
		{ label: "Completed", value: "completed" },
		{ label: "Abandoned", value: "abandoned" }
	];

	protected readonly statusFilters = this.statuses;

	ngOnInit() {
		this.loadBacklog();
	}

	filterByStatus(status: string) {
		this.activeStatus.set(status);
		this.loadBacklog();
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
			not_started: "status-not-started",
			playing: "status-playing",
			completed: "status-completed",
			abandoned: "status-abandoned"
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
		this.wishlistService.addFromBacklog(entry.id).subscribe();
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

		if (this.activeStatus()) {
			filters.status = this.activeStatus();
		}

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
