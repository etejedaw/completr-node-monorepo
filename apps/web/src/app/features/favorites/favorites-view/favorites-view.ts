import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { FavoriteEntry } from "../../../core/models";
import { FavoritesService } from "../favorites.service";
import { ToastService } from "../../../core/services/toast.service";
import { UiPagination, UiSearchBar, UiSkeleton } from "../../../shared/ui";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

@Component({
	selector: "app-favorites-view",
	imports: [UiPagination, UiSearchBar, UiSkeleton, GameCoverCard],
	templateUrl: "./favorites-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesView implements OnInit {
	private readonly favoritesService = inject(FavoritesService);
	private readonly toast = inject(ToastService);

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
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.searchSubject.next(query);
	}

	remove(entry: FavoriteEntry) {
		this.entries.set(this.entries().filter(e => e.id !== entry.id));
		this.total.set(Math.max(0, this.total() - 1));
		this.toast.pending({
			message: `Removed ${entry.game.title} from favorites`,
			onCommit: () => {
				const ids = this.entries().map(e => e.game.id);
				this.favoritesService.replaceFavorites(ids).subscribe();
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
