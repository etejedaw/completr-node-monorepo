import { User } from "./user.model";

export function userMeSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		role: user.role,
		name: user.name,
		bio: user.bio,
		avatarUrl: user.avatarUrl,
		isPublic: user.isPublic,
		isQueuePublic: user.isQueuePublic,
		isFavoritePublic: user.isFavoritePublic,
		isFeedPublic: user.isFeedPublic,
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
		isQueuePublic: user.isQueuePublic,
		isFavoritePublic: user.isFavoritePublic,
		isFeedPublic: user.isFeedPublic,
		createdAt: user.createdAt
	};
}
