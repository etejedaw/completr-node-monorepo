import {
	ChangeDetectionStrategy,
	Component,
	input,
	model,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	LibraryHero,
	type LibraryHeroPoster
} from "../../../shared/components/library-hero/library-hero";
import {
	UiButton,
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
		ProfileAccessState,
		UiButton,
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
	readonly skeleton = input<"posters" | "rows">("posters");
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
	readonly offsetChange = output<number>();

	protected readonly searchThreshold = 12;
	protected readonly rowSkeletonRange = [0, 1, 2, 3];
	protected readonly skeletonRange = Array.from({ length: 12 }, (_, i) => i);
}
