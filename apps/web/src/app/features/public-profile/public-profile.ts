import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { AuthService } from "../../core/services/auth";
import { DialogService } from "../../core/services/dialog";
import { ToastService } from "../../core/services/toast";
import { GameCoverCard } from "../../shared/components/game-cover-card/game-cover-card";
import { PosterShelf } from "../../shared/components/poster-shelf/poster-shelf";
import {
	UserListModal,
	type UserListModalData
} from "../../shared/components/user-list-modal/user-list-modal";
import { UiAvatar, UiButton, UiSkeleton } from "../../shared/ui";
import { type FranchiseProgress } from "../franchises/franchises";
import { ProfileAccessState } from "./components/profile-access-state";
import { ProfileActivity } from "./components/profile-activity";
import { ProfileCollections } from "./components/profile-collections";
import { ProfileHero } from "./components/profile-hero";
import { ProfileInCommon } from "./components/profile-in-common";
import { ProfileLists } from "./components/profile-lists";
import { ProfileMonthReview } from "./components/profile-month-review";
import { ProfilePlayingNow } from "./components/profile-playing-now";
import { ProfileReviews } from "./components/profile-reviews";
import { ProfileSagas } from "./components/profile-sagas";
import { ProfileSectionHeader } from "./components/profile-section-header";
import { ProfileStats } from "./components/profile-stats";
import { ProfileUpNext } from "./components/profile-up-next";
import {
	type PublicProfile,
	PublicProfileService
} from "./public-profile.service";
import { COMPARISON_OPTIONS } from "./services/comparison-options";
import {
	type ComparisonDimension,
	type PublicFavorite,
	PublicLibraryService,
	type UserComparison
} from "./services/public-library.service";
import {
	type HighlightEntry,
	PublicReviewsService,
	type ReviewEntry
} from "./services/public-reviews.service";
import { PublicSocialService } from "./services/public-social.service";

const LATEST_REVIEWS_COUNT = 4;
const REVIEWS_SAMPLE_SIZE = 20;

@Component({
	selector: "app-public-profile",
	imports: [
		NgTemplateOutlet,
		RouterLink,
		GameCoverCard,
		PosterShelf,
		ProfileAccessState,
		ProfileActivity,
		ProfileCollections,
		ProfileHero,
		ProfileInCommon,
		ProfileLists,
		ProfileMonthReview,
		ProfilePlayingNow,
		ProfileReviews,
		ProfileSagas,
		ProfileSectionHeader,
		ProfileStats,
		ProfileUpNext,
		UiAvatar,
		UiButton,
		UiSkeleton
	],
	templateUrl: "./public-profile.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicProfileComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly profileService = inject(PublicProfileService);
	private readonly socialService = inject(PublicSocialService);
	private readonly libraryService = inject(PublicLibraryService);
	private readonly reviewsService = inject(PublicReviewsService);
	private readonly authService = inject(AuthService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);

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
	protected readonly emptyStats = {
		not_started: 0,
		playing: 0,
		completed: 0,
		abandoned: 0,
		total: 0
	};
	protected readonly visibility = computed(() => {
		const user = this.profile()?.user;
		const self = this.isSelf();
		const visible = (level: string | undefined) =>
			self || (!!level && level !== "private");
		return {
			backlog: visible(user?.backlogVisibility),
			shelf: visible(user?.shelfVisibility),
			lists: visible(user?.listVisibility),
			favorites: visible(user?.favoriteVisibility),
			queue: visible(user?.queueVisibility),
			wishlist: visible(user?.wishlistVisibility)
		};
	});
	protected readonly backdropUrl = computed(() => {
		const fromFavorites = this.favoritesData()?.find(
			favorite => favorite.game.backgroundUrl
		)?.game.backgroundUrl;
		if (fromFavorites) return fromFavorites;
		const profile = this.profile();
		return (
			profile?.backlogs.find(backlog => backlog.game.backgroundUrl)?.game
				.backgroundUrl ??
			profile?.recentActivity.find(
				activity => activity.game?.backgroundUrl
			)?.game?.backgroundUrl ??
			null
		);
	});

	protected readonly favoritesData = signal<PublicFavorite[] | null>(null);
	protected readonly sagas = signal<FranchiseProgress[]>([]);
	protected readonly comparison = signal<UserComparison | null>(null);
	protected readonly comparisonBy = signal<ComparisonDimension>("completed");
	protected readonly comparisonLoading = signal(false);
	protected readonly comparisonPrivate = signal(false);
	protected readonly comparisonDimensions = COMPARISON_OPTIONS;
	protected readonly comparisonGames = computed(
		() => this.comparison()?.inCommon ?? []
	);
	protected readonly comparisonCount = computed(
		() => this.comparison()?.counts.inCommon ?? 0
	);
	protected readonly showComparison = computed(
		() => this.isLoggedIn() && !this.isSelf() && !!this.profile()
	);
	protected readonly showActivity = computed(() => {
		const p = this.profile();
		if (!p) return false;
		return (
			(this.isSelf() || p.user.feedVisibility !== "private") &&
			p.recentActivity.length > 0
		);
	});
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
		this.reviewsService.getHighlights(u, { year, month }).subscribe({
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
		this.reviewsService.getHighlights(username, { year, month }).subscribe({
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

	private ensureFavoritesLoaded(username: string) {
		if (this.favoritesData() !== null) return;
		this.libraryService.getUserFavorites(username, { limit: 8 }).subscribe({
			next: res =>
				this.favoritesData.set(
					res.items.map(e => ({
						id: e.id,
						position: e.position,
						game: e.game
					}))
				),
			error: () => this.favoritesData.set([])
		});
	}

	protected readonly userReviews = signal<ReviewEntry[]>([]);
	protected readonly latestReviews = computed(() => {
		const reviews = this.userReviews();
		const written = reviews.filter(review => review.content?.trim());
		const ratedOnly = reviews.filter(review => !review.content?.trim());
		return [...written, ...ratedOnly].slice(0, LATEST_REVIEWS_COUNT);
	});
	protected readonly userReviewsTotal = signal(0);

	ngOnInit() {
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
		this.socialService.follow(u).subscribe({
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
		this.socialService.unfollow(u).subscribe({
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
		this.socialService.cancelFollowRequest(u).subscribe({
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
		this.dialogs.open<UserListModalData>(UserListModal, {
			data: {
				title: "Followers",
				users$: this.socialService.getFollowers(this.username())
			}
		});
	}

	showFollowing() {
		this.dialogs.open<UserListModalData>(UserListModal, {
			data: {
				title: "Following",
				users$: this.socialService.getFollowing(this.username())
			}
		});
	}

	shareProfile() {
		const url = window.location.href.split("?")[0];
		const name = this.profile()?.user.name || this.username();
		if (navigator.share) {
			navigator
				.share({ title: `${name} on Completr`, url })
				.catch(() => undefined);
			return;
		}
		navigator.clipboard
			?.writeText(url)
			.then(() => this.toast.success("Profile link copied."))
			.catch(() => this.toast.warning("Could not copy the link."));
	}

	protected scrollToLists() {
		document
			.getElementById("profile-lists")
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	protected changeComparison(by: ComparisonDimension) {
		if (by === this.comparisonBy() && this.comparison()) return;
		this.comparisonBy.set(by);
		this.loadComparison();
	}

	private loadComparison() {
		const username = this.username();
		const by = this.comparisonBy();
		this.comparisonLoading.set(true);
		this.comparisonPrivate.set(false);
		this.libraryService
			.getComparison(username, by, { limit: 12 })
			.subscribe({
				next: data => {
					this.comparison.set(data);
					this.comparisonLoading.set(false);
				},
				error: err => {
					this.comparison.set(null);
					this.comparisonPrivate.set(err.status === 403);
					this.comparisonLoading.set(false);
				}
			});
	}

	private loadProfile(username: string) {
		this.isLoading.set(true);
		this.isPrivate.set(false);
		this.notFound.set(false);
		this.profile.set(null);
		this.highlightsData.set(null);
		this.highlightsMonth.set(this.currentMonth());
		this.favoritesData.set(null);
		this.comparison.set(null);
		this.comparisonBy.set("completed");
		this.comparisonPrivate.set(false);
		this.sagas.set([]);
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
				this.isLoading.set(false);
				if (this.visibility().backlog) {
					this.ensureHighlightsLoaded(username);
				}
				if (
					this.isSelf() ||
					data.user.favoriteVisibility !== "private"
				) {
					this.ensureFavoritesLoaded(username);
				}
				this.reviewsService
					.getUserReviews(username, { limit: REVIEWS_SAMPLE_SIZE })
					.subscribe(r => {
						this.userReviews.set(r.reviews);
						this.userReviewsTotal.set(r.total);
					});
				this.comparison.set(null);
				if (this.isLoggedIn() && !this.isSelf()) {
					this.loadComparison();
				}
				this.sagas.set([]);
				this.libraryService.getUserFranchises(username).subscribe({
					next: franchises => this.sagas.set(franchises),
					error: () => this.sagas.set([])
				});
			},
			error: err => {
				if (err.status === 404) this.notFound.set(true);
				this.isLoading.set(false);
			}
		});
	}
}
