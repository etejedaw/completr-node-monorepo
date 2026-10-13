const PLAN_LIMIT_MESSAGES: Record<string, string> = {
	FAVORITE_LIMIT_REACHED:
		"You've reached the free limit for favorites. Remove one to add another.",
	GAME_SHELF_LIMIT_REACHED:
		"You've reached the free limit for My Shelf. Remove a game to add another.",
	LIST_LIMIT_REACHED:
		"You've reached the free limit for lists. Delete one to create another.",
	LIST_FROZEN:
		"This list is frozen because you're over the free limit for lists. Delete some lists to edit it again.",
	LIST_ITEM_FROZEN:
		"This list is frozen because you're over the free limit for lists. Delete some lists to edit it again.",
	MOOD_TAGS_LIMIT_REACHED:
		"You've reached the free limit for tags. Use one of your tags or delete one to create a new one.",
	QUEUE_LIMIT_REACHED:
		"You've reached the free limit for Up Next. Remove a game to queue another.",
	SAVED_FILTER_LIMIT_REACHED:
		"You've reached the free limit for saved views. Delete one to save a new view.",
	SAVED_FILTER_FROZEN:
		"This view is frozen because you're over the free limit for saved views. Delete some views to edit it again.",
	WISHLIST_LIMIT_REACHED:
		"You've reached the free limit for Want to Get. Remove a game to add another."
};

export function planLimitMessage(type: unknown): string | null {
	return typeof type === "string"
		? (PLAN_LIMIT_MESSAGES[type] ?? null)
		: null;
}
