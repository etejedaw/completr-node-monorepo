import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { type PlatinumEntry } from "../../../core/models";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { PlatinumCoverCard } from "../../../shared/components/platinum-cover-card/platinum-cover-card";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

@Component({
	selector: "app-user-platinums",
	imports: [ProfileCollectionPage, CoverGrid, PlatinumCoverCard],
	templateUrl: "./user-platinums.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPlatinums {
	private readonly libraryService = inject(PublicLibraryService);

	protected readonly collection = injectPublicCollection<PlatinumEntry>(
		(username, pagination) =>
			this.libraryService.getUserPlatinums(username, pagination),
		entry => entry.game,
		{ platformOf: entry => entry.platform }
	);
}
