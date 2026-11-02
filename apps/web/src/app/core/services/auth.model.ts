import { type User } from "../models";

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	username: string;
	email: string;
	password: string;
	name: string;
}

export interface PendingInvitation {
	email: string;
	expiresAt: string;
}

export interface AcceptInvitationRequest {
	token: string;
	username: string;
	name: string;
	password: string;
}

export interface AuthResponse {
	data: {
		access_token: string;
		session_id: string;
	};
}

export interface UserResponse {
	data: { user: User };
}

export interface AuthSession {
	id: string;
	deviceInfo: string | null;
	lastUsedAt: string | null;
	createdAt: string;
	expiresAt: string;
}
