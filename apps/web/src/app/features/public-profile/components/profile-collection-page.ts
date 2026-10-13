import {
	ChangeDetectionStrategy,
	Component,
	input,
	model,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import {
	LibraryHero,
	type LibraryHeroPoster
} from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import {
	type PlatformCount,
	PlatformFilter
} from "../../../shared/components/platform-filter/platform-filter";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import {
	type ProfileAccessError,
	ProfileAccessState
} from "./profile-access-state";

@Component({
	selector: "app-profile-collection-page",
	imports: [
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		CoverGrid,
		PlatformFilter,
		ProfileAccessState,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./profile-collection-page.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCollectionPage {
	readonly username = input.required<string>();
	readonly heading = input.required<string>();
	readonly icon = input.required<string>();
	readonly iconColor = input("text-brand");
	readonly noun = input("game");
	readonly subtitleSuffix = input("");
	readonly searchPlaceholder = input<string | null>(null);
	readonly platforms = input<PlatformCount[]>([]);
	readonly skeleton = input<"posters" | "cards">("posters");
	readonly posters = input<LibraryHeroPoster[]>([]);
	readonly total = input(0);
	readonly itemCount = input(0);
	readonly visibleCount = input(0);
	readonly isLoading = input(false);
	readonly error = input<ProfileAccessError | null>(null);
	readonly privateTitle = input("This is private");
	readonly emptyTitle = input("Nothing here yet");
	readonly emptyText = input("");
	readonly offset = input(0);
	readonly limit = input(50);
	readonly query = model("");
	readonly platform = model("");
	readonly offsetChange = output<number>();

	protected readonly cardSkeletonRange = [0, 1, 2, 3];

	protected clearFilters() {
		this.query.set("");
		this.platform.set("");
	}
}
