import { type UserRole } from "../models/user.model";

export type AvatarRing = "premium" | "admin" | null;

const PREMIUM_ROLES: readonly UserRole[] = ["premium", "moderator", "admin"];

export function isPremiumRole(role: string | null | undefined): boolean {
	return !!role && PREMIUM_ROLES.includes(role as UserRole);
}

export function avatarRing(role: string | null | undefined): AvatarRing {
	if (role === "admin") return "admin";
	return isPremiumRole(role) ? "premium" : null;
}
