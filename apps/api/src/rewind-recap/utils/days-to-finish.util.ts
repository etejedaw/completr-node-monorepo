import { type RewindRun } from "../../rewind/rewind-run.interface";
import { daysBetween } from "./days-between.util";
import { toDateOnly } from "./to-date-only.util";

export function daysToFinish(run: RewindRun): number | null {
	const startedAt = toDateOnly(run.startedAt);
	const finishedAt = toDateOnly(run.finishedAt);
	if (startedAt === null || finishedAt === null) return null;
	return daysBetween(startedAt, finishedAt);
}
