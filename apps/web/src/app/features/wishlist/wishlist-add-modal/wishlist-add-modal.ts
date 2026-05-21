import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	output,
	signal
} from "@angular/core";
import { Subject, debounceTime, switchMap, of } from "rxjs";
import { Game } from "../../../core/models";
import { GamesService } from "../../games/games.service";
import { WishlistService } from "../wishlist.service";
import { UiButton, UiIconButton } from "../../../shared/ui";

@Component({
	selector: "app-wishlist-add-modal",
	imports: [UiButton, UiIconButton],
	templateUrl: "./wishlist-add-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistAddModal implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly wishlistService = inject(WishlistService);
	private readonly searchSubject = new Subject<string>();

	closed = output<void>();
	saved = output<void>();

	protected readonly results = signal<Game[]>([]);
	protected readonly searchQuery = signal("");
	protected readonly isSearching = signal(false);
	protected readonly adding = signal(false);
	protected readonly selectedGame = signal<Game | null>(null);
	protected readonly selectedPlatformId = signal<string | null>(null);

	ngOnInit() {
		this.searchSubject
			.pipe(
				debounceTime(300),
				switchMap(query => {
					if (query.trim().length < 2) {
						this.isSearching.set(false);
						return of<Game[]>([]);
					}
					this.isSearching.set(true);
					return this.gamesService.searchLocal(query);
				})
			)
			.subscribe(games => {
				const inWishlist = new Set(
					this.wishlistService.wishlist().map(w => w.game.id)
				);
				this.results.set(games.filter(g => !inWishlist.has(g.id)));
				this.isSearching.set(false);
			});
	}

	onSearch(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		this.searchQuery.set(value);
		this.searchSubject.next(value);
	}

	pickGame(game: Game) {
		this.selectedGame.set(game);
		this.selectedPlatformId.set(null);
	}

	backToSearch() {
		this.selectedGame.set(null);
		this.selectedPlatformId.set(null);
	}

	selectPlatform(id: string) {
		this.selectedPlatformId.set(id);
	}

	confirm(skipPlatform = false) {
		const game = this.selectedGame();
		if (!game || this.adding()) return;
		this.adding.set(true);
		const platformId = skipPlatform
			? undefined
			: (this.selectedPlatformId() ?? undefined);
		this.wishlistService.add(game.id, platformId).subscribe({
			next: () => {
				this.adding.set(false);
				this.saved.emit();
				this.closed.emit();
			},
			error: () => this.adding.set(false)
		});
	}

	onClose() {
		this.closed.emit();
	}
}
