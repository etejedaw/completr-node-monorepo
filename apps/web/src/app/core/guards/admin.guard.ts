import { roleGuard } from "./role-guard";

export const adminGuard = roleGuard(role => role === "admin");
