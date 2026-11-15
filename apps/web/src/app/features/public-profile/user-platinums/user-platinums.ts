import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	signal
} from "@angular/core";
import { Router } from "@angular/router";

import { type PlatinumEntry } from "../../../core/models";
import { StorageService } from "../../../core/services/storage";
import { ViewModeToggle } from "../../../shared/components/view-mode-toggle/view-mode-toggle";
import {
	PLATINUM_VIEW_MODES,
	PlatinumCollection,
	type PlatinumViewMode
} from "../../platinum/components/platinum-collection/platinum-collection";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

const VIEW_MODE_STORAGE_KEY = "completr.publicPlatinums.viewMode";

function parseStoredViewMode(saved: string | null): PlatinumViewMode {
	return saved === "hardcore" || saved === "calendar" ? saved : "grid";
}

@Component({
	selector: "app-user-platinums",
	imports: [ProfileCollectionPage, PlatinumCollection, ViewModeToggle],
	templateUrl: "./user-platinums.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPlatinums {
	private readonly libraryService = inject(PublicLibraryService);
	private readonly router = inject(Router);
	private readonly storage = inject(StorageService);

	protected readonly viewModes = PLATINUM_VIEW_MODES;
	protected readonly viewMode = signal<PlatinumViewMode>(
		parseStoredViewMode(this.storage.get(VIEW_MODE_STORAGE_KEY))
	);

	protected readonly collection = injectPublicCollection<PlatinumEntry>(
		(username, pagination) =>
			this.libraryService.getUserPlatinums(username, pagination),
		entry => entry.game,
		{ limit: 100, platformOf: entry => entry.platform }
	);

	constructor() {
		effect(() => this.storage.set(VIEW_MODE_STORAGE_KEY, this.viewMode()));
	}

	protected openGame(platinum: PlatinumEntry) {
		void this.router.navigate(["/games", platinum.game.code]);
	}
}
