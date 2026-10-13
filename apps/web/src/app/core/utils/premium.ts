import { type UserRole } from "../models/user.model";

const PREMIUM_ROLES: readonly UserRole[] = ["premium", "moderator", "admin"];

export function isPremiumRole(role: string | null | undefined): boolean {
	return !!role && PREMIUM_ROLES.includes(role as UserRole);
}
