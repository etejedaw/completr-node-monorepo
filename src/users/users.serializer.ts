import { User } from "./user.model";

export function userMeSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		role: user.role,
		name: user.name,
		bio: user.bio,
		avatarUrl: user.avatarUrl,
		isPublic: user.isPublic
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
