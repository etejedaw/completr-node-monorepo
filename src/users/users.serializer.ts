import { User } from "./user.model";
import {
	backlogPublicSerializer,
	backlogSerializer
} from "../backlog/backlog.serializer";
import { activitySerializer } from "../activity/activity.serializer";
import { listSummarySerializer } from "../lists/lists.serializer";
import { userReviewSerializer } from "../reviews/reviews.serializer";
import {
	EnrichedUserList,
	FullUserProfile,
	RestrictedUserProfile,
	UserCompletionsBundle,
	UserHighlightsBundle,
	UserReviewsBundle
} from "./users.interface";

export function userMeSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		role: user.role,
		name: user.name,
		bio: user.bio,
		avatarUrl: user.avatarUrl,
		profileVisibility: user.profileVisibility,
		queueVisibility: user.queueVisibility,
		wishlistVisibility: user.wishlistVisibility,
		favoriteVisibility: user.favoriteVisibility,
		feedVisibility: user.feedVisibility,
		backlogVisibility: user.backlogVisibility,
		shelfVisibility: user.shelfVisibility,
		listVisibility: user.listVisibility,
		acceptFollowRequests: user.acceptFollowRequests,
		theme: user.theme,
		createdAt: user.createdAt
	};
}

export function userPublicSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		name: user.name,
		bio: user.bio,
		avatarUrl: user.avatarUrl
	};
}

export function userProfileSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		role: user.role,
		name: user.name,
		bio: user.bio,
		avatarUrl: user.avatarUrl,
		profileVisibility: user.profileVisibility,
		queueVisibility: user.queueVisibility,
		wishlistVisibility: user.wishlistVisibility,
		favoriteVisibility: user.favoriteVisibility,
		feedVisibility: user.feedVisibility,
		backlogVisibility: user.backlogVisibility,
		shelfVisibility: user.shelfVisibility,
		listVisibility: user.listVisibility,
		createdAt: user.createdAt
	};
}

export function userAdminSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		name: user.name,
		role: user.role,
		isActive: user.isActive,
		profileVisibility: user.profileVisibility,
		createdAt: user.createdAt
	};
}

export function restrictedProfileSerializer(profile: RestrictedUserProfile) {
	const { user } = profile;
	return {
		user: userPublicSerializer(user.get({ plain: true })),
		isPrivate: true,
		profileVisibility: user.profileVisibility,
		acceptFollowRequests: user.acceptFollowRequests,
		followerCount: profile.followerCount,
		followingCount: profile.followingCount,
		isFollowing: profile.isFollowing,
		hasPendingRequest: profile.hasPendingRequest
	};
}

export function fullProfileSerializer(profile: FullUserProfile) {
	const { user, isSelf } = profile;
	const serializeBacklogEntry = isSelf
		? backlogSerializer
		: backlogPublicSerializer;
	return {
		user: userProfileSerializer(user.get({ plain: true })),
		followerCount: profile.followerCount,
		followingCount: profile.followingCount,
		isFollowing: profile.isFollowing,
		backlogs: profile.backlogs.map(b => serializeBacklogEntry(b)),
		backlogTotal: profile.backlogTotal,
		backlogStats: profile.backlogStats,
		listsTotal: profile.listsTotal,
		recentActivity: profile.recentActivity.map(activitySerializer)
	};
}

export function userSummarySerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		name: user.name,
		avatarUrl: user.avatarUrl,
		profileVisibility: user.profileVisibility
	};
}

export function enrichedUserListSerializer(entry: EnrichedUserList) {
	return {
		...listSummarySerializer(entry.list),
		followerCount: entry.followerCount,
		progress: entry.progress
	};
}

export function userHighlightsSerializer(bundle: UserHighlightsBundle) {
	const { isSelf, highlights } = bundle;
	const serialize = (entry: (typeof highlights.recent)[number] | null) => {
		if (!entry) return null;
		const plain = entry.get({ plain: true });
		return isSelf
			? backlogSerializer(plain)
			: backlogPublicSerializer(plain);
	};

	return {
		highlights: {
			recent: highlights.recent.map(e => serialize(e)!),
			month: {
				startsAt: highlights.month.startsAt,
				endsAt: highlights.month.endsAt,
				completedCount: highlights.month.completedCount,
				mostPlayed: serialize(highlights.month.mostPlayed),
				highestRated: serialize(highlights.month.highestRated)
			}
		}
	};
}

export function userCompletionsSerializer(bundle: UserCompletionsBundle) {
	const { isSelf, rows, reviewMap, total } = bundle;
	return {
		completions: rows.map(r => {
			const review = r.Game ? (reviewMap.get(r.Game.id) ?? null) : null;
			return isSelf
				? backlogSerializer(r, review)
				: backlogPublicSerializer(r, review);
		}),
		total
	};
}

export function userReviewsSerializer(bundle: UserReviewsBundle) {
	const { user, reviewsPlain, durationMap, total } = bundle;
	return {
		reviews: reviewsPlain.map(r =>
			userReviewSerializer(
				r,
				r.Game
					? (durationMap.get(`${user.id}:${r.Game.id}`) ?? null)
					: null
			)
		),
		total
	};
}
