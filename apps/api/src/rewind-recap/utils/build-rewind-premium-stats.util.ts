import {
	type RewindBacklogFlowMonth,
	type RewindCriticGap,
	type RewindMonthHours,
	type RewindPremiumStats
} from "../../rewind/rewind.interface";
import { type ClosedRewindRun } from "../../rewind/rewind-run.interface";
import { collectYearRuns } from "../../rewind/utils/collect-year-runs.util";
import { compareText } from "../../rewind/utils/compare-text.util";
import { listLatestFinishedRuns } from "../../rewind/utils/list-latest-finished-runs.util";
import { rankGenres } from "../../rewind/utils/rank-genres.util";
import { resolveRunHours } from "../../rewind/utils/resolve-run-hours.util";
import { roundToTenth } from "../../rewind/utils/round-to-tenth.util";
import { type RewindPremiumStatsInput } from "../rewind-recap.interface";

export const REWIND_TASTE_VS_CRITICS_LIMIT = 8;

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function finishedMonth(run: ClosedRewindRun): number {
	return Number(run.finishedAt.slice(5, 7));
}

function buildHoursByMonth(
	finishedRuns: ClosedRewindRun[]
): RewindMonthHours[] {
	return MONTHS.map(month => {
		const hours = finishedRuns
			.filter(run => finishedMonth(run) === month)
			.reduce((sum, run) => sum + (resolveRunHours(run)?.hours ?? 0), 0);
		return { month, hours: roundToTenth(hours) };
	});
}

function compareByGapSize(first: RewindCriticGap, second: RewindCriticGap) {
	return (
		Math.abs(second.gap) - Math.abs(first.gap) ||
		compareText(first.title, second.title) ||
		compareText(first.gameId, second.gameId)
	);
}

function toCriticGap(run: ClosedRewindRun): RewindCriticGap[] {
	if (run.userRating === null || run.score === null) return [];
	return [
		{
			...run.game,
			userRating: run.userRating,
			criticScore: run.score,
			gap: roundToTenth(run.userRating - run.score)
		}
	];
}

function buildTasteVsCritics(
	latestFinishedRuns: ClosedRewindRun[]
): RewindCriticGap[] {
	return latestFinishedRuns
		.flatMap(toCriticGap)
		.sort(compareByGapSize)
		.slice(0, REWIND_TASTE_VS_CRITICS_LIMIT);
}

function buildBacklogFlow(
	finishedRuns: ClosedRewindRun[],
	addedByMonth: number[]
): RewindBacklogFlowMonth[] {
	return MONTHS.map(month => ({
		month,
		added: addedByMonth[month - 1] ?? 0,
		finished: finishedRuns.filter(run => finishedMonth(run) === month)
			.length
	}));
}

export function buildRewindPremiumStats(
	input: RewindPremiumStatsInput
): RewindPremiumStats {
	const { finished } = collectYearRuns(input.runs, input.year);
	const latestFinishedRuns = listLatestFinishedRuns(finished);

	return {
		hoursByMonth: buildHoursByMonth(finished),
		tasteVsCritics: buildTasteVsCritics(latestFinishedRuns),
		backlogFlow: buildBacklogFlow(finished, input.addedByMonth),
		genreShare: rankGenres(latestFinishedRuns, input.genres)
	};
}
