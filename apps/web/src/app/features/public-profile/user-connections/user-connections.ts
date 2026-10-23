import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	linkedSignal,
	signal
} from "@angular/core";
import { rxResource, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink, RouterLinkActive } from "@angular/router";
import {
	catchError,
	debounceTime,
	distinctUntilChanged,
	map,
	of,
	Subject
} from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { type UserResult } from "../../../core/services/users";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { UnfollowConfirmDialog } from "../../../shared/components/unfollow-confirm-dialog/unfollow-confirm-dialog";
import {
	UiButton,
	UiEmptyState,
	UiNoMatches,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { injectFollowActions } from "../../users-discover/follow-actions";
import { UserCard } from "../../users-discover/user-card/user-card";
import {
	type ProfileAccessError,
	ProfileAccessState
} from "../components/profile-access-state";
import { PublicProfileService } from "../public-profile.service";
import {
	type ConnectionsPage,
	PublicSocialService
} from "../services/public-social.service";

export type ConnectionKind = "followers" | "following";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const EMPTY_PAGE: ConnectionsPage = { users: [], total: 0 };

const CONNECTION_TABS: { kind: ConnectionKind; label: string }[] = [
	{ kind: "followers", label: "Followers" },
	{ kind: "following", label: "Following" }
];

@Component({
	selector: "app-user-connections",
	imports: [
		RouterLink,
		RouterLinkActive,
		LibraryHero,
		LibraryToolbar,
		ProfileAccessState,
		UserCard,
		UnfollowConfirmDialog,
		UiButton,
		UiEmptyState,
		UiNoMatches,
		UiPagination,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./user-connections.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserConnections {
	private readonly route = inject(ActivatedRoute);
	private readonly socialService = inject(PublicSocialService);
	private readonly profileService = inject(PublicProfileService);
	private readonly followActions = injectFollowActions();

	protected readonly unfollowTarget = this.followActions.unfollowTarget;

	protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
	protected readonly tabs = CONNECTION_TABS;
	protected readonly username =
		this.route.snapshot.paramMap.get("username") ?? "";
	protected readonly kind: ConnectionKind =
		this.route.snapshot.data["kind"] ?? "followers";
	protected readonly query = signal("");
	protected readonly search = signal("");
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly skeletonRange = [0, 1, 2, 3, 4, 5];

	private readonly searchChanges = new Subject<string>();

	private readonly connections = rxResource({
		params: () => ({
			username: this.username,
			search: this.search(),
			offset: this.offset()
		}),
		stream: ({ params: { username, search, offset } }) => {
			const query = { limit: PAGE_SIZE, offset, search };
			return this.kind === "followers"
				? this.socialService.getFollowers(username, query)
				: this.socialService.getFollowing(username, query);
		}
	});

	private readonly totals = rxResource({
		params: () => this.username,
		stream: ({ params: username }) =>
			this.profileService.getProfile(username).pipe(
				map(profile => ({
					followers: profile.followerCount,
					following: profile.followingCount
				})),
				catchError(() => of(null))
			)
	});

	private readonly page = computed(() =>
		this.connections.hasValue() ? this.connections.value() : null
	);

	private readonly lastLoadedPage = linkedSignal<
		ConnectionsPage | null,
		ConnectionsPage
	>({
		source: this.page,
		computation: (page, previous) => page ?? previous?.value ?? EMPTY_PAGE
	});

	private readonly inRangeOffset = computed(() => {
		const page = this.page();
		if (!page || page.users.length > 0 || this.offset() === 0) return null;
		return Math.max(0, Math.ceil(page.total / PAGE_SIZE) - 1) * PAGE_SIZE;
	});

	protected readonly isLoading = computed(
		() => this.connections.isLoading() || this.inRangeOffset() !== null
	);
	protected readonly error = computed<ProfileAccessError | null>(() => {
		const error = this.connections.error() as { status?: number } | null;
		if (!error) return null;
		return error.status === 403 ? "private" : "not_found";
	});

	protected readonly users = computed(() => this.page()?.users ?? []);
	protected readonly total = computed(() => this.page()?.total ?? 0);

	protected readonly hasNoConnections = computed(
		() => !this.isLoading() && !this.search() && this.total() === 0
	);

	protected readonly heroPosters = computed(() =>
		this.lastLoadedPage().users.flatMap(user =>
			user.featuredGame?.backgroundUrl
				? [
						{
							src: user.featuredGame.backgroundUrl,
							title: user.featuredGame.title
						}
					]
				: []
		)
	);

	protected readonly connectionCount = computed(() =>
		this.countFor(this.kind)
	);

	constructor() {
		this.searchChanges
			.pipe(
				debounceTime(SEARCH_DEBOUNCE_MS),
				distinctUntilChanged(),
				takeUntilDestroyed()
			)
			.subscribe(search => this.applySearch(search));

		effect(() => {
			const offset = this.inRangeOffset();
			if (offset !== null) this.offset.set(offset);
		});
	}

	protected onSearch(value: string) {
		this.query.set(value);
		this.searchChanges.next(value.trim());
	}

	protected clearSearch() {
		this.query.set("");
		this.searchChanges.next("");
		this.applySearch("");
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
	}

	protected countFor(kind: ConnectionKind): number | null {
		const page = this.page();
		if (kind === this.kind && page && !this.search()) return page.total;
		return this.totals.value()?.[kind] ?? null;
	}

	private applySearch(search: string) {
		this.search.set(search);
		this.offset.set(0);
	}

	protected withLiveCounts(user: UserResult): UserResult {
		return this.followActions.withLiveCounts(user);
	}

	protected followStateOf(user: UserResult) {
		return this.followActions.followStateOf(user);
	}

	protected isBusy(user: UserResult): boolean {
		return this.followActions.isBusy(user);
	}

	protected toggleFollow(user: UserResult) {
		this.followActions.toggleFollow(user);
	}

	protected confirmUnfollow() {
		this.followActions.confirmUnfollow();
	}

	protected cancelUnfollow() {
		this.followActions.cancelUnfollow();
	}
}
