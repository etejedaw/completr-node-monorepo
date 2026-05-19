const ACTIVITY_LABELS: Record<string, string> = {
	backlog_added: "added to backlog",
	backlog_not_started: "wants to play",
	backlog_playing: "started playing",
	backlog_completed: "completed",
	backlog_abandoned: "abandoned",
	wishlist_added: "added to wishlist",
	shelf_added: "added to shelf",
	favorite_added: "added to favorites",
	list_created: "created a list",
	list_followed: "followed a list",
	user_followed: "followed a user",
	user_followed_by: "started following you",
	game_reviewed: "reviewed"
};

const ACTIVITY_ICONS: Record<string, string> = {
	backlog_added: "list_alt",
	backlog_not_started: "radio_button_unchecked",
	backlog_playing: "play_arrow",
	backlog_completed: "check_circle",
	backlog_abandoned: "cancel",
	wishlist_added: "favorite",
	shelf_added: "shelves",
	favorite_added: "star",
	list_created: "format_list_bulleted",
	list_followed: "bookmark",
	user_followed: "person_add",
	user_followed_by: "person",
	game_reviewed: "rate_review"
};

const ACTIVITY_DOT_CLASSES: Record<string, string> = {
	backlog_added: "bg-brand-subtle text-brand",
	backlog_not_started: "bg-fg-muted/10 text-fg-muted",
	backlog_playing: "bg-warning/10 text-warning",
	backlog_completed: "bg-success/10 text-success",
	backlog_abandoned: "bg-danger/10 text-danger",
	wishlist_added: "bg-danger/10 text-danger",
	shelf_added: "bg-brand-subtle text-brand",
	favorite_added: "bg-warning/10 text-warning",
	list_created: "bg-brand-subtle text-brand",
	list_followed: "bg-brand-subtle text-brand",
	user_followed: "bg-brand-subtle text-brand",
	user_followed_by: "bg-brand-subtle text-brand",
	game_reviewed: "bg-success/10 text-success"
};

export function activityLabel(type: string): string {
	return ACTIVITY_LABELS[type] ?? "did something";
}

export function activityIcon(type: string): string {
	return ACTIVITY_ICONS[type] ?? "circle";
}

export function activityDotClass(type: string): string {
	return ACTIVITY_DOT_CLASSES[type] ?? "bg-surface text-fg-muted";
}
