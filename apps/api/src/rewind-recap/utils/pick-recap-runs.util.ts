import { type RewindRun } from "../../rewind/rewind-run.interface";
import { REWIND_RECAP_MAX_GAME_ROWS } from "../rewind-recap.constants";
import { compareChronologically } from "./compare-chronologically.util";
import { compareLatestActivityFirst } from "./compare-latest-activity-first.util";
import { isClosedInYear } from "./is-closed-in-year.util";

export function pickRecapRuns(
	activeRuns: RewindRun[],
	year: number
): RewindRun[] {
	const closed = activeRuns.filter(run => isClosedInYear(run, year));
	const others = activeRuns.filter(run => !isClosedInYear(run, year));
	return [
		...closed.sort(compareLatestActivityFirst),
		...others.sort(compareLatestActivityFirst)
	]
		.slice(0, REWIND_RECAP_MAX_GAME_ROWS)
		.sort(compareChronologically);
}
