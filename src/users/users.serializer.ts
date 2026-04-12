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
		isWishlistPublic: user.isWishlistPublic,
		isFavoritePublic: user.isFavoritePublic,
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
