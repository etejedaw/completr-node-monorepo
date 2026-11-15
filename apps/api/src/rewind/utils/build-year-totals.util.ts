import { type RewindTotals } from "../rewind.interface";
import { type RewindGameGenre, type RewindRun } from "../rewind-run.interface";
import { calculateRewindTotals } from "./calculate-rewind-totals.util";
import { collectYearRuns } from "./collect-year-runs.util";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";

export function buildYearTotals(
	runs: RewindRun[],
	year: number,
	genres: RewindGameGenre[],
	platinums: number | null
): RewindTotals {
	const yearRuns = collectYearRuns(runs, year);
	return calculateRewindTotals({
		yearRuns,
		latestFinishedRuns: listLatestFinishedRuns(yearRuns.finished),
		genres,
		platinums
	});
}
