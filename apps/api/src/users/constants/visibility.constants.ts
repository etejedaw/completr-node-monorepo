export const VISIBILITY_LEVELS = ["private", "friends", "public"] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export const VISIBILITY_SECTIONS = [
	"profile",
	"queue",
	"wishlist",
	"favorite",
	"feed",
	"backlog",
	"shelf",
	"list",
	"platinum",
	"franchise"
] as const;
export type VisibilitySection = (typeof VISIBILITY_SECTIONS)[number];
