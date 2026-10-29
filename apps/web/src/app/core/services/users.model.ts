import { type UserRole, type VisibilityLevel } from "../models/user.model";

export interface UserResult {
	id: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	profileVisibility: VisibilityLevel;
	role?: UserRole;
	isSelf?: boolean;
	followerCount?: number | null;
	isFollowing?: boolean;
	gamesTotal?: number | null;
	completedTotal?: number | null;
	featuredGame?: { title: string; backgroundUrl: string | null } | null;
}

export interface UsersResponse {
	data: { users: UserResult[] };
}
