import { type RewindRun } from "../rewind-run.interface";
import { isRewindYearOpen } from "./is-rewind-year-open.util";

const CLOSING_STATUSES = new Set(["completed", "abandoned"]);

function yearOf(date: string) {
	return Number(date.slice(0, 4));
}

function datedYearsOf(run: RewindRun): number[] {
	const years: number[] = [];
	if (run.startedAt) years.push(yearOf(run.startedAt));
	if (run.finishedAt && CLOSING_STATUSES.has(run.status))
		years.push(yearOf(run.finishedAt));
	return years;
}

export function listRewindYears(runs: RewindRun[], today: Date): number[] {
	const years = new Set(runs.flatMap(datedYearsOf));

	return [...years]
		.filter(year => isRewindYearOpen(year, today))
		.sort((first, second) => second - first);
}
