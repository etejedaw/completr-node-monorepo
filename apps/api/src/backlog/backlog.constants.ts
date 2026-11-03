import { type BacklogStatus } from "./backlog.model";

export const BACKLOG_BULK_ACTIONS = ["update", "delete"] as const;

export const QUEUE_LEAVING_STATUSES: readonly BacklogStatus[] = [
	"playing",
	"completed",
	"abandoned",
	"endless"
];
