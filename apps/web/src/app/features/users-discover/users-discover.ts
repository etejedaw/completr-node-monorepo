import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { debounceTime, of, Subject, switchMap } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { type UserResult, UsersService } from "../../core/services/users";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../shared/components/library-toolbar/library-toolbar";
import { UiEmptyState, UiSearchBar, UiSkeleton } from "../../shared/ui";
import { PublicSocialService } from "../public-profile/services/public-social.service";
import { type FollowState, UserCard } from "./user-card/user-card";

const DISCOVER_LIMIT = 12;
const SEARCH_LIMIT = 30;
const EMAIL_PATTERN = /.+@.+\..+/;

@Component({
	selector: "app-users-discover",
	imports: [
		NgTemplateOutlet,
		LibraryHero,
		LibraryToolbar,
		UserCard,
		UiEmptyState,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./users-discover.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersDiscover implements OnInit {
	private readonly usersService = inject(UsersService);
	private readonly socialService = inject(PublicSocialService);
	private readonly toast = inject(ToastService);
	private readonly searchSubject = new Subject<string>();

	protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
	protected readonly discoverUsers = signal<UserResult[]>([]);
	protected readonly searchResults = signal<UserResult[]>([]);
	protected readonly searchQuery = signal("");
	protected readonly isLoadingDiscover = signal(true);
	protected readonly isSearching = signal(false);
	protected readonly skeletonRange = Array.from({ length: 6 }, (_, i) => i);
	private readonly followOverrides = signal<Record<string, FollowState>>({});
	private readonly followerDeltas = signal<Record<string, number>>({});
	protected readonly busyIds = signal<Set<string>>(new Set());

	protected readonly heroPosters = computed(() =>
		[...this.discoverUsers(), ...this.searchResults()].flatMap(user =>
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

	ngOnInit() {
		this.loadDiscover();

		this.searchSubject
			.pipe(
				debounceTime(400),
				switchMap(query => {
					const trimmed = query.trim();
					if (trimmed.length < 2) {
						this.isSearching.set(false);
						return of<UserResult[]>([]);
					}
					this.isSearching.set(true);
					return EMAIL_PATTERN.test(trimmed)
						? this.usersService.search({ email: trimmed })
						: this.usersService.search({
								q: trimmed,
								limit: SEARCH_LIMIT
							});
				})
			)
			.subscribe(users => {
				this.searchResults.set(users);
				this.isSearching.set(false);
			});
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (query.trim().length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	protected withLiveCounts(user: UserResult): UserResult {
		const delta = this.followerDeltas()[user.id] ?? 0;
		if (
			!delta ||
			user.followerCount === null ||
			user.followerCount === undefined
		)
			return user;
		return { ...user, followerCount: user.followerCount + delta };
	}

	protected followStateOf(user: UserResult): FollowState {
		return (
			this.followOverrides()[user.id] ??
			(user.isFollowing ? "following" : "none")
		);
	}

	protected isBusy(user: UserResult): boolean {
		return this.busyIds().has(user.id);
	}

	protected toggleFollow(user: UserResult) {
		const state = this.followStateOf(user);
		if (state === "following") this.unfollowWithUndo(user);
		else if (state === "requested") this.cancelRequest(user);
		else this.follow(user);
	}

	private follow(user: UserResult) {
		this.setBusy(user.id, true);
		this.socialService.follow(user.username).subscribe({
			next: result => {
				const accepted = result.status === "accepted";
				this.setFollowState(
					user.id,
					accepted ? "following" : "requested"
				);
				if (accepted) this.adjustFollowers(user.id, 1);
				this.setBusy(user.id, false);
			},
			error: () => {
				this.setBusy(user.id, false);
				this.toast.error(`Could not follow @${user.username}.`);
			}
		});
	}

	private cancelRequest(user: UserResult) {
		this.setBusy(user.id, true);
		this.socialService.cancelFollowRequest(user.username).subscribe({
			next: () => {
				this.setFollowState(user.id, "none");
				this.setBusy(user.id, false);
			},
			error: () => this.setBusy(user.id, false)
		});
	}

	private unfollowWithUndo(user: UserResult) {
		this.setFollowState(user.id, "none");
		this.adjustFollowers(user.id, -1);
		this.toast.pending({
			message: `Unfollowed @${user.username}`,
			onCommit: () =>
				this.socialService.unfollow(user.username).subscribe({
					error: () => {
						this.setFollowState(user.id, "following");
						this.adjustFollowers(user.id, 1);
						this.toast.error(
							`Could not unfollow @${user.username}.`
						);
					}
				}),
			onUndo: () => {
				this.setFollowState(user.id, "following");
				this.adjustFollowers(user.id, 1);
			}
		});
	}

	private setFollowState(userId: string, state: FollowState) {
		this.followOverrides.update(overrides => ({
			...overrides,
			[userId]: state
		}));
	}

	private adjustFollowers(userId: string, delta: number) {
		this.followerDeltas.update(deltas => ({
			...deltas,
			[userId]: (deltas[userId] ?? 0) + delta
		}));
	}

	private setBusy(userId: string, busy: boolean) {
		this.busyIds.update(ids => {
			const next = new Set(ids);
			if (busy) next.add(userId);
			else next.delete(userId);
			return next;
		});
	}

	private loadDiscover() {
		this.isLoadingDiscover.set(true);
		this.usersService.discover(DISCOVER_LIMIT).subscribe({
			next: users => {
				this.discoverUsers.set(users);
				this.isLoadingDiscover.set(false);
			},
			error: () => this.isLoadingDiscover.set(false)
		});
	}
}
