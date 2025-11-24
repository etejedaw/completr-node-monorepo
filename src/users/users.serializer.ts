import { User } from "./user.model";

export function userSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		name: user.name,
		bio: user.bio,
		avatarUrl: user.avatarUrl,
		isPublic: user.isPublic
	};
}
