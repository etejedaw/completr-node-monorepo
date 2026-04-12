import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { FavoriteEntry } from "../../../core/models";
import { FavoritesService } from "../favorites.service";

@Component({
	selector: "app-favorites-view",
	imports: [RouterLink],
	templateUrl: "./favorites-view.html",
	styleUrl: "./favorites-view.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesView implements OnInit {
	private readonly favoritesService = inject(FavoritesService);

	protected readonly entries = signal<FavoriteEntry[]>([]);
	protected readonly isLoading = signal(true);

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
