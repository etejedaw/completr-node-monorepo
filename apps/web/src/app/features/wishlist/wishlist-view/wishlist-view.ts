import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { WishlistEntry } from "../../../core/models";
import { WishlistService } from "../wishlist.service";
import { WishlistAddModal } from "../wishlist-add-modal/wishlist-add-modal";
import { UiButton, UiPagination, UiSearchBar } from "../../../shared/ui";
import { WishlistGridCard } from "../../../shared/components/wishlist-grid-card/wishlist-grid-card";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

@Component({
	selector: "app-wishlist-view",
	imports: [WishlistAddModal, UiButton, UiPagination, UiSearchBar, WishlistGridCard],
	templateUrl: "./wishlist-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistView implements OnInit {
	private readonly wishlistService = inject(WishlistService);

	protected readonly entries = signal<WishlistEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly showAddModal = signal(false);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly sortBy = signal<
		"manual" | "ratio" | "score" | "duration"
	>("manual");
	protected readonly savingOrder = signal(false);

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadWishlist();
	}

	setSort(sort: "manual" | "ratio" | "score" | "duration") {
		this.sortBy.set(sort);
	}

	protected readonly filteredEntries = computed(() => {
		const sort = this.sortBy();
		const list = this.entries();
		if (sort === "manual") return list;
		const sorted = [...list];
		if (sort === "ratio") {
			sorted.sort(
				(a, b) => (b.backlog.ratio ?? -1) - (a.backlog.ratio ?? -1)
			);
		} else if (sort === "score") {
			sorted.sort(
				(a, b) => (b.backlog.score ?? -1) - (a.backlog.score ?? -1)
			);
		} else if (sort === "duration") {
			sorted.sort(
				(a, b) =>
					(a.backlog.duration ?? Number.POSITIVE_INFINITY) -
					(b.backlog.duration ?? Number.POSITIVE_INFINITY)
			);
		}
		return sorted;
	});

	saveCurrentOrder() {
		if (this.sortBy() === "manual" || this.savingOrder()) return;
		this.savingOrder.set(true);
		const backlogIds = this.filteredEntries().map(e => e.backlog.id);
		this.wishlistService.reorder(backlogIds).subscribe({
			next: updated => {
				this.entries.set(updated);
				this.sortBy.set("manual");
				this.savingOrder.set(false);
			},
			error: () => this.savingOrder.set(false)
		});
	}

	private readonly searchSubject = new Subject<string>();

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(() => {
				this.offset.set(0);
				this.loadWishlist();
			});
		this.loadWishlist();
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.searchSubject.next(query);
	}

	openAddModal() {
		this.showAddModal.set(true);
	}

	onAddModalClosed() {
		this.showAddModal.set(false);
	}

	onAddModalSaved() {
		this.loadWishlist();
	}

	remove(entry: WishlistEntry) {
		const remaining = this.entries()
			.filter(e => e.id !== entry.id)
			.map(e => e.backlog.id);
		this.wishlistService.reorder(remaining).subscribe(updated => {
			this.entries.set(updated);
		});
	}

	moveUp(index: number) {
		if (index === 0) return;
		const list = [...this.entries()];
		[list[index - 1], list[index]] = [list[index], list[index - 1]];
		this.reorder(list);
	}

	moveDown(index: number) {
		if (index >= this.entries().length - 1) return;
		const list = [...this.entries()];
		[list[index], list[index + 1]] = [list[index + 1], list[index]];
		this.reorder(list);
	}

	private loadWishlist() {
		this.isLoading.set(true);
		this.wishlistService
			.getMyWishlistPaged({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			})
			.subscribe({
				next: res => {
					this.entries.set(res.data.wishlist);
					this.total.set(res.data.total ?? res.data.wishlist.length);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}

	private reorder(list: WishlistEntry[]) {
		const backlogIds = list.map(e => e.backlog.id);
		this.wishlistService.reorder(backlogIds).subscribe(updated => {
			this.entries.set(updated);
		});
	}
}
