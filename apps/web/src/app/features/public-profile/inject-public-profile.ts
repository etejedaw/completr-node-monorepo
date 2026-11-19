import {
	computed,
	DestroyRef,
	inject,
	linkedSignal,
	signal
} from "@angular/core";
import {
	rxResource,
	takeUntilDestroyed,
	toSignal
} from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { isPremiumRole } from "../../core/utils/premium";
import { injectFollowActions } from "../../shared/utils/inject-follow-actions";
import { type FollowSubject } from "../../shared/utils/inject-follow-actions.model";
import { FeedService } from "../feed/feed";
import { RewindService } from "../rewind/rewind";
import { type HighlightsMonth } from "./inject-public-profile.model";
import {
	pickProfileBackdrop,
	PROFILE_FAVORITES_LIMIT
} from "./profile-backdrop";
import {
	type PublicFavoriteTag,
	type PublicProfile
} from "./public-profile.model";
import { PublicProfileService } from "./public-profile.service";
import { errorStatusOf } from "./services/profile-access-error";
import {
	type ComparisonDimension,
	type PublicFavorite
} from "./services/public-library.model";
import { PublicLibraryService } from "./services/public-library.service";
import {
	type HighlightsData,
	type ReviewEntry
} from "./services/public-reviews.model";
import { PublicReviewsService } from "./services/public-reviews.service";

const HIGHLIGHTS_MONTH_PARAM = "highlightsMonth";
const MONTHS_IN_YEAR = 12;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const COMPARISON_LIMIT = 12;
const LATEST_REVIEWS_COUNT = 4;
const REVIEWS_SAMPLE_SIZE = 20;
const UP_NEXT_LIMIT = 10;
const PROFILE_PLATINUMS_LIMIT = 8;
const HIGHLIGHTS_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function currentMonth(): HighlightsMonth {
	const now = new Date();
	return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function parseMonthParam(raw: string | null): HighlightsMonth | null {
	const match = raw ? HIGHLIGHTS_MONTH_PATTERN.exec(raw) : null;
	return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}

function formatMonthParam({ year, month }: HighlightsMonth): string {
	return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(
	{ year, month }: HighlightsMonth,
	step: 1 | -1
): HighlightsMonth {
	const shifted = month + step;
	if (shifted < 1) return { year: year - 1, month: MONTHS_IN_YEAR };
	if (shifted > MONTHS_IN_YEAR) return { year: year + 1, month: 1 };
	return { year, month: shifted };
}

function emptyHighlights(): HighlightsData {
	const now = new Date().toISOString();
	return {
		recent: [],
		month: {
			startsAt: now,
			endsAt: now,
			completedCount: 0,
			longestPlayed: null,
			bestPersonalRatio: null,
			highestRated: null
		}
	};
}

function keepWhileLoading<T>(
	value: () => T | null,
	isLoading: () => boolean,
	key: () => string
) {
	return linkedSignal<{ value: T | null; key: string }, T | null>({
		source: () => ({ value: value(), key: key() }),
		computation: (source, previous) => {
			if (source.value !== null) return source.value;
			const sameKey = previous?.source.key === source.key;
			return isLoading() && sameKey ? previous.value : null;
		}
	});
}

export function injectPublicProfile() {
	const route = inject(ActivatedRoute);
	const router = inject(Router);
	const destroyRef = inject(DestroyRef);
	const authService = inject(AuthService);
	const toast = inject(ToastService);
	const profileService = inject(PublicProfileService);
	const libraryService = inject(PublicLibraryService);
	const reviewsService = inject(PublicReviewsService);
	const rewindService = inject(RewindService);
	const feedService = inject(FeedService);
	const followActions = injectFollowActions();

	const username = toSignal(
		route.paramMap.pipe(map(params => params.get("username") ?? "")),
		{ initialValue: "" }
	);
	const isLoggedIn = authService.isLoggedIn;

	const viewerReady = signal(!authService.token() || !!authService.user());
	if (!viewerReady()) {
		authService
			.loadUser()
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: () => viewerReady.set(true),
				error: () => viewerReady.set(true)
			});
	}

	const profileResource = rxResource({
		params: () => (viewerReady() && username() ? username() : undefined),
		stream: ({ params }) => profileService.getProfile(params)
	});
	const loadedProfile = linkedSignal<PublicProfile | null>(() =>
		profileResource.hasValue() ? profileResource.value() : null
	);

	const loadStatus = computed(() => errorStatusOf(profileResource.error()));
	const notFound = computed(() => loadStatus() === NOT_FOUND_STATUS);
	const loadFailed = computed(() => loadStatus() !== null && !notFound());
	const isLoading = computed(
		() => loadedProfile() === null && loadStatus() === null
	);
	const isPrivate = computed(() => !!loadedProfile()?.isPrivate);

	const followSubject = computed<FollowSubject | null>(() => {
		const current = loadedProfile();
		if (!current) return null;
		const { user } = current;
		return {
			id: user.id,
			username: user.username,
			name: user.name,
			avatarUrl: user.avatarUrl ?? null,
			profileVisibility: user.profileVisibility,
			isFollowing: current.isFollowing,
			hasPendingRequest: current.hasPendingRequest,
			followerCount: current.followerCount
		};
	});

	const profile = computed<PublicProfile | null>(() => {
		const current = loadedProfile();
		const subject = followSubject();
		if (!current || !subject) return current;
		const state = followActions.followStateOf(subject);
		return {
			...current,
			isFollowing: state === "following",
			hasPendingRequest: state === "requested",
			followerCount:
				followActions.withLiveCounts(subject).followerCount ??
				current.followerCount
		};
	});

	const togglingFollow = computed(() => {
		const subject = followSubject();
		return !!subject && followActions.isBusy(subject);
	});

	const isSelf = computed(
		() => authService.user()?.id === loadedProfile()?.user.id
	);
	const canManagePremium = computed(() => {
		const user = loadedProfile()?.user;
		return (
			!!user &&
			authService.user()?.role === "admin" &&
			!isSelf() &&
			!isPremiumRole(user.role)
		);
	});

	const visibility = computed(() => {
		const access = loadedProfile()?.access;
		return {
			backlog: !!access?.backlog,
			shelf: !!access?.shelf,
			lists: !!access?.list,
			favorites: !!access?.favorite,
			queue: !!access?.queue,
			wishlist: !!access?.wishlist,
			feed: !!access?.feed,
			platinums: !!access?.platinum,
			sagas: !!access?.franchise,
			rewind: !!access?.rewind,
			tags: !!access?.tag
		};
	});

	const openProfileOf = computed(() =>
		loadedProfile() && !isPrivate() ? username() : undefined
	);

	const highlightsMonth = linkedSignal<string, HighlightsMonth>({
		source: username,
		computation: (_, previous) =>
			previous
				? currentMonth()
				: (parseMonthParam(
						route.snapshot.queryParamMap.get(HIGHLIGHTS_MONTH_PARAM)
					) ?? currentMonth())
	});
	const isAtCurrentMonth = computed(() => {
		const { year, month } = highlightsMonth();
		const now = currentMonth();
		return year === now.year && month === now.month;
	});
	const highlightsResource = rxResource({
		params: () => {
			const name = openProfileOf();
			return name && visibility().backlog
				? { username: name, ...highlightsMonth() }
				: undefined;
		},
		stream: ({ params: { username: name, year, month } }) =>
			reviewsService
				.getHighlights(name, { year, month })
				.pipe(catchError(() => of(emptyHighlights())))
	});
	const highlightsData = keepWhileLoading<HighlightsData>(
		() =>
			highlightsResource.hasValue() ? highlightsResource.value() : null,
		highlightsResource.isLoading,
		username
	);
	const isLoadingHighlightsMonth = computed(
		() => highlightsResource.isLoading() && highlightsData() !== null
	);

	const favoritesResource = rxResource({
		params: () => (visibility().favorites ? openProfileOf() : undefined),
		stream: ({ params: name }) =>
			libraryService
				.getUserFavorites(name, { limit: PROFILE_FAVORITES_LIMIT })
				.pipe(
					map(page =>
						page.items.map((entry): PublicFavorite => ({
							id: entry.id,
							position: entry.position,
							game: entry.game
						}))
					),
					catchError(() => of([] as PublicFavorite[]))
				)
	});
	const favoritesData = computed(() =>
		favoritesResource.hasValue() ? favoritesResource.value() : null
	);

	const favoriteTagsResource = rxResource({
		params: () => (visibility().tags ? openProfileOf() : undefined),
		stream: ({ params: name }) =>
			profileService
				.getFavoriteTags(name)
				.pipe(catchError(() => of([] as PublicFavoriteTag[])))
	});
	const favoriteTags = computed(() =>
		favoriteTagsResource.hasValue() ? favoriteTagsResource.value() : []
	);

	const platinumsResource = rxResource({
		params: () => (visibility().platinums ? openProfileOf() : undefined),
		stream: ({ params: name }) =>
			libraryService
				.getUserPlatinums(name, { limit: PROFILE_PLATINUMS_LIMIT })
				.pipe(catchError(() => of({ items: [], total: 0 })))
	});
	const platinumsData = computed(() =>
		platinumsResource.hasValue() ? platinumsResource.value().items : null
	);
	const platinumsTotal = computed(() =>
		platinumsResource.hasValue() ? platinumsResource.value().total : 0
	);

	const queueResource = rxResource({
		params: () => (visibility().queue ? openProfileOf() : undefined),
		stream: ({ params: name }) =>
			libraryService
				.getUserQueue(name, { limit: UP_NEXT_LIMIT })
				.pipe(catchError(() => of({ items: [], total: 0 })))
	});
	const queueData = computed(() =>
		queueResource.hasValue() ? queueResource.value().items : null
	);

	const sagasResource = rxResource({
		params: () => (visibility().sagas ? openProfileOf() : undefined),
		stream: ({ params: name }) =>
			libraryService
				.getUserFranchises(name)
				.pipe(catchError(() => of([])))
	});
	const sagas = computed(() =>
		sagasResource.hasValue() ? sagasResource.value() : []
	);

	const rewindResource = rxResource({
		params: () => (visibility().rewind ? openProfileOf() : undefined),
		stream: ({ params: name }) =>
			rewindService.getYears(name).pipe(catchError(() => of(null)))
	});
	const rewindYears = computed(() =>
		rewindResource.hasValue() ? rewindResource.value() : null
	);
	const rewindSpotlight = computed(() => {
		const rewinds = rewindYears();
		if (rewinds?.spotlightYear == null) return null;
		return (
			rewinds.years.find(
				summary => summary.year === rewinds.spotlightYear
			) ?? null
		);
	});
	const pastRewinds = computed(() => {
		const spotlightYear = rewindSpotlight()?.year;
		return (rewindYears()?.years ?? []).filter(
			summary => summary.year !== spotlightYear
		);
	});

	const reviewsResource = rxResource({
		params: () => openProfileOf(),
		stream: ({ params: name }) =>
			reviewsService
				.getUserReviews(name, { limit: REVIEWS_SAMPLE_SIZE })
				.pipe(
					catchError(() =>
						of({ reviews: [] as ReviewEntry[], total: 0 })
					)
				)
	});
	const userReviewsTotal = computed(() =>
		reviewsResource.hasValue() ? reviewsResource.value().total : 0
	);
	const latestReviews = computed(() => {
		const reviews = reviewsResource.hasValue()
			? reviewsResource.value().reviews
			: [];
		const written = reviews.filter(review => review.content?.trim());
		const ratedOnly = reviews.filter(review => !review.content?.trim());
		return [...written, ...ratedOnly].slice(0, LATEST_REVIEWS_COUNT);
	});

	const comparisonBy = linkedSignal<string, ComparisonDimension>({
		source: username,
		computation: () => "completed"
	});
	const showComparison = computed(
		() => isLoggedIn() && !isSelf() && !!loadedProfile() && !isPrivate()
	);
	const comparisonResource = rxResource({
		params: () =>
			showComparison()
				? { username: username(), by: comparisonBy() }
				: undefined,
		stream: ({ params }) =>
			libraryService.getComparison(params.username, params.by, {
				limit: COMPARISON_LIMIT
			})
	});
	const comparison = keepWhileLoading(
		() =>
			comparisonResource.hasValue() ? comparisonResource.value() : null,
		comparisonResource.isLoading,
		username
	);
	const comparisonPrivate = computed(
		() => errorStatusOf(comparisonResource.error()) === FORBIDDEN_STATUS
	);

	const removedActivityIds = linkedSignal<string, ReadonlySet<string>>({
		source: username,
		computation: () => new Set()
	});
	const recentActivity = computed(() =>
		(loadedProfile()?.recentActivity ?? []).filter(
			activity => !removedActivityIds().has(activity.id)
		)
	);

	const showActivity = computed(
		() => visibility().feed && recentActivity().length > 0
	);

	const backdropUrl = computed(() =>
		pickProfileBackdrop({
			profile: loadedProfile(),
			favorites: favoritesData(),
			showsFavorites: visibility().favorites
		})
	);

	function changeHighlightsMonth(step: 1 | -1) {
		if (step === 1 && isAtCurrentMonth()) return;
		highlightsMonth.set(shiftMonth(highlightsMonth(), step));
		void router.navigate([], {
			relativeTo: route,
			queryParams: {
				[HIGHLIGHTS_MONTH_PARAM]: isAtCurrentMonth()
					? null
					: formatMonthParam(highlightsMonth())
			},
			queryParamsHandling: "merge",
			replaceUrl: true
		});
	}

	function changeComparison(by: ComparisonDimension) {
		if (by === comparisonBy() && comparison()) return;
		comparisonBy.set(by);
	}

	function toggleFollow() {
		const subject = followSubject();
		if (subject) followActions.toggleFollow(subject);
	}

	function restoreActivity(id: string) {
		removedActivityIds.update(ids => {
			const next = new Set(ids);
			next.delete(id);
			return next;
		});
	}

	function deleteActivity(id: string) {
		if (removedActivityIds().has(id)) return;
		removedActivityIds.update(ids => new Set(ids).add(id));
		toast.pending({
			message: "Activity removed",
			onCommit: () =>
				feedService.deleteActivity(id).subscribe({
					error: failure => {
						if (errorStatusOf(failure) === NOT_FOUND_STATUS) return;
						restoreActivity(id);
						toast.warning("Could not remove the activity.");
					}
				}),
			onUndo: () => restoreActivity(id)
		});
	}

	function refreshPremiumFlag() {
		const name = loadedProfile()?.user.username;
		if (!name) return;
		profileService
			.getProfile(name)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: data =>
					loadedProfile.update(current =>
						current?.user.id === data.user.id
							? {
									...current,
									user: {
										...current.user,
										hasPremium: data.user.hasPremium
									}
								}
							: current
					),
				error: () => undefined
			});
	}

	return {
		username,
		isLoggedIn,
		isLoading,
		notFound,
		loadFailed,
		isPrivate,
		profile,
		isSelf,
		canManagePremium,
		visibility,
		backdropUrl,
		togglingFollow,
		unfollowTarget: followActions.unfollowTarget,
		confirmUnfollow: followActions.confirmUnfollow,
		cancelUnfollow: followActions.cancelUnfollow,
		toggleFollow,
		retry: () => profileResource.reload(),
		queueData,
		favoritesData,
		favoriteTags,
		platinumsData,
		platinumsTotal,
		sagas,
		rewindYears,
		rewindSpotlight,
		pastRewinds,
		reloadRewinds: () => rewindResource.reload(),
		highlightsData,
		highlightsMonth,
		isAtCurrentMonth,
		isLoadingHighlightsMonth,
		changeHighlightsMonth,
		latestReviews,
		userReviewsTotal,
		comparison,
		comparisonBy,
		comparisonLoading: comparisonResource.isLoading,
		comparisonPrivate,
		showComparison,
		changeComparison,
		recentActivity,
		showActivity,
		deleteActivity,
		refreshPremiumFlag
	};
}
