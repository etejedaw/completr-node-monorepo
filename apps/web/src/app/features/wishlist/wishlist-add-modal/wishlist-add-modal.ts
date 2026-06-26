import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Subject, debounceTime, switchMap, of } from "rxjs";
import {
	NgpDialog,
	NgpDialogOverlay,
	NgpDialogTitle,
	injectDialogRef
} from "ng-primitives/dialog";
import { Game } from "../../../core/models";
import { GamesService } from "../../games/games";
import { WishlistService } from "../wishlist";
import { UiButton, UiIconButton } from "../../../shared/ui";

export type WishlistAddModalResult = "saved";

@Component({
	selector: "app-wishlist-add-modal",
	imports: [NgpDialog, NgpDialogOverlay, NgpDialogTitle, UiButton, UiIconButton],
	templateUrl: "./wishlist-add-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistAddModal implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly wishlistService = inject(WishlistService);
	private readonly dialogRef = injectDialogRef<void, WishlistAddModalResult>();
	private readonly searchSubject = new Subject<string>();

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
				this.dialogRef.close("saved");
			},
			error: () => this.adding.set(false)
		});
	}

	onClose() {
		this.dialogRef.close();
	}
}
