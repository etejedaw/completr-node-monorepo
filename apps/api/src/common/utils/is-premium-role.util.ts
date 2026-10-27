const PREMIUM_ROLES = new Set(["premium", "moderator", "admin"]);

export function isPremiumRole(role: string) {
	return PREMIUM_ROLES.has(role);
}
