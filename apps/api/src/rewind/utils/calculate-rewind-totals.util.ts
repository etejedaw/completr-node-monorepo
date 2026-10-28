import { type RewindTotals } from "../rewind.interface";
import { type RewindYearRuns } from "../rewind-run.interface";
import { countDistinctGames } from "./count-distinct-games.util";
import { sumHoursPlayed } from "./sum-hours-played.util";

export function calculateRewindTotals(
	yearRuns: RewindYearRuns,
	platinums: number | null
): RewindTotals {
	return {
		finished: countDistinctGames(yearRuns.finished),
		abandoned: countDistinctGames(yearRuns.abandoned),
		started: countDistinctGames(yearRuns.started),
		hoursPlayed: sumHoursPlayed([
			...yearRuns.finished,
			...yearRuns.abandoned
		]),
		platinums
	};
}
