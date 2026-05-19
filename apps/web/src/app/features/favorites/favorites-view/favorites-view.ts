import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { FavoriteEntry } from "../../../core/models";
import { FavoritesService } from "../favorites.service";
import { UiIconButton, UiSearchBar } from "../../../shared/ui";

@Component({
	selector: "app-favorites-view",
	imports: [RouterLink, UiIconButton, UiSearchBar],
	templateUrl: "./favorites-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesView implements OnInit {
	private readonly favoritesService = inject(FavoritesService);

	protected readonly entries = signal<FavoriteEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");

	protected readonly filteredEntries = computed(() => {
		const q = this.searchQuery().trim().toLowerCase();
		if (!q) return this.entries();
		return this.entries().filter(e => e.game.title.toLowerCase().includes(q));
	});

	ngOnInit() {
		this.loadFavorites();
	}

	remove(entry: FavoriteEntry) {
		const remaining = this.entries()
			.filter(e => e.id !== entry.id)
			.map(e => e.game.id);
		this.favoritesService
			.replaceFavorites(remaining)
			.subscribe(updated => this.entries.set(updated));
	}

	private loadFavorites() {
		this.isLoading.set(true);
		this.favoritesService.load().subscribe({
			next: res => {
				this.entries.set(res.data.favorites);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}
}
