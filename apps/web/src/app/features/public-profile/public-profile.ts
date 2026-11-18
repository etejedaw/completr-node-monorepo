import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DOCUMENT,
	inject,
	signal
} from "@angular/core";

import { AdminPremiumAccess } from "../../shared/components/admin-premium-access/admin-premium-access";
import { GameCoverCard } from "../../shared/components/game-cover-card/game-cover-card";
import { GiftOfferCard } from "../../shared/components/gift-offer-card/gift-offer-card";
import { PosterShelf } from "../../shared/components/poster-shelf/poster-shelf";
import { ProfileAccessState } from "../../shared/components/profile-access-state/profile-access-state";
import { ProfileSectionHeader } from "../../shared/components/profile-section-header/profile-section-header";
import { UnfollowConfirmDialog } from "../../shared/components/unfollow-confirm-dialog/unfollow-confirm-dialog";
import { UiButton, UiPlainEmptyState, UiSkeleton } from "../../shared/ui";
import { ProfileActivity } from "./components/profile-activity";
import { ProfileCollections } from "./components/profile-collections";
import { ProfileFavoriteTags } from "./components/profile-favorite-tags";
import { ProfileGuestCta } from "./components/profile-guest-cta";
import { ProfileHero } from "./components/profile-hero";
import { ProfileInCommon } from "./components/profile-in-common";
import { ProfileLists } from "./components/profile-lists";
import { ProfileMonthReview } from "./components/profile-month-review";
import { ProfilePlatinums } from "./components/profile-platinums";
import { ProfilePlayingNow } from "./components/profile-playing-now";
import { ProfilePrivateState } from "./components/profile-private-state";
import { ProfileReviews } from "./components/profile-reviews";
import { ProfileRewindSpotlight } from "./components/profile-rewind-spotlight";
import { ProfileRewinds } from "./components/profile-rewinds";
import { ProfileSagas } from "./components/profile-sagas";
import { ProfileStats } from "./components/profile-stats";
import { ProfileUpNext } from "./components/profile-up-next";
import { injectProfileShare } from "./inject-profile-share";
import { injectPublicProfile } from "./inject-public-profile";
import { type PublicUser } from "./public-profile.model";
import { COMPARISON_OPTIONS } from "./services/comparison-options";

const SKELETON_ROW_COUNT = 6;
const PROFILE_LISTS_SECTION_ID = "profile-lists";

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "long",
	timeZone: "UTC"
});

@Component({
	selector: "app-public-profile",
	imports: [
		AdminPremiumAccess,
		NgTemplateOutlet,
		GameCoverCard,
		GiftOfferCard,
		PosterShelf,
		ProfileAccessState,
		ProfileActivity,
		ProfileCollections,
		ProfileFavoriteTags,
		ProfileGuestCta,
		ProfileHero,
		ProfileInCommon,
		ProfileLists,
		ProfileMonthReview,
		ProfilePlatinums,
		ProfilePlayingNow,
		ProfilePrivateState,
		ProfileReviews,
		ProfileRewindSpotlight,
		ProfileRewinds,
		ProfileSagas,
		ProfileSectionHeader,
		ProfileStats,
		ProfileUpNext,
		UiButton,
		UiPlainEmptyState,
		UiSkeleton,
		UnfollowConfirmDialog
	],
	templateUrl: "./public-profile.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicProfileComponent {
	private readonly document = inject(DOCUMENT);
	private readonly state = injectPublicProfile();
	private readonly shareLink = injectProfileShare();

	protected readonly username = this.state.username;
	protected readonly isLoggedIn = this.state.isLoggedIn;
	protected readonly isLoading = this.state.isLoading;
	protected readonly notFound = this.state.notFound;
	protected readonly loadFailed = this.state.loadFailed;
	protected readonly isPrivate = this.state.isPrivate;
	protected readonly profile = this.state.profile;
	protected readonly isSelf = this.state.isSelf;
	protected readonly canManagePremium = this.state.canManagePremium;
	protected readonly visibility = this.state.visibility;
	protected readonly backdropUrl = this.state.backdropUrl;
	protected readonly togglingFollow = this.state.togglingFollow;
	protected readonly unfollowTarget = this.state.unfollowTarget;
	protected readonly confirmUnfollow = this.state.confirmUnfollow;
	protected readonly cancelUnfollow = this.state.cancelUnfollow;
	protected readonly toggleFollow = this.state.toggleFollow;
	protected readonly retry = this.state.retry;
	protected readonly queueData = this.state.queueData;
	protected readonly favoritesData = this.state.favoritesData;
	protected readonly favoriteTags = this.state.favoriteTags;
	protected readonly platinumsData = this.state.platinumsData;
	protected readonly platinumsTotal = this.state.platinumsTotal;
	protected readonly sagas = this.state.sagas;
	protected readonly rewindYears = this.state.rewindYears;
	protected readonly rewindSpotlight = this.state.rewindSpotlight;
	protected readonly pastRewinds = this.state.pastRewinds;
	protected readonly reloadRewinds = this.state.reloadRewinds;
	protected readonly highlightsData = this.state.highlightsData;
	protected readonly isAtCurrentMonth = this.state.isAtCurrentMonth;
	protected readonly isLoadingHighlightsMonth =
		this.state.isLoadingHighlightsMonth;
	protected readonly changeHighlightsMonth = this.state.changeHighlightsMonth;
	protected readonly latestReviews = this.state.latestReviews;
	protected readonly userReviewsTotal = this.state.userReviewsTotal;
	protected readonly comparisonBy = this.state.comparisonBy;
	protected readonly comparisonLoading = this.state.comparisonLoading;
	protected readonly comparisonPrivate = this.state.comparisonPrivate;
	protected readonly showComparison = this.state.showComparison;
	protected readonly changeComparison = this.state.changeComparison;
	protected readonly recentActivity = this.state.recentActivity;
	protected readonly showActivity = this.state.showActivity;
	protected readonly deleteActivity = this.state.deleteActivity;

	protected readonly listsSectionId = PROFILE_LISTS_SECTION_ID;
	protected readonly comparisonDimensions = COMPARISON_OPTIONS;
	protected readonly showPremiumAccess = signal(false);
	protected readonly emptyStats = {
		not_started: 0,
		playing: 0,
		completed: 0,
		abandoned: 0,
		total: 0
	};
	protected readonly skeletonRange = Array.from(
		{ length: SKELETON_ROW_COUNT },
		(_, index) => index
	);
	protected readonly comparisonGames = computed(
		() => this.state.comparison()?.inCommon ?? []
	);
	protected readonly comparisonCount = computed(
		() => this.state.comparison()?.counts.inCommon ?? 0
	);
	protected readonly monthLabel = computed(() => {
		const { year, month } = this.state.highlightsMonth();
		return MONTH_LABEL_FORMAT.format(
			new Date(Date.UTC(year, month - 1, 1))
		);
	});

	protected openPremiumAccess() {
		if (this.canManagePremium()) this.showPremiumAccess.set(true);
	}

	protected closePremiumAccess() {
		this.showPremiumAccess.set(false);
		this.state.refreshPremiumFlag();
	}

	protected shareProfile(user: PublicUser) {
		this.shareLink(user.name || user.username);
	}

	protected scrollToLists() {
		this.document
			.getElementById(PROFILE_LISTS_SECTION_ID)
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	}
}
