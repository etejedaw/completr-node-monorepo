import { roleGuard } from "./role-guard";

export const moderatorGuard = roleGuard(
	role => role === "moderator" || role === "admin"
);
