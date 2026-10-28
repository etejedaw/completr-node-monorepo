import { type RewindYears, type RewindYearSummary } from "../rewind.interface";
import { type RewindRun } from "../rewind-run.interface";
import { calculateRewindTotals } from "./calculate-rewind-totals.util";
import { collectYearRuns } from "./collect-year-runs.util";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";
import { listRewindYears } from "./list-rewind-years.util";
import { pickCoverGames } from "./pick-cover-games.util";
import { resolveSpotlightYear } from "./resolve-spotlight-year.util";

function summarizeYear(runs: RewindRun[], year: number): RewindYearSummary {
	const yearRuns = collectYearRuns(runs, year);
	const totals = calculateRewindTotals(yearRuns, null);

	return {
		year,
		finishedCount: totals.finished,
		startedCount: totals.started,
		hoursPlayed: totals.hoursPlayed,
		covers: pickCoverGames(listLatestFinishedRuns(yearRuns.finished))
	};
}

export function buildRewindYears(runs: RewindRun[], today: Date): RewindYears {
	const years = listRewindYears(runs, today);
	const spotlightYear = resolveSpotlightYear(today);

	return {
		spotlightYear:
			spotlightYear !== null && years.includes(spotlightYear)
				? spotlightYear
				: null,
		years: years.map(year => summarizeYear(runs, year))
	};
}
