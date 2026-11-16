import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type WishlistEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { type ExportParams } from "../../../core/services/export";
import { FavoritesService } from "../../../core/services/favorites";
import { ToastService } from "../../../core/services/toast";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { ExportActions } from "../../../shared/components/export-actions/export-actions";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	LibraryPage,
	type LibraryPageState
} from "../../../shared/components/library-page/library-page";
import {
	LibraryPageContent,
	LibraryPageEmptyAction,
	LibraryPageToolbar
} from "../../../shared/components/library-page/library-page-slots";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import {
	countByPlatform,
	matchesPlatform,
	PlatformFilter
} from "../../../shared/components/platform-filter/platform-filter";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import { UiButton, UiPremiumBadge } from "../../../shared/ui";
import { gameArtUrl } from "../../../shared/utils/game-art";
import { isNotFound } from "../../../shared/utils/http-failure";
import { injectLatestLoader } from "../../../shared/utils/inject-latest-loader";
import { injectToggleAction } from "../../../shared/utils/inject-toggle-action";
import { WishlistService } from "../wishlist";
import {
	WishlistAddModal,
	type WishlistAddModalResult
} from "../wishlist-add-modal/wishlist-add-modal";

@Component({
	selector: "app-wishlist-view",
	imports: [
		ExportActions,
		GameCoverCard,
		CoverGrid,
		LibraryHero,
		LibraryPage,
		LibraryPageContent,
		LibraryPageEmptyAction,
		LibraryPageToolbar,
		PlatformFilter,
		PremiumOnly,
		UiButton,
		UiPremiumBadge,
		PageSearch
	],
	templateUrl: "./wishlist-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistView implements OnInit {
	private readonly destroyRef = inject(DestroyRef);
	private readonly wishlistLoader = injectLatestLoader();
	private readonly wishlistService = inject(WishlistService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);
	private readonly favoriteToggle = injectToggleAction();

	protected readonly isPremium = inject(AuthService).isPremium;
	protected readonly allEntries = signal<WishlistEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly exportParams = computed<ExportParams>(() => ({
		search: this.searchQuery().trim() || undefined,
		platform: this.selectedPlatform() || undefined
	}));
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;

	protected readonly platformCounts = computed(() =>
		countByPlatform(this.allEntries(), entry => entry.platform)
	);
	protected readonly entries = computed(() =>
		this.allEntries().filter(entry =>
			matchesPlatform(entry.platform, this.selectedPlatform())
		)
	);
	protected readonly pageState = computed<LibraryPageState>(() => {
		if (this.isLoading()) return "loading";
		if (this.wishlistLoader.failed()) return "error";
		if (this.entries().length > 0) return "ready";
		return this.searchQuery().trim() || this.selectedPlatform()
			? "no-matches"
			: "empty";
	});
	protected readonly heroPosters = computed(() =>
		this.allEntries().map(entry => ({
			src: gameArtUrl(entry.game, "portrait"),
			title: entry.game.title
		}))
	);

	private readonly searchSubject = new Subject<string>();

	ngOnInit() {
		this.searchSubject
			.pipe(
				debounceTime(300),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(() => {
				this.offset.set(0);
				this.loadWishlist();
			});
		this.favoritesService.ensureIdsLoaded().subscribe();
		this.loadWishlist();
	}

	protected isFavorite(gameId: string): boolean {
		return this.favoritesService.isFavorite(gameId);
	}

	protected toggleFavorite(gameId: string) {
		this.favoriteToggle.run({
			key: gameId,
			request: this.favoritesService.toggle(gameId),
			failureMessage: "Couldn't update your favorites. Try again."
		});
	}

	protected onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadWishlist();
			return;
		}
		this.searchSubject.next(query);
	}

	protected clearSearchAndFilter() {
		this.selectedPlatform.set("");
		this.onSearch("");
	}

	protected onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadWishlist();
	}

	protected remove(entry: WishlistEntry) {
		const snapshot = this.allEntries();
		const previousTotal = this.total();
		this.allEntries.set(snapshot.filter(e => e.id !== entry.id));
		this.total.set(previousTotal - 1);
		this.toast.pending({
			message: `Removed ${entry.game.title} from Want to Get`,
			onCommit: () =>
				this.wishlistService.remove(entry.game.id).subscribe({
					error: (error: unknown) => {
						if (isNotFound(error)) return;
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

	protected openAddModal() {
		const ref = this.dialogs.open<void, WishlistAddModalResult>(
			WishlistAddModal
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadWishlist();
		});
	}

	protected loadWishlist() {
		this.isLoading.set(true);
		this.wishlistLoader.load(
			this.wishlistService.load({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			}),
			{
				next: res => {
					this.allEntries.set(res.data.wishlist);
					this.total.set(res.data.total ?? res.data.wishlist.length);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			}
		);
	}
}
