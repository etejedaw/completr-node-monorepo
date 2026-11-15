import { type BacklogStatus } from "./backlog.model";

export const BACKLOG_BULK_ACTIONS = ["update", "delete"] as const;

export const QUEUE_LEAVING_STATUSES: readonly BacklogStatus[] = [
	"playing",
	"completed",
	"abandoned",
	"endless"
];

export const DEFAULT_BACKLOG_PAGE_SIZE = 100;
export const COMPLETIONS_PAGE_SIZE = 20;
export const HIGHLIGHTS_RECENT_LIMIT = 6;
export const RANDOM_PLAYERS_DEFAULT_LIMIT = 10;

export const BACKLOG_GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
export const BACKLOG_PLATFORM_ATTRS = ["id", "name", "abbreviation"];
