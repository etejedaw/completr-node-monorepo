import { type VisibilityLevel } from "../../../core/models";

export interface AdminUser {
	id: string;
	username: string;
	email: string;
	name: string;
	role: string;
	isActive: boolean;
	profileVisibility: VisibilityLevel;
	createdAt: string;
}

export interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	name: string;
	bio?: string;
	avatarUrl?: string;
}

export interface EditUserRequest {
	name?: string;
	password?: string;
	role?: string;
	isActive?: boolean;
}
