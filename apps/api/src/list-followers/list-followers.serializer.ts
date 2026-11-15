import { type ListFollower } from "./list-follower.model";

export function listFollowerUserSerializer(follower: ListFollower) {
	const { id, username, name, avatarUrl, role } = follower.User;
	return { id, username, name, avatarUrl, role };
}
