import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { type LibraryHeroPoster } from "../../../shared/components/library-hero/library-hero.model";
import { profileBackLink } from "../../../shared/components/library-hero/library-hero-back-link";
import {
	LibraryPage,
	type LibraryPageSkeleton,
	type LibraryPageState
} from "../../../shared/components/library-page/library-page";
import {
	LibraryPageContent,
	LibraryPageEmptyAction,
	LibraryPageToolbar
} from "../../../shared/components/library-page/library-page-slots";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import { PlatformFilter } from "../../../shared/components/platform-filter/platform-filter";
import { type PlatformCount } from "../../../shared/components/platform-filter/platform-filter.model";
import { UiButton, UiEmptyState } from "../../../shared/ui";
import {
	type ProfileAccessError,
	ProfileAccessState
} from "./profile-access-state";

@Component({
	selector: "app-profile-collection-page",
	imports: [
		PageSearch,
		RouterLink,
		LibraryHero,
		LibraryPage,
		LibraryPageContent,
		LibraryPageEmptyAction,
		LibraryPageToolbar,
		PlatformFilter,
		ProfileAccessState,
		UiButton,
		UiEmptyState
	],
	templateUrl: "./profile-collection-page.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCollectionPage {
	readonly username = input.required<string>();
	protected readonly backLink = computed(() =>
		profileBackLink(this.username())
	);
	readonly heading = input.required<string>();
	readonly icon = input.required<string>();
	readonly iconColor = input("text-brand");
	readonly noun = input("game");
	readonly subtitleSuffix = input("");
	readonly searchPlaceholder = input<string | null>(null);
	readonly platforms = input<PlatformCount[]>([]);
	readonly skeleton = input<LibraryPageSkeleton>("posters");
	readonly posters = input<LibraryHeroPoster[]>([]);
	readonly total = input(0);
	readonly itemCount = input(0);
	readonly visibleCount = input(0);
	readonly isLoading = input(false);
	readonly error = input<ProfileAccessError | null>(null);
	readonly hasLoadFailed = input(false);
	readonly privateTitle = input("This is private");
	readonly emptyTitle = input("Nothing here yet");
	readonly emptyText = input("");
	readonly offset = input(0);
	readonly limit = input(50);
	readonly query = model("");
	readonly platform = model("");
	readonly offsetChange = output<number>();
	readonly retry = output<void>();

	protected readonly pageState = computed<LibraryPageState>(() => {
		if (this.isLoading()) return "loading";
		if (this.itemCount() === 0) return "empty";
		if (this.visibleCount() === 0) return "no-matches";
		return "ready";
	});

	protected clearFilters() {
		this.query.set("");
		this.platform.set("");
	}
}
