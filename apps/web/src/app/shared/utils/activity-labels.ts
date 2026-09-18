const ACTIVITY_LABELS: Record<string, string> = {
	backlog_added: "added to library",
	backlog_not_started: "wants to play",
	backlog_playing: "started playing",
	backlog_completed: "completed",
	backlog_abandoned: "abandoned",
	backlog_endless: "is endlessly playing",
	queue_added: "added to Up Next",
	wishlist_added: "added to Wanted",
	shelf_added: "added to shelf",
	favorite_added: "added to favorites",
	list_created: "created a list",
	list_followed: "followed a list",
	user_followed: "followed a user",
	user_followed_by: "started following you",
	game_reviewed: "reviewed",
	coop_tagged: "is playing co-op with"
};

const ACTIVITY_ICONS: Record<string, string> = {
	backlog_added: "list_alt",
	backlog_not_started: "radio_button_unchecked",
	backlog_playing: "play_arrow",
	backlog_completed: "check_circle",
	backlog_abandoned: "cancel",
	backlog_endless: "all_inclusive",
	queue_added: "playlist_play",
	wishlist_added: "favorite_border",
	shelf_added: "shelves",
	favorite_added: "star",
	list_created: "format_list_bulleted",
	list_followed: "bookmark",
	user_followed: "person_add",
	user_followed_by: "person",
	game_reviewed: "rate_review",
	coop_tagged: "groups"
};

const ACTIVITY_ICON_COLOR_CLASSES: Record<string, string> = {
	backlog_added: "text-brand",
	backlog_not_started: "text-fg-muted",
	backlog_playing: "text-warning",
	backlog_completed: "text-success",
	backlog_abandoned: "text-danger",
	backlog_endless: "text-brand",
	queue_added: "text-brand",
	wishlist_added: "text-danger",
	shelf_added: "text-brand",
	favorite_added: "text-warning",
	list_created: "text-brand",
	list_followed: "text-brand",
	user_followed: "text-brand",
	user_followed_by: "text-brand",
	game_reviewed: "text-success",
	coop_tagged: "text-brand"
};

export function activityLabel(type: string): string {
	return ACTIVITY_LABELS[type] ?? "did something";
}

export function activityIcon(type: string): string {
	return ACTIVITY_ICONS[type] ?? "circle";
}

export function activityIconColorClass(type: string): string {
	return ACTIVITY_ICON_COLOR_CLASSES[type] ?? "text-fg-muted";
}
