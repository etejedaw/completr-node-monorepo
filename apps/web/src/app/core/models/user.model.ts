export interface User {
	id: string;
	username: string;
	email: string;
	role: UserRole;
	name: string;
	bio?: string;
	avatarUrl?: string;
	isPublic: boolean;
	isQueuePublic: boolean;
	isWishlistPublic: boolean;
	isFavoritePublic: boolean;
	isFeedPublic: boolean;
	isBacklogPublic: boolean;
	isShelfPublic: boolean;
	isListPublic: boolean;
	theme?: string;
	isActive: boolean;
	createdAt: string;
}

export type UserRole = "user" | "premium" | "moderator" | "admin";
