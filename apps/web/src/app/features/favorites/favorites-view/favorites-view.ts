import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type FavoriteEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiPremiumBadge,
	UiSearchBar
} from "../../../shared/ui";
import { injectBacklogQuickAdd } from "../../backlog/backlog-quick-add";
import { FavoritesService } from "../favorites";

@Component({
	selector: "app-favorites-view",
	imports: [
		RouterLink,
		CoverGrid,
		GameCoverCard,
		LibraryHero,
		LibraryToolbar,
		PremiumOnly,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiPremiumBadge,
		UiSearchBar
	],
	templateUrl: "./favorites-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesView implements OnInit {
	private readonly favoritesService = inject(FavoritesService);
	private readonly toast = inject(ToastService);
	protected readonly openBacklogQuickAdd = injectBacklogQuickAdd(() =>
		this.loadFavorites()
	);

	protected readonly isPremium = inject(AuthService).isPremium;
	protected readonly entries = signal<FavoriteEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly heroPosters = computed(() =>
		this.entries().map(entry => ({
			src: entry.game.backgroundUrl,
			title: entry.game.title
		}))
	);

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
		if (!query.trim()) {
			this.offset.set(0);
			this.loadFavorites();
			return;
		}
		this.searchSubject.next(query);
	}

	remove(entry: FavoriteEntry) {
		const snapshot = this.entries();
		const previousTotal = this.total();
		const restore = () => {
			this.entries.set(snapshot);
			this.total.set(previousTotal);
		};
		this.entries.set(
			this.renumber(snapshot.filter(e => e.id !== entry.id))
		);
		this.total.set(Math.max(0, previousTotal - 1));
		this.toast.pending({
			message: `Removed ${entry.game.title} from favorites`,
			onCommit: () =>
				this.favoritesService.removeFavorite(entry.game.id).subscribe({
					error: () => {
						restore();
						this.toast.error("Could not remove the favorite.");
					}
				}),
			onUndo: restore
		});
	}

	private renumber(entries: FavoriteEntry[]): FavoriteEntry[] {
		return entries.map((entry, index) => ({
			...entry,
			position: this.offset() + index + 1
		}));
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
