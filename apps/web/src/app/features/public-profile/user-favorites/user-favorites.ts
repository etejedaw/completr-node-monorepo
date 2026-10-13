import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { type FavoriteEntry } from "../../../core/models";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

@Component({
	selector: "app-user-favorites",
	imports: [ProfileCollectionPage, CoverGrid, GameCoverCard],
	templateUrl: "./user-favorites.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFavorites {
	private readonly libraryService = inject(PublicLibraryService);

	protected readonly collection = injectPublicCollection<FavoriteEntry>(
		(username, pagination) =>
			this.libraryService.getUserFavorites(username, pagination),
		entry => entry.game
	);
}
