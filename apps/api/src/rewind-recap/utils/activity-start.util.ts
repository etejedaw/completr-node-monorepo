import { type RewindRun } from "../../rewind/rewind-run.interface";
import { toDateOnly } from "./to-date-only.util";

export function activityStart(run: RewindRun): string | null {
	return toDateOnly(run.startedAt) ?? toDateOnly(run.finishedAt);
}
