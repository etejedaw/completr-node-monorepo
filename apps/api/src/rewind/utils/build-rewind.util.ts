import { type Rewind } from "../rewind.interface";
import { type RewindSource } from "../rewind-build.interface";
import { calculateRewindHighlights } from "./calculate-rewind-highlights.util";
import { calculateRewindTotals } from "./calculate-rewind-totals.util";
import { collectYearRuns } from "./collect-year-runs.util";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";
import { listVisibleRewindYears } from "./list-visible-rewind-years.util";
import { pickYearPersona } from "./pick-year-persona.util";
import { resolveSpotlightYear } from "./resolve-spotlight-year.util";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

export function buildRewind(source: RewindSource): Rewind {
	const { year, runs, genres, calendar } = source;
	const yearRuns = collectYearRuns(runs, year);
	const latestFinishedRuns = listLatestFinishedRuns(yearRuns.finished);
	const finishedGames = latestFinishedRuns.map(toRewindFinishedGame);
	const totals = calculateRewindTotals({
		yearRuns,
		latestFinishedRuns,
		genres,
		platinums: source.platinums
	});

	return {
		year,
		persona: pickYearPersona(totals, latestFinishedRuns),
		user: source.owner,
		isSpotlight: resolveSpotlightYear(calendar.today) === year,
		otherYears: listVisibleRewindYears(
			runs,
			calendar,
			source.visibility
		).filter(other => other !== year),
		totals,
		finishedGames,
		highlights: calculateRewindHighlights({
			finishedRuns: yearRuns.finished,
			latestFinishedRuns,
			finishedGames,
			genres
		}),
		...source.stored
	};
}
