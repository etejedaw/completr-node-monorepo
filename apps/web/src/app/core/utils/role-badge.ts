import { type UserRole } from "../models/user.model";
import { type RoleBadge } from "./role-badge.model";

type ElevatedRole = Exclude<UserRole, "user">;

const ELEVATED_ROLE_BADGES: Record<ElevatedRole, RoleBadge> = {
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
	}
};

function isElevatedRole(role: string): role is ElevatedRole {
	return Object.hasOwn(ELEVATED_ROLE_BADGES, role);
}

export function elevatedRoleBadge(
	role: string | null | undefined
): RoleBadge | null {
	return role && isElevatedRole(role) ? ELEVATED_ROLE_BADGES[role] : null;
}
