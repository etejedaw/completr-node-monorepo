import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import {
	PublicProfileService,
	PublicProfile,
	PublicList,
	PublicFavorite,
	PublicQueue,
	PublicGameShelf,
	HighlightEntry
} from "./public-profile.service";
import {
	UserListModal,
	UserSummary
} from "../../shared/components/user-list-modal/user-list-modal";
import { StarRating } from "../../shared/components/star-rating/star-rating";
import {
	UiButton,
	UiSkeleton,
	UiTab,
	UiTabList,
	UiTabPanel,
	UiTabs
} from "../../shared/ui";
import {
	activityIcon,
	activityIconColorClass,
	activityLabel
} from "../../shared/utils/activity-labels";

@Component({
	selector: "app-public-profile",
	imports: [RouterLink, UserListModal, StarRating, UiButton, UiSkeleton, UiTabs, UiTabList, UiTab, UiTabPanel],
	templateUrl: "./public-profile.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicProfileComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly profileService = inject(PublicProfileService);
	private readonly authService = inject(AuthService);

	private static readonly HIGHLIGHTS_MONTH_PARAM = "highlightsMonth";

	protected readonly profile = signal<PublicProfile | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly isPrivate = signal(false);
	protected readonly notFound = signal(false);
	protected readonly username = signal("");
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly isSelf = computed(
		() => this.authService.user()?.id === this.profile()?.user.id
	);
	protected readonly togglingFollow = signal(false);
	protected readonly showUnfollowConfirm = signal(false);
	protected readonly isWide = signal(false);
	protected readonly activeTab = signal("highlights");
	protected readonly roleBadge = computed(() => {
		const role = this.profile()?.user.role;
		if (!role || role === "user") return null;
		const map: Record<string, string> = {
			admin: "Admin",
			moderator: "Mod",
			premium: "Premium"
		};
		return map[role] ?? null;
	});
	protected readonly roleBadgeClass = computed(() => {
		const role = this.profile()?.user.role;
		if (role === "admin") return "bg-danger/15 text-danger";
		if (role === "moderator")
			return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
		if (role === "premium") return "bg-warning/15 text-warning";
		return "bg-[rgba(148,163,184,0.15)] text-fg-muted";
	});
	protected readonly stats = computed(() => {
		const p = this.profile();
		if (!p) return { completed: 0, playing: 0, lists: 0, reviews: 0 };
		return {
			completed: p.backlogStats?.completed ?? 0,
			playing: p.backlogStats?.playing ?? 0,
			lists: p.listsTotal ?? 0,
			reviews: this.userReviewsTotal()
		};
	});

	protected readonly listsData = signal<PublicList[] | null>(null);
	protected readonly favoritesData = signal<PublicFavorite[] | null>(null);
	protected readonly queueData = signal<PublicQueue[] | null>(null);
	protected readonly wishlistData = signal<
		{ id: string; position: number; game: { id: string; code: string; title: string; backgroundUrl?: string } }[] | null
	>(null);
	protected readonly gameShelfData = signal<PublicGameShelf[] | null>(null);
	protected readonly followingListsData = signal<PublicList[] | null>(null);
	protected readonly gamesInCommon = signal<
		{ id: string; code: string; title: string; backgroundUrl: string | null }[]
	>([]);
	protected readonly recentFollowers = signal<UserSummary[]>([]);
	protected readonly highlightsData = signal<{
		recent: HighlightEntry[];
		month: {
			startsAt: string;
			endsAt: string;
			completedCount: number;
			mostPlayed: HighlightEntry | null;
			highestRated: HighlightEntry | null;
		};
	} | null>(null);
	protected readonly highlightsMonth = signal(this.currentMonth());
	protected readonly isLoadingHighlightsMonth = signal(false);
	protected readonly monthLabel = computed(() => {
		const { year, month } = this.highlightsMonth();
		return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
			"en-US",
			{ year: "numeric", month: "long", timeZone: "UTC" }
		);
	});
	protected readonly isAtCurrentMonth = computed(() => {
		const { year, month } = this.highlightsMonth();
		const now = this.currentMonth();
		return year === now.year && month === now.month;
	});
	protected readonly skeletonRange = Array.from({ length: 6 }, (_, i) => i);

	private readonly lazyLoadEffect = effect(() => {
		const tab = this.activeTab();
		const p = this.profile();
		const u = this.username();
		if (!p || p.isPrivate || !u) return;
		if (tab === "lists") this.ensureListsLoaded(u);
		else if (tab === "favorites") this.ensureFavoritesLoaded(u);
		else if (tab === "queue") this.ensureQueueLoaded(u);
		else if (tab === "wishlist") this.ensureWishlistLoaded(u);
		else if (tab === "shelf") this.ensureGameShelfLoaded(u);
		else if (tab === "highlights") this.ensureHighlightsLoaded(u);
	});

	private pickDefaultTab(profile: PublicProfile): string {
		const u = profile.user;
		if (u.backlogVisibility !== "private") return "highlights";
		if (u.shelfVisibility !== "private") return "shelf";
		if (u.listVisibility !== "private") return "lists";
		if (u.favoriteVisibility !== "private") return "favorites";
		if (u.queueVisibility !== "private") return "queue";
		if (u.wishlistVisibility !== "private") return "wishlist";
		return "reviews";
	}

	private currentMonth(): { year: number; month: number } {
		const now = new Date();
		return {
			year: now.getUTCFullYear(),
			month: now.getUTCMonth() + 1
		};
	}

	private parseMonthParam(raw: string | null): {
		year: number;
		month: number;
	} | null {
		if (!raw) return null;
		const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw);
		if (!match) return null;
		return { year: Number(match[1]), month: Number(match[2]) };
	}

	private formatMonthParam(year: number, month: number): string {
		return `${year}-${String(month).padStart(2, "0")}`;
	}

	private syncHighlightsMonthInUrl() {
		const next = this.isAtCurrentMonth()
			? null
			: this.formatMonthParam(
					this.highlightsMonth().year,
					this.highlightsMonth().month
				);
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: {
				[PublicProfileComponent.HIGHLIGHTS_MONTH_PARAM]: next
			},
			queryParamsHandling: "merge",
			replaceUrl: true
		});
	}

	protected goToPreviousMonth() {
		const { year, month } = this.highlightsMonth();
		const next =
			month === 1
				? { year: year - 1, month: 12 }
				: { year, month: month - 1 };
		this.highlightsMonth.set(next);
		this.syncHighlightsMonthInUrl();
		this.refetchHighlights();
	}

	protected goToNextMonth() {
		if (this.isAtCurrentMonth()) return;
		const { year, month } = this.highlightsMonth();
		const next =
			month === 12
				? { year: year + 1, month: 1 }
				: { year, month: month + 1 };
		this.highlightsMonth.set(next);
		this.syncHighlightsMonthInUrl();
		this.refetchHighlights();
	}

	private refetchHighlights() {
		const u = this.username();
		if (!u) return;
		const { year, month } = this.highlightsMonth();
		this.isLoadingHighlightsMonth.set(true);
		this.profileService.getHighlights(u, { year, month }).subscribe({
			next: data => {
				this.highlightsData.set(data);
				this.isLoadingHighlightsMonth.set(false);
			},
			error: () => this.isLoadingHighlightsMonth.set(false)
		});
	}

	private ensureHighlightsLoaded(username: string) {
		if (this.highlightsData() !== null) return;
		const { year, month } = this.highlightsMonth();
		this.profileService.getHighlights(username, { year, month }).subscribe({
			next: data => this.highlightsData.set(data),
			error: () =>
				this.highlightsData.set({
					recent: [],
					month: {
						startsAt: new Date().toISOString(),
						endsAt: new Date().toISOString(),
						completedCount: 0,
						mostPlayed: null,
						highestRated: null
					}
				})
		});
	}

	private ensureListsLoaded(username: string) {
		if (this.listsData() !== null) return;
		this.profileService.getUserLists(username).subscribe({
			next: res => this.listsData.set(res.items),
			error: () => this.listsData.set([])
		});
		this.profileService.getUserFollowingLists(username).subscribe({
			next: res => this.followingListsData.set(res.items),
			error: () => this.followingListsData.set([])
		});
	}

	private ensureFavoritesLoaded(username: string) {
		if (this.favoritesData() !== null) return;
		this.profileService.getUserFavorites(username, { limit: 6 }).subscribe({
			next: res =>
				this.favoritesData.set(
					res.items.map(e => ({ id: e.id, position: e.position, game: e.game }))
				),
			error: () => this.favoritesData.set([])
		});
	}

	private ensureQueueLoaded(username: string) {
		if (this.queueData() !== null) return;
		this.profileService.getUserQueue(username, { limit: 6 }).subscribe({
			next: res =>
				this.queueData.set(
					res.items.map(e => ({
						id: e.id,
						position: e.position,
						backlog: {
							id: e.backlog.id,
							status: e.backlog.status,
							game: e.backlog.game,
							platform: e.backlog.platform
						}
					}))
				),
			error: () => this.queueData.set([])
		});
	}

	private ensureWishlistLoaded(username: string) {
		if (this.wishlistData() !== null) return;
		this.profileService.getUserWishlist(username, { limit: 6 }).subscribe({
			next: res =>
				this.wishlistData.set(
					res.items.map(e => ({
						id: e.id,
						position: e.position,
						game: e.game
					}))
				),
			error: () => this.wishlistData.set([])
		});
	}

	private ensureGameShelfLoaded(username: string) {
		if (this.gameShelfData() !== null) return;
		this.profileService.getUserGameShelf(username, { limit: 6 }).subscribe({
			next: res =>
				this.gameShelfData.set(
					res.items.map(e => ({
						id: e.id,
						game: e.game,
						platform: e.platform
					}))
				),
			error: () => this.gameShelfData.set([])
		});
	}
	protected readonly userReviews = signal<
		{
			id: string;
			content?: string;
			rating?: number;
			playthroughDuration?: number | null;
			game: { id: string; code: string; title: string } | null;
			createdAt: string;
		}[]
	>([]);
	protected readonly userReviewsTotal = signal(0);
	protected readonly showUserListModal = signal(false);
	protected readonly userListTitle = signal("");
	protected readonly userListUsers = signal<UserSummary[]>([]);

	ngOnInit() {
		if (typeof window !== "undefined" && window.matchMedia) {
			const mql = window.matchMedia("(min-width: 1024px)");
			this.isWide.set(mql.matches);
			mql.addEventListener("change", e => this.isWide.set(e.matches));
		}
		if (this.authService.token() && !this.authService.user()) {
			this.authService.loadUser().subscribe({
				next: () => this.init(),
				error: () => this.init()
			});
		} else {
			this.init();
		}
	}

	private init() {
		const rawMonth = this.route.snapshot.queryParamMap.get(
			PublicProfileComponent.HIGHLIGHTS_MONTH_PARAM
		);
		const parsed = this.parseMonthParam(rawMonth);
		if (parsed) this.highlightsMonth.set(parsed);
		this.route.paramMap.subscribe(params => {
			const raw = params.get("username") ?? "";
			this.username.set(raw);
			this.loadProfile(raw);
		});
	}

	onFollowButtonClick() {
		const p = this.profile();
		if (!p || this.togglingFollow()) return;
		if (p.isFollowing) {
			this.showUnfollowConfirm.set(true);
			return;
		}
		if (p.hasPendingRequest) {
			this.cancelOutgoingRequest();
			return;
		}
		this.follow();
	}

	confirmUnfollow() {
		this.unfollow();
	}

	private follow() {
		const u = this.username();
		if (!u || this.togglingFollow()) return;
		this.togglingFollow.set(true);
		this.profileService.follow(u).subscribe({
			next: result => {
				this.profile.update(prev => {
					if (!prev) return prev;
					if (result.status === "pending") {
						return { ...prev, hasPendingRequest: true };
					}
					return {
						...prev,
						isFollowing: true,
						followerCount: prev.followerCount + 1
					};
				});
				this.togglingFollow.set(false);
			},
			error: () => this.togglingFollow.set(false)
		});
	}

	private unfollow() {
		const u = this.username();
		if (!u || this.togglingFollow()) return;
		this.togglingFollow.set(true);
		this.profileService.unfollow(u).subscribe({
			next: () => {
				this.profile.update(prev =>
					prev
						? {
								...prev,
								isFollowing: false,
								followerCount: Math.max(
									0,
									prev.followerCount - 1
								)
							}
						: prev
				);
				this.togglingFollow.set(false);
				this.showUnfollowConfirm.set(false);
			},
			error: () => this.togglingFollow.set(false)
		});
	}

	private cancelOutgoingRequest() {
		const u = this.username();
		if (!u || this.togglingFollow()) return;
		this.togglingFollow.set(true);
		this.profileService.cancelFollowRequest(u).subscribe({
			next: () => {
				this.profile.update(prev =>
					prev ? { ...prev, hasPendingRequest: false } : prev
				);
				this.togglingFollow.set(false);
			},
			error: () => this.togglingFollow.set(false)
		});
	}

	showFollowers() {
		this.userListTitle.set("Followers");
		this.userListUsers.set([]);
		this.showUserListModal.set(true);
		this.profileService
			.getFollowers(this.username())
			.subscribe(users => this.userListUsers.set(users));
	}

	showFollowing() {
		this.userListTitle.set("Following");
		this.userListUsers.set([]);
		this.showUserListModal.set(true);
		this.profileService
			.getFollowing(this.username())
			.subscribe(users => this.userListUsers.set(users));
	}

	protected activityLabel = activityLabel;
	protected activityIcon = activityIcon;
	protected activityIconColorClass = activityIconColorClass;

	protected timeAgo(date: string): string {
		const diff = Date.now() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return "just now";
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	protected get memberSince(): string {
		const date = this.profile()?.user.createdAt;
		if (!date) return "";
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long"
		});
	}

	private loadProfile(username: string) {
		this.isLoading.set(true);
		this.isPrivate.set(false);
		this.notFound.set(false);
		this.profile.set(null);
		this.highlightsData.set(null);
		this.highlightsMonth.set(this.currentMonth());
		this.listsData.set(null);
		this.favoritesData.set(null);
		this.queueData.set(null);
		this.wishlistData.set(null);
		this.gameShelfData.set(null);
		this.followingListsData.set(null);
		this.gamesInCommon.set([]);
		this.recentFollowers.set([]);
		this.userReviews.set([]);
		this.userReviewsTotal.set(0);

		this.profileService.getProfile(username).subscribe({
			next: data => {
				this.profile.set(data);
				if (data.isPrivate) {
					this.isPrivate.set(true);
					this.isLoading.set(false);
					return;
				}
				this.activeTab.set(this.pickDefaultTab(data));
				this.isLoading.set(false);
				this.profileService
					.getUserReviews(username, { limit: 5 })
					.subscribe(r => {
						this.userReviews.set(r.reviews);
						this.userReviewsTotal.set(r.total);
					});
				this.gamesInCommon.set([]);
				if (this.isLoggedIn() && !this.isSelf()) {
					this.profileService
						.getGamesInCommon(username)
						.subscribe(d => this.gamesInCommon.set(d.games));
				}
				this.recentFollowers.set([]);
				if (
					data.user.feedVisibility !== "private" &&
					data.recentActivity.length > 0
				) {
					this.profileService
						.getFollowers(username)
						.subscribe(users =>
							this.recentFollowers.set(users.slice(0, 8))
						);
				}
			},
			error: err => {
				if (err.status === 404) this.notFound.set(true);
				this.isLoading.set(false);
			}
		});
	}
}
