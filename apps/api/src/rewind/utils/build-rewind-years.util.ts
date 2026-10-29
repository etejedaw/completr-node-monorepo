import { type RewindYears, type RewindYearSummary } from "../rewind.interface";
import { type RewindYearsSource } from "../rewind-build.interface";
import { calculateRewindTotals } from "./calculate-rewind-totals.util";
import { collectYearRuns } from "./collect-year-runs.util";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";
import { listVisibleRewindYears } from "./list-visible-rewind-years.util";
import { pickCoverGames } from "./pick-cover-games.util";
import { pickYearPersona } from "./pick-year-persona.util";
import { resolveSpotlightYear } from "./resolve-spotlight-year.util";

function summarizeYear(
	source: RewindYearsSource,
	year: number
): RewindYearSummary {
	const yearRuns = collectYearRuns(source.runs, year);
	const latestFinishedRuns = listLatestFinishedRuns(yearRuns.finished);
	const totals = calculateRewindTotals({
		yearRuns,
		latestFinishedRuns,
		genres: source.genres,
		platinums: source.platinumsByYear.get(year) ?? null
	});

	return {
		year,
		isGenerated: source.visibility.generatedYears.has(year),
		persona: pickYearPersona(totals, latestFinishedRuns),
		finishedCount: totals.finished,
		startedCount: totals.started,
		hoursPlayed: totals.hoursPlayed,
		covers: pickCoverGames(latestFinishedRuns)
	};
}

export function buildRewindYears(source: RewindYearsSource): RewindYears {
	const years = listVisibleRewindYears(
		source.runs,
		source.calendar,
		source.visibility
	);
	const spotlightYear = resolveSpotlightYear(source.calendar.today);

	return {
		spotlightYear:
			spotlightYear !== null && years.includes(spotlightYear)
				? spotlightYear
				: null,
		years: years.map(year => summarizeYear(source, year))
	};
}
