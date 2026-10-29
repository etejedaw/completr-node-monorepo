import { type RewindYearVisibility } from "../rewind-record.interface";
import { type RewindCalendar, type RewindRun } from "../rewind-run.interface";
import { listRewindYears } from "./list-rewind-years.util";

export function listVisibleRewindYears(
	runs: RewindRun[],
	calendar: RewindCalendar,
	visibility: RewindYearVisibility
): number[] {
	return listRewindYears(runs, calendar).filter(
		year =>
			visibility.includeUngenerated || visibility.generatedYears.has(year)
	);
}
