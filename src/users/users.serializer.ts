import { User } from "./user.model";

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
