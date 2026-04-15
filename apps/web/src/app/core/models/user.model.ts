export interface User {
	id: string;
	username: string;
	email: string;
	role: UserRole;
	name: string;
	bio?: string;
	avatarUrl?: string;
	isPublic: boolean;
	isWishlistPublic: boolean;
	isFavoritePublic: boolean;
	isFeedPublic: boolean;
	isActive: boolean;
	createdAt: string;
}

export type UserRole = "user" | "premium" | "moderator" | "admin";
