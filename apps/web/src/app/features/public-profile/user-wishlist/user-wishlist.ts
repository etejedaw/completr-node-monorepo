import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { type WishlistEntry } from "../../../core/models";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

@Component({
	selector: "app-user-wishlist",
	imports: [ProfileCollectionPage, CoverGrid, GameCoverCard],
	templateUrl: "./user-wishlist.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserWishlist {
	private readonly libraryService = inject(PublicLibraryService);

	protected readonly collection = injectPublicCollection<WishlistEntry>(
		(username, pagination) =>
			this.libraryService.getUserWishlist(username, pagination),
		entry => entry.game,
		{ platformOf: entry => entry.platform }
	);
}
