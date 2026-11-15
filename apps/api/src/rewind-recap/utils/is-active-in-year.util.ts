import { type RewindRun } from "../../rewind/rewind-run.interface";
import { activityEnd } from "./activity-end.util";
import { activityStart } from "./activity-start.util";

export function isActiveInYear(run: RewindRun, year: number, today: string) {
	const start = activityStart(run);
	const end = activityEnd(run, today);
	if (start === null || end === null) return false;
	return end >= `${year}-01-01` && start <= `${year}-12-31`;
}
