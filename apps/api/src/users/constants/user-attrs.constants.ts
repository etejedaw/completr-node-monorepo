export const USER_PUBLIC_ATTRS = [
	"id",
	"username",
	"name",
	"avatarUrl",
	"role"
];

export const USER_CARD_ATTRS = [
	...USER_PUBLIC_ATTRS,
	"profileVisibility",
	"queueVisibility",
	"wishlistVisibility",
	"favoriteVisibility",
	"feedVisibility",
	"backlogVisibility",
	"shelfVisibility",
	"listVisibility",
	"platinumVisibility",
	"franchiseVisibility"
];
