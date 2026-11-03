import { type BacklogEntry, type BacklogStatus } from "../../core/models";

export const STATUS_CHANGEABLE_FROM: ReadonlySet<BacklogStatus> = new Set([
	"not_started",
	"playing",
	"endless"
]);

export function canChangeStatus(entry: Pick<BacklogEntry, "status">): boolean {
	return STATUS_CHANGEABLE_FROM.has(entry.status);
}

export function canRate(entry: Pick<BacklogEntry, "status">): boolean {
	return entry.status !== "not_started";
}

export function canQuickRate(
	entry: Pick<BacklogEntry, "status" | "userRating">
): boolean {
	return canRate(entry) && entry.userRating == null;
}

export function canAddToQueue(
	entry: Pick<BacklogEntry, "id" | "status">,
	queuedIds: ReadonlySet<string>
): boolean {
	return entry.status === "not_started" && !queuedIds.has(entry.id);
}

export function uniqueGameIds(
	entries: readonly { game: { id: string } }[]
): string[] {
	return [...new Set(entries.map(entry => entry.game.id))];
}
