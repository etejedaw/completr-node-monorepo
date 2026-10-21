import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink, RouterLinkActive } from "@angular/router";
import { catchError, map, of } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { type UserResult } from "../../../core/services/users";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { UnfollowConfirmDialog } from "../../../shared/components/unfollow-confirm-dialog/unfollow-confirm-dialog";
import {
	UiButton,
	UiEmptyState,
	UiNoMatches,
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
import { PublicSocialService } from "../services/public-social.service";

export type ConnectionKind = "followers" | "following";

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
	protected readonly skeletonRange = [0, 1, 2, 3, 4, 5];

	private readonly connections = rxResource({
		params: () => this.username,
		stream: ({ params: username }) =>
			this.kind === "followers"
				? this.socialService.getFollowers(username)
				: this.socialService.getFollowing(username)
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

	protected readonly isLoading = this.connections.isLoading;
	protected readonly error = computed<ProfileAccessError | null>(() => {
		const error = this.connections.error() as { status?: number } | null;
		if (!error) return null;
		return error.status === 403 ? "private" : "not_found";
	});

	protected readonly users = computed(() =>
		this.connections.hasValue() ? this.connections.value() : []
	);

	protected readonly visibleUsers = computed(() => {
		const normalizedQuery = this.query().toLowerCase().trim();
		if (!normalizedQuery) return this.users();
		return this.users().filter(
			user =>
				user.username.toLowerCase().includes(normalizedQuery) ||
				user.name?.toLowerCase().includes(normalizedQuery)
		);
	});

	protected readonly heroPosters = computed(() =>
		this.users().flatMap(user =>
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

	protected countFor(kind: ConnectionKind): number | null {
		if (kind === this.kind && this.connections.hasValue())
			return this.connections.value().length;
		return this.totals.value()?.[kind] ?? null;
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
