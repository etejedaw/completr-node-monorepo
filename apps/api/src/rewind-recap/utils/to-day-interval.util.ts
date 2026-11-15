import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapDayInterval } from "../rewind-recap.interface";
import { dayNumber } from "./day-number.util";
import { toDateOnly } from "./to-date-only.util";

export function toDayInterval(run: RewindRun): RecapDayInterval[] {
	const startedAt = toDateOnly(run.startedAt);
	const finishedAt = toDateOnly(run.finishedAt);
	if (startedAt === null || finishedAt === null) return [];
	const start = dayNumber(startedAt);
	const end = Math.max(dayNumber(finishedAt), start + 1);
	return [{ runId: run.id, start, end }];
}
