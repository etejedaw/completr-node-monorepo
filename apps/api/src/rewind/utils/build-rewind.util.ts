import { type Rewind, type RewindOwner } from "../rewind.interface";
import { type RewindGameGenre, type RewindRun } from "../rewind-run.interface";
import { calculateRewindHighlights } from "./calculate-rewind-highlights.util";
import { calculateRewindTotals } from "./calculate-rewind-totals.util";
import { collectYearRuns } from "./collect-year-runs.util";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";
import { listRewindYears } from "./list-rewind-years.util";
import { resolveSpotlightYear } from "./resolve-spotlight-year.util";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

export interface RewindSource {
	year: number;
	owner: RewindOwner;
	runs: RewindRun[];
	genres: RewindGameGenre[];
	platinums: number | null;
	today: Date;
}

export function buildRewind(source: RewindSource): Rewind {
	const { year, runs, today } = source;
	const yearRuns = collectYearRuns(runs, year);
	const latestFinishedRuns = listLatestFinishedRuns(yearRuns.finished);

	return {
		year,
		user: source.owner,
		isSpotlight: resolveSpotlightYear(today) === year,
		otherYears: listRewindYears(runs, today).filter(
			other => other !== year
		),
		totals: calculateRewindTotals(yearRuns, source.platinums),
		finishedGames: latestFinishedRuns.map(toRewindFinishedGame),
		highlights: calculateRewindHighlights({
			finishedRuns: yearRuns.finished,
			latestFinishedRuns,
			genres: source.genres
		})
	};
}
