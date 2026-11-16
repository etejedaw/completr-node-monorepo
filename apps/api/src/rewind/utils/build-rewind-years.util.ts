import {
	type RewindView,
	type RewindYears,
	type RewindYearSummary
} from "../rewind.interface";
import { type RewindYearsSource } from "../rewind-build.interface";
import { calculateRewindTotals } from "./calculate-rewind-totals.util";
import { collectYearRuns } from "./collect-year-runs.util";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";
import { listVisibleRewindYears } from "./list-visible-rewind-years.util";
import { pickCoverGames } from "./pick-cover-games.util";
import { pickVisiblePersona } from "./pick-visible-persona.util";
import { pickYearPersona } from "./pick-year-persona.util";
import { resolveFirstGenerationAiBudget } from "./resolve-first-generation-ai-budget.util";
import { resolveRewindGenerationBlocker } from "./resolve-rewind-generation-blocker.util";
import { resolveRewindPeriod } from "./resolve-rewind-period.util";
import { resolveSpotlightYear } from "./resolve-spotlight-year.util";

function summarizeFrozenYear(
	view: RewindView,
	platinumsVisible: boolean
): RewindYearSummary {
	return {
		year: view.year,
		isGenerated: true,
		generationBlockedBy: null,
		canWriteAiRecap: false,
		persona: pickVisiblePersona(view, platinumsVisible),
		finishedCount: view.totals.finished,
		startedCount: view.totals.started,
		hoursPlayed: view.totals.hoursPlayed,
		covers: view.covers
	};
}

function canFirstGenerationWriteAiRecap(
	source: RewindYearsSource,
	year: number,
	isGenerated: boolean
): boolean {
	if (!source.generationAccess || isGenerated) return false;
	return (
		resolveFirstGenerationAiBudget(
			year,
			source.calendar,
			source.generationAccess.accessKind
		).spend !== null
	);
}

function summarizeYear(
	source: RewindYearsSource,
	year: number
): RewindYearSummary {
	const frozenView = source.frozenViews.get(year);
	if (frozenView)
		return summarizeFrozenYear(frozenView, source.platinumsVisible);

	const isGenerated = source.visibility.generatedYears.has(year);
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
		isGenerated,
		generationBlockedBy:
			source.generationAccess && !isGenerated
				? resolveRewindGenerationBlocker(
						year,
						source.calendar,
						source.generationAccess.accessKind
					)
				: null,
		canWriteAiRecap: canFirstGenerationWriteAiRecap(
			source,
			year,
			isGenerated
		),
		persona: pickYearPersona(totals, latestFinishedRuns),
		finishedCount: totals.finished,
		startedCount: totals.started,
		hoursPlayed: totals.hoursPlayed,
		covers: pickCoverGames(latestFinishedRuns)
	};
}

export function buildRewindYears(
	source: RewindYearsSource
): Omit<RewindYears, "premiumAccess"> {
	const years = listVisibleRewindYears(
		source.runs,
		source.calendar,
		source.visibility
	);
	const spotlightYear = resolveSpotlightYear(source.calendar);

	return {
		period: resolveRewindPeriod(source.calendar),
		spotlightYear:
			spotlightYear !== null && years.includes(spotlightYear)
				? spotlightYear
				: null,
		years: years.map(year => summarizeYear(source, year))
	};
}
