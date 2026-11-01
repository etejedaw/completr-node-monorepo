export type VisibilityLevel = "private" | "friends" | "public";

export interface PremiumAccess {
	active: boolean;
	source: "role" | "full-grant" | null;
	expiresAt: string | null;
}

export type PremiumFeature =
	| "lists.unlimited"
	| "saved-filters.unlimited"
	| "favorites.unlimited"
	| "wishlist.unlimited"
	| "queue.unlimited"
	| "game-shelf.unlimited"
	| "mood-tags.unlimited"
	| "activity.feed-filters"
	| "themes.premium"
	| "export.json"
	| "rewind.premium";

export interface User {
	id: string;
	username: string;
	email: string;
	role: UserRole;
	premiumAccess: PremiumAccess;
	premiumFeatures: PremiumFeature[];
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
