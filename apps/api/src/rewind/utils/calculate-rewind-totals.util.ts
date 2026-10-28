import { type RewindTotals } from "../rewind.interface";
import {
	type ClosedRewindRun,
	type RewindGameGenre,
	type RewindYearRuns
} from "../rewind-run.interface";
import { calculateAverageRating } from "./calculate-average-rating.util";
import { calculateFinishRate } from "./calculate-finish-rate.util";
import { countDistinctGames } from "./count-distinct-games.util";
import { countGenresPlayed } from "./count-genres-played.util";
import { countPlatformsPlayed } from "./count-platforms-played.util";
import { sumHoursPlayed } from "./sum-hours-played.util";

export interface RewindTotalsSource {
	yearRuns: RewindYearRuns;
	latestFinishedRuns: ClosedRewindRun[];
	genres: RewindGameGenre[];
	platinums: number | null;
}

export function calculateRewindTotals(
	source: RewindTotalsSource
): RewindTotals {
	const { yearRuns } = source;
	const finished = countDistinctGames(yearRuns.finished);
	const abandoned = countDistinctGames(yearRuns.abandoned);

	return {
		finished,
		abandoned,
		started: countDistinctGames(yearRuns.started),
		hoursPlayed: sumHoursPlayed([
			...yearRuns.finished,
			...yearRuns.abandoned
		]),
		platinums: source.platinums,
		finishRate: calculateFinishRate(finished, abandoned),
		averageRating: calculateAverageRating(yearRuns.finished),
		genresPlayed: countGenresPlayed(
			source.latestFinishedRuns,
			source.genres
		),
		platformsPlayed: countPlatformsPlayed(yearRuns.finished)
	};
}
