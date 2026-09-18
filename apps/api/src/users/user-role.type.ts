export const USER_ROLES = ["user", "premium", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
