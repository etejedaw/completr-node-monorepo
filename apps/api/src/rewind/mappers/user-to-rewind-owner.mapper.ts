import { type User } from "../../users/user.model";
import { type RewindOwner } from "../rewind.interface";

export function userToRewindOwner(user: User): RewindOwner {
	return {
		username: user.username,
		name: user.name,
		avatarUrl: user.avatarUrl ?? null,
		role: user.role
	};
}
