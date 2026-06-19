export type VisibilityLevel = "private" | "friends" | "public";

export interface User {
	id: string;
	username: string;
	email: string;
	role: UserRole;
	name: string;
	bio?: string;
	avatarUrl?: string;
	profileVisibility: VisibilityLevel;
	queueVisibility: VisibilityLevel;
	wishlistVisibility: VisibilityLevel;
	favoriteVisibility: VisibilityLevel;
	feedVisibility: VisibilityLevel;
	backlogVisibility: VisibilityLevel;
	shelfVisibility: VisibilityLevel;
	listVisibility: VisibilityLevel;
	acceptFollowRequests: boolean;
	theme?: string;
	isActive: boolean;
	createdAt: string;
}

export type UserRole = "user" | "premium" | "moderator" | "admin";
