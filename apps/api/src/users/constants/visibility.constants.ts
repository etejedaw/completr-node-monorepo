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
	"franchise",
	"rewind",
	"tag"
] as const;
export type VisibilitySection = (typeof VISIBILITY_SECTIONS)[number];

export const VISIBILITY_FIELDS = [
	"profileVisibility",
	"queueVisibility",
	"wishlistVisibility",
	"favoriteVisibility",
	"feedVisibility",
	"backlogVisibility",
	"shelfVisibility",
	"listVisibility",
	"platinumVisibility",
	"franchiseVisibility",
	"rewindVisibility",
	"tagVisibility"
] as const;
