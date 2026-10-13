import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { type GameShelfEntry } from "../../../core/models";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

@Component({
	selector: "app-user-game-shelf",
	imports: [ProfileCollectionPage, CoverGrid, GameCoverCard],
	templateUrl: "./user-game-shelf.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserGameShelf {
	private readonly libraryService = inject(PublicLibraryService);

	protected readonly collection = injectPublicCollection<GameShelfEntry>(
		(username, pagination) =>
			this.libraryService.getUserGameShelf(username, pagination),
		entry => entry.game,
		{ platformOf: entry => entry.platform }
	);
}
