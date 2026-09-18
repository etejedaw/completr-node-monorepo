import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type WishlistEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { MoodTagsChips } from "../../../shared/components/mood-tags-chips/mood-tags-chips";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiPremiumBadge,
	UiSearchBar
} from "../../../shared/ui";
import { FavoritesService } from "../../favorites/favorites";
import { WishlistService } from "../wishlist";
import {
	WishlistAddModal,
	type WishlistAddModalResult
} from "../wishlist-add-modal/wishlist-add-modal";

@Component({
	selector: "app-wishlist-view",
	imports: [
		RouterLink,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiPremiumBadge,
		UiSearchBar,
		MoodTagsChips,
		PremiumOnly
	],
	templateUrl: "./wishlist-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistView implements OnInit {
	private readonly wishlistService = inject(WishlistService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly dialogs = inject(DialogService);

	protected readonly isPremium = inject(AuthService).isPremium;
	protected readonly entries = signal<WishlistEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;

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
		this.favoritesService.ensureIdsLoaded().subscribe();
		this.loadWishlist();
	}

	isFavorite(gameId: string): boolean {
		return this.favoritesService.isFavorite(gameId);
	}

	toggleFavorite(gameId: string, event: Event) {
		event.preventDefault();
		event.stopPropagation();
		this.favoritesService.toggle(gameId).subscribe();
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadWishlist();
			return;
		}
		this.searchSubject.next(query);
	}

	remove(entry: WishlistEntry) {
		this.wishlistService.remove(entry.game.id).subscribe(() => {
			this.entries.set(this.entries().filter(e => e.id !== entry.id));
			this.total.set(this.total() - 1);
		});
	}

	openAddModal() {
		const ref = this.dialogs.open<void, WishlistAddModalResult>(
			WishlistAddModal
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadWishlist();
		});
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
