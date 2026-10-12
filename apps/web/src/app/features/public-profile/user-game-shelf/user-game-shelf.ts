import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { type GameShelfEntry } from "../../../core/models";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

@Component({
	selector: "app-user-game-shelf",
	imports: [ProfileCollectionPage, GameCoverCard],
	templateUrl: "./user-game-shelf.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserGameShelf {
	private readonly libraryService = inject(PublicLibraryService);

	protected readonly collection = injectPublicCollection<GameShelfEntry>(
		(username, pagination) =>
			this.libraryService.getUserGameShelf(username, pagination)
	);
}
