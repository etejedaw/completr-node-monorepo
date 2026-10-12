import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type WishlistEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	countByPlatform,
	matchesPlatform,
	PlatformFilter
} from "../../../shared/components/platform-filter/platform-filter";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiPremiumBadge,
	UiSearchBar,
	UiSkeleton
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
		GameCoverCard,
		LibraryHero,
		PlatformFilter,
		PremiumOnly,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiPremiumBadge,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./wishlist-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistView implements OnInit {
	private readonly wishlistService = inject(WishlistService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);

	protected readonly isPremium = inject(AuthService).isPremium;
	protected readonly allEntries = signal<WishlistEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly skeletonRange = Array.from({ length: 12 }, (_, i) => i);

	protected readonly platformCounts = computed(() =>
		countByPlatform(this.allEntries(), entry => entry.platform)
	);
	protected readonly entries = computed(() =>
		this.allEntries().filter(entry =>
			matchesPlatform(entry.platform, this.selectedPlatform())
		)
	);
	protected readonly heroPosters = computed(() =>
		this.allEntries().map(entry => ({
			src: entry.game.backgroundUrl,
			title: entry.game.title
		}))
	);

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

	toggleFavorite(gameId: string) {
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

	clearSearchAndFilter() {
		this.selectedPlatform.set("");
		this.onSearch("");
	}

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadWishlist();
	}

	remove(entry: WishlistEntry) {
		const snapshot = this.allEntries();
		const previousTotal = this.total();
		this.allEntries.set(snapshot.filter(e => e.id !== entry.id));
		this.total.set(previousTotal - 1);
		this.toast.pending({
			message: `Removed ${entry.game.title} from Want to Get`,
			onCommit: () =>
				this.wishlistService.remove(entry.game.id).subscribe({
					error: () => {
						this.allEntries.set(snapshot);
						this.total.set(previousTotal);
						this.toast.error("Could not remove the game.");
					}
				}),
			onUndo: () => {
				this.allEntries.set(snapshot);
				this.total.set(previousTotal);
			}
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
					this.allEntries.set(res.data.wishlist);
					this.total.set(res.data.total ?? res.data.wishlist.length);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
