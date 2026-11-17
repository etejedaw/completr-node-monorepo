import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { rxResource, toObservable, toSignal } from "@angular/core/rxjs-interop";
import { debounceTime } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { UsersService } from "../../core/services/users";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../shared/components/library-toolbar/library-toolbar";
import { PageSearch } from "../../shared/components/page-search/page-search";
import { UnfollowConfirmDialog } from "../../shared/components/unfollow-confirm-dialog/unfollow-confirm-dialog";
import {
	UiButton,
	UiEmptyState,
	UiEyebrow,
	UiPlainEmptyState,
	UiSkeleton
} from "../../shared/ui";
import { gameArtUrl } from "../../shared/utils/game-art";
import { injectFollowActions } from "../../shared/utils/inject-follow-actions";
import { UserCard } from "./user-card/user-card";

const DISCOVER_LIMIT = 12;
const SEARCH_LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_LENGTH = 2;
const EMAIL_PATTERN = /.+@.+\..+/;

@Component({
	selector: "app-users-discover",
	imports: [
		PageSearch,
		NgTemplateOutlet,
		LibraryHero,
		LibraryToolbar,
		UserCard,
		UnfollowConfirmDialog,
		UiButton,
		UiEmptyState,
		UiEyebrow,
		UiPlainEmptyState,
		UiSkeleton
	],
	templateUrl: "./users-discover.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersDiscover {
	private readonly usersService = inject(UsersService);

	protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
	protected readonly followActions = injectFollowActions();
	protected readonly searchQuery = signal("");
	protected readonly skeletonRange = Array.from({ length: 6 }, (_, i) => i);

	private readonly trimmedQuery = computed(() => this.searchQuery().trim());
	private readonly debouncedQuery = toSignal(
		toObservable(this.trimmedQuery).pipe(debounceTime(SEARCH_DEBOUNCE_MS)),
		{ initialValue: "" }
	);
	protected readonly isSearchActive = computed(
		() => this.trimmedQuery().length >= MIN_SEARCH_LENGTH
	);

	private readonly discover = rxResource({
		stream: () => this.usersService.discover(DISCOVER_LIMIT)
	});

	private readonly search = rxResource({
		params: () => {
			const query = this.debouncedQuery();
			return query.length >= MIN_SEARCH_LENGTH ? query : undefined;
		},
		stream: ({ params: query }) =>
			EMAIL_PATTERN.test(query)
				? this.usersService.search({ email: query })
				: this.usersService.search({
						search: query,
						limit: SEARCH_LIMIT
					})
	});

	protected readonly discoverUsers = computed(() =>
		this.discover.hasValue() ? this.discover.value() : []
	);
	protected readonly isLoadingDiscover = this.discover.isLoading;
	protected readonly discoverFailed = computed(
		() => this.discover.status() === "error"
	);

	protected readonly searchResults = computed(() =>
		this.search.hasValue() ? this.search.value() : []
	);
	protected readonly isSearching = computed(
		() =>
			this.isSearchActive() &&
			(this.debouncedQuery() !== this.trimmedQuery() ||
				this.search.isLoading())
	);
	protected readonly searchFailed = computed(
		() =>
			this.isSearchActive() &&
			this.debouncedQuery() === this.trimmedQuery() &&
			this.search.status() === "error"
	);

	protected readonly heroPosters = computed(() =>
		[...this.discoverUsers(), ...this.searchResults()].flatMap(user => {
			const src = gameArtUrl(user.featuredGame, "portrait");
			return user.featuredGame && src
				? [{ src, title: user.featuredGame.title }]
				: [];
		})
	);

	protected readonly filterCount = computed(() => {
		if (this.isSearchActive())
			return this.isSearching() ? null : this.searchResults().length;
		return this.isLoadingDiscover() ? null : this.discoverUsers().length;
	});

	protected onSearch(query: string) {
		this.searchQuery.set(query);
	}

	protected retryDiscover() {
		this.discover.reload();
	}

	protected retrySearch() {
		this.search.reload();
	}
}
