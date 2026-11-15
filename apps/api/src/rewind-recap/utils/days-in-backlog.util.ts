import { type RewindRun } from "../../rewind/rewind-run.interface";
import { daysBetween } from "./days-between.util";
import { toDateOnly } from "./to-date-only.util";

export function daysInBacklog(run: RewindRun): number | null {
	const startedAt = toDateOnly(run.startedAt);
	if (startedAt === null) return null;
	const days = daysBetween(run.createdAt.slice(0, 10), startedAt);
	return days < 0 ? null : days;
}
