import { type BacklogStatus, type UserRole } from "../../../../core/models";

export interface FriendActivity {
	username: string;
	name: string;
	avatarUrl: string | null;
	role: UserRole;
	hasPremium?: boolean;
	status: BacklogStatus;
	finishedAt: string | null;
	userRating: number | null;
}

export interface OtherPlayer {
	username: string;
	name: string;
	avatarUrl: string | null;
	role: UserRole;
	hasPremium?: boolean;
	status: BacklogStatus;
}
