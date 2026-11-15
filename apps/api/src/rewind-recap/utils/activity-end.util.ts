import { type RewindRun } from "../../rewind/rewind-run.interface";
import { toDateOnly } from "./to-date-only.util";

const STILL_RUNNING_STATUSES = new Set(["playing", "endless"]);

export function activityEnd(run: RewindRun, today: string): string | null {
	const finishedAt = toDateOnly(run.finishedAt);
	if (finishedAt !== null) return finishedAt;
	if (STILL_RUNNING_STATUSES.has(run.status)) return today;
	return toDateOnly(run.startedAt);
}
