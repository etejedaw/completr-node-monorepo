import { type RewindYearVisibility } from "../rewind-record.interface";
import { type RewindCalendar, type RewindRun } from "../rewind-run.interface";
import { listRewindYears } from "./list-rewind-years.util";

function listListedFrozenYears(visibility: RewindYearVisibility): number[] {
	return [...visibility.frozenYearListing]
		.filter(([, isListed]) => isListed)
		.map(([year]) => year);
}

export function listVisibleRewindYears(
	runs: RewindRun[],
	calendar: RewindCalendar,
	visibility: RewindYearVisibility
): number[] {
	const liveYears = listRewindYears(runs, calendar).filter(
		year =>
			!visibility.frozenYearListing.has(year) &&
			(visibility.includeUngenerated ||
				visibility.generatedYears.has(year))
	);
	return [...liveYears, ...listListedFrozenYears(visibility)].sort(
		(first, second) => second - first
	);
}
