export const USER_PUBLIC_ATTRS = ["id", "username", "name", "avatarUrl"];

export const USER_CARD_ATTRS = [
	...USER_PUBLIC_ATTRS,
	"role",
	"profileVisibility",
	"queueVisibility",
	"wishlistVisibility",
	"favoriteVisibility",
	"feedVisibility",
	"backlogVisibility",
	"shelfVisibility",
	"listVisibility"
];
