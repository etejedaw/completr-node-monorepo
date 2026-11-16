import { REWIND_RECAP_UP_NEXT_LIMIT } from "../rewind-recap.constants";
import {
	type GameRowLookups,
	type RewindRecapInput
} from "../rewind-recap.interface";
import { assignCoopAliases } from "./assign-coop-aliases.util";
import { buildRewindRecapPatterns } from "./build-rewind-recap-patterns.util";
import { compareChronologically } from "./compare-chronologically.util";
import { groupFranchiseNamesByGame } from "./group-franchise-names-by-game.util";
import { groupGenreNamesByGame } from "./group-genre-names-by-game.util";
import { groupPlatinumsByRun } from "./group-platinums-by-run.util";
import { groupTagsByGame } from "./group-tags-by-game.util";
import { isActiveInYear } from "./is-active-in-year.util";
import { pickRecapRuns } from "./pick-recap-runs.util";
import { recapGameColumns } from "./recap-game-columns.util";
import { summarizeHighlights } from "./summarize-highlights.util";
import { toGameRow } from "./to-game-row.util";
import { toIsoDate } from "./to-iso-date.util";
import { toUpNextGame } from "./to-up-next-game.util";

export function buildRewindRecapContent(
	input: RewindRecapInput,
	today: Date
): string {
	const todayDate = toIsoDate(today);
	const activeRuns = input.runs.filter(run =>
		isActiveInYear(run, input.year, todayDate)
	);
	const recapRuns = pickRecapRuns(activeRuns, input.year);
	const coopAliasesByRun = assignCoopAliases(
		[...activeRuns].sort(compareChronologically),
		input.coopPartners
	);
	const lookups: GameRowLookups = {
		genreNamesByGame: groupGenreNamesByGame(input.genres),
		franchiseNamesByGame: groupFranchiseNamesByGame(input.franchises),
		coopAliasesByRun,
		reviewsByGame: new Map(
			input.reviews.map(review => [review.gameId, review.content])
		),
		tagsByGame: groupTagsByGame(input.tags),
		platinumsByRun: groupPlatinumsByRun(input.platinums)
	};

	return JSON.stringify({
		year: input.year,
		persona: input.rewind.persona,
		totals: input.rewind.totals,
		highlights: summarizeHighlights(input.rewind.highlights),
		previousYear: input.previousYearTotals,
		patterns: buildRewindRecapPatterns(
			activeRuns,
			input.genres,
			input.year,
			input.franchises,
			coopAliasesByRun,
			lookups.tagsByGame,
			lookups.platinumsByRun
		),
		upNext: input.upNext
			.slice(0, REWIND_RECAP_UP_NEXT_LIMIT)
			.map(game => toUpNextGame(game, lookups.tagsByGame, todayDate)),
		games: {
			columns: recapGameColumns(input.includesNotes),
			rows: recapRuns.map(run =>
				toGameRow(run, lookups, input.includesNotes)
			),
			total: activeRuns.length,
			included: recapRuns.length,
			truncated: recapRuns.length < activeRuns.length
		}
	});
}
