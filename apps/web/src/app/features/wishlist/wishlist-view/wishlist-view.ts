import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { WishlistEntry } from "../../../core/models";
import { WishlistService } from "../wishlist.service";
import { WishlistAddModal } from "../wishlist-add-modal/wishlist-add-modal";
import { UiButton, UiEmptyState, UiPagination, UiSearchBar } from "../../../shared/ui";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

@Component({
	selector: "app-wishlist-view",
	imports: [RouterLink, UiButton, UiEmptyState, UiPagination, UiSearchBar, WishlistAddModal],
	templateUrl: "./wishlist-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistView implements OnInit {
	private readonly wishlistService = inject(WishlistService);

	protected readonly entries = signal<WishlistEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly showAddModal = signal(false);

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadWishlist();
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

	remove(entry: WishlistEntry) {
		this.wishlistService.remove(entry.game.id).subscribe(() => {
			this.entries.set(this.entries().filter(e => e.id !== entry.id));
			this.total.set(this.total() - 1);
		});
	}

	openAddModal() {
		this.showAddModal.set(true);
	}

	onAddModalClosed() {
		this.showAddModal.set(false);
	}

	onAddModalSaved() {
		this.showAddModal.set(false);
		this.loadWishlist();
	}

	private loadWishlist() {
		this.isLoading.set(true);
		this.wishlistService
			.load({
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
}
