import { User } from "./user.model";
import {
	backlogPublicSerializer,
	backlogSerializer
} from "../backlog/backlog.serializer";
import { activitySerializer } from "../activity/activity.serializer";
import { FullUserProfile, RestrictedUserProfile } from "./users.interface";

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
