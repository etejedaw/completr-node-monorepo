import { type UserRole } from "../models/user.model";
import { type RoleBadge } from "./role-badge.model";

type ElevatedRole = Exclude<UserRole, "user">;

const ELEVATED_ROLE_BADGES: Record<ElevatedRole, RoleBadge> = {
	admin: {
		label: "Admin",
		className: "bg-admin-metal text-admin",
		tone: "admin",
		icon: "shield"
	},
	moderator: {
		label: "Mod",
		className: "bg-info/15 text-info",
		tone: "info",
		icon: null
	},
	premium: {
		label: "Premium",
		className: "bg-premium/15 text-premium",
		tone: "premium",
		icon: null
	}
};

function isElevatedRole(role: string): role is ElevatedRole {
	return Object.hasOwn(ELEVATED_ROLE_BADGES, role);
}

export function elevatedRoleBadge(
	role: string | null | undefined,
	hasPremium = false
): RoleBadge | null {
	if (role && isElevatedRole(role)) return ELEVATED_ROLE_BADGES[role];
	return hasPremium ? ELEVATED_ROLE_BADGES.premium : null;
}
