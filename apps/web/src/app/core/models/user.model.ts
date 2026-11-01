export type VisibilityLevel = "private" | "friends" | "public";

export interface PremiumAccess {
	active: boolean;
	source: "role" | "full-grant" | null;
	expiresAt: string | null;
}

export interface User {
	id: string;
	username: string;
	email: string;
	role: UserRole;
	premiumAccess: PremiumAccess;
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
	platinumVisibility: VisibilityLevel;
	franchiseVisibility: VisibilityLevel;
	rewindVisibility: VisibilityLevel;
	acceptFollowRequests: boolean;
	theme?: string;
	isActive: boolean;
	createdAt: string;
}

export type UserRole = "user" | "premium" | "moderator" | "admin";
