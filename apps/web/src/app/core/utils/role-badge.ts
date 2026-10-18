import { type UserRole } from "../models/user.model";

export interface RoleBadge {
	label: string;
	className: string;
	icon: string | null;
}

const ROLE_BADGES: Record<UserRole, RoleBadge> = {
	admin: {
		label: "Admin",
		className: "bg-admin-metal text-admin",
		icon: "shield"
	},
	moderator: { label: "Mod", className: "bg-info/15 text-info", icon: null },
	premium: {
		label: "Premium",
		className: "bg-premium/15 text-premium",
		icon: null
	},
	user: {
		label: "Free",
		className: "bg-fg-muted/15 text-fg-muted",
		icon: null
	}
};

export function roleBadge(role: string | null | undefined): RoleBadge {
	return ROLE_BADGES[role as UserRole] ?? ROLE_BADGES.user;
}

export function elevatedRoleBadge(
	role: string | null | undefined
): RoleBadge | null {
	return role && role !== "user" && role in ROLE_BADGES
		? ROLE_BADGES[role as UserRole]
		: null;
}
