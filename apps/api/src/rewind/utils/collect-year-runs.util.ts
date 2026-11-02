import {
	type ClosedRewindRun,
	type RewindRun,
	type RewindYearRuns
} from "../rewind-run.interface";

function isInYear(date: string | null, year: number): date is string {
	return date !== null && Number(date.slice(0, 4)) === year;
}

function isClosedInYear(run: RewindRun, year: number): run is ClosedRewindRun {
	return isInYear(run.finishedAt, year);
}

export function collectYearRuns(
	runs: RewindRun[],
	year: number
): RewindYearRuns {
	const closed = runs.filter(run => isClosedInYear(run, year));

	return {
		finished: closed.filter(run => run.status === "completed"),
		abandoned: closed.filter(run => run.status === "abandoned"),
		started: runs.filter(run => isInYear(run.startedAt, year))
	};
}
