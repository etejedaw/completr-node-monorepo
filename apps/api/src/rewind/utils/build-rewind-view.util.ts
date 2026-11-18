import { type RewindView } from "../rewind.interface";
import { type RewindViewSource } from "../rewind-freeze.interface";
import { buildRewind } from "./build-rewind.util";
import { buildRewindViewGames } from "./build-rewind-view-games.util";
import { buildYearTotals } from "./build-year-totals.util";
import { collectPlatinumRunIds } from "./collect-platinum-run-ids.util";
import { collectYearRuns } from "./collect-year-runs.util";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";
import { listRewindYears } from "./list-rewind-years.util";
import { pickCoverGames } from "./pick-cover-games.util";
import { pickYearPersona } from "./pick-year-persona.util";
import { toRewindStoredView } from "./to-rewind-stored-view.util";

export function buildRewindView(source: RewindViewSource): RewindView | null {
	const { record, runs, genres, calendar } = source;
	const { year } = record;
	const years = listRewindYears(runs, calendar);
	if (source.requireListedYear && !years.includes(year)) return null;

	const rewind = buildRewind({
		year,
		owner: source.owner,
		runs,
		genres,
		platinums: source.platinumGames.length,
		platinumRunIds: collectPlatinumRunIds(source.platinumGames),
		calendar,
		visibility: source.visibility,
		stored: toRewindStoredView(record, null)
	});
	const yearRuns = collectYearRuns(runs, year);
	const latestFinishedRuns = listLatestFinishedRuns(yearRuns.finished);

	return {
		year,
		persona: rewind.persona,
		user: rewind.user,
		isSpotlight: rewind.isSpotlight,
		otherYears: rewind.otherYears,
		totals: rewind.totals,
		finishedGames: buildRewindViewGames(yearRuns.finished, genres),
		abandonedGames: buildRewindViewGames(yearRuns.abandoned, genres),
		platinumGames: source.platinumGames,
		personaWithoutPlatinums: pickYearPersona(
			{ ...rewind.totals, platinums: null },
			latestFinishedRuns
		),
		covers: pickCoverGames(latestFinishedRuns),
		highlights: rewind.highlights,
		yearMix: rewind.yearMix,
		language: rewind.language,
		generatedAt: rewind.generatedAt,
		design: source.design,
		frozenAt: source.frozenAt,
		aiRecap: rewind.aiRecap,
		premiumStats: rewind.premiumStats,
		premiumAccessKind: rewind.premiumAccessKind,
		previousYearTotals: years.includes(year - 1)
			? buildYearTotals(
					runs,
					year - 1,
					genres,
					source.previousYearPlatinums
				)
			: null,
		options: {
			includesPrivateRuns: record.includesPrivateRuns,
			includesNotes: record.includesNotes
		}
	};
}
