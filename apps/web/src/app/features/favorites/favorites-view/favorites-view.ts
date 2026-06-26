import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { FavoriteEntry, Game, BacklogEntry } from "../../../core/models";
import { FavoritesService } from "../favorites";
import { WishlistService } from "../../wishlist/wishlist";
import { BacklogService } from "../../backlog/backlog";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "../../backlog/backlog-modal/backlog-modal";
import { GamesService } from "../../games/games";
import { ToastService } from "../../../core/services/toast";
import { DialogService } from "../../../core/services/dialog";
import { RouterLink } from "@angular/router";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

@Component({
	selector: "app-favorites-view",
	imports: [
		RouterLink,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiSearchBar,
		UiSkeleton,
		GameCoverCard
	],
	templateUrl: "./favorites-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesView implements OnInit {
	private readonly favoritesService = inject(FavoritesService);
	private readonly wishlistService = inject(WishlistService);
	private readonly backlogService = inject(BacklogService);
	private readonly gamesService = inject(GamesService);
	private readonly toast = inject(ToastService);
	private readonly dialogs = inject(DialogService);

	protected readonly backlogGameIds = signal<Set<string>>(new Set());

	protected readonly entries = signal<FavoriteEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly skeletonRange = Array.from({ length: 12 }, (_, i) => i);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadFavorites();
	}

	private readonly searchSubject = new Subject<string>();

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(() => {
				this.offset.set(0);
				this.loadFavorites();
			});
		this.loadFavorites();
		this.wishlistService.load({ limit: 100 }).subscribe();
		this.loadBacklogIds();
	}

	isInWishlist(gameId: string): boolean {
		return this.wishlistService.isInWishlist(gameId);
	}

	isInBacklog(gameId: string): boolean {
		return this.backlogGameIds().has(gameId);
	}

	toggleWishlist(gameId: string) {
		this.wishlistService.toggle(gameId).subscribe();
	}

	openBacklogQuickAdd(entry: FavoriteEntry) {
		this.backlogService.getMyBacklog({ game_id: entry.game.id }).subscribe({
			next: res => {
				const existing = res.data.backlog[0] ?? null;
				if (existing) {
					this.openBacklog(existing, null);
					return;
				}
				this.openCreateBacklogFor(entry.game.code);
			},
			error: () => this.openCreateBacklogFor(entry.game.code)
		});
	}

	private openCreateBacklogFor(code: string) {
		this.gamesService.getByCode(code).subscribe(game => {
			this.openBacklog(null, game);
		});
	}

	private openBacklog(entry: BacklogEntry | null, preselectedGame: Game | null) {
		const ref = this.dialogs.open<BacklogModalData, BacklogModalResult>(
			BacklogModal,
			{
				data: {
					entry,
					preselectedGame,
					preselectedCompilationParent: null,
					preselectAddToQueue: false
				}
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadBacklogIds();
		});
	}

	private loadBacklogIds() {
		this.backlogService.getMyBacklog({ limit: 100 }).subscribe({
			next: res => {
				const ids = new Set(res.data.backlog.map(b => b.game.id));
				this.backlogGameIds.set(ids);
			}
		});
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadFavorites();
			return;
		}
		this.searchSubject.next(query);
	}

	remove(entry: FavoriteEntry) {
		this.entries.set(this.entries().filter(e => e.id !== entry.id));
		this.total.set(Math.max(0, this.total() - 1));
		this.toast.pending({
			message: `Removed ${entry.game.title} from favorites`,
			onCommit: () => {
				this.favoritesService.removeFavorite(entry.game.id).subscribe();
			},
			onUndo: () => {
				const restored = [...this.entries(), entry].sort(
					(a, b) => a.position - b.position
				);
				this.entries.set(restored);
				this.total.set(this.total() + 1);
			}
		});
	}

	private loadFavorites() {
		this.isLoading.set(true);
		this.favoritesService
			.load({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			})
			.subscribe({
				next: res => {
					this.entries.set(res.data.favorites);
					this.total.set(res.data.total ?? res.data.favorites.length);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
