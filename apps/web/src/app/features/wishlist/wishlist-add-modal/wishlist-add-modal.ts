import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";

import { type Game } from "../../../core/models";
import { GameSearchStep } from "../../../shared/components/game-search/game-search-step";
import { SelectedGameRow } from "../../../shared/components/game-search/selected-game-row";
import { UiButton, UiDialog } from "../../../shared/ui";
import { injectGameSearch } from "../../games/game-search";
import { WishlistPlatformChoice } from "../components/wishlist-platform-choice";
import { WishlistService } from "../wishlist";

export type WishlistAddModalResult = "saved";

@Component({
	selector: "app-wishlist-add-modal",
	imports: [
		GameSearchStep,
		SelectedGameRow,
		UiButton,
		UiDialog,
		WishlistPlatformChoice
	],
	templateUrl: "./wishlist-add-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistAddModal {
	private readonly wishlistService = inject(WishlistService);
	private readonly dialogRef = injectDialogRef<
		void,
		WishlistAddModalResult
	>();

	protected readonly searchQuery = signal("");
	protected readonly search = injectGameSearch(
		this.searchQuery,
		signal(true)
	);
	protected readonly results = computed(() => {
		const inWishlist = new Set(
			this.wishlistService.wishlist().map(w => w.game.id)
		);
		return this.search.results().filter(g => !inWishlist.has(g.id));
	});
	protected readonly adding = signal(false);
	protected readonly selectedGame = signal<Game | null>(null);
	protected readonly selectedPlatformId = signal<string | null>(null);
	protected readonly returnedToSearch = signal(false);

	pickGame(game: Game) {
		this.selectedGame.set(game);
		this.selectedPlatformId.set(null);
	}

	backToSearch() {
		this.selectedGame.set(null);
		this.selectedPlatformId.set(null);
		this.returnedToSearch.set(true);
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
