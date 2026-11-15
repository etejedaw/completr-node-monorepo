import { type RewindRun } from "../../rewind/rewind-run.interface";
import { resolveRunHours } from "../../rewind/utils/resolve-run-hours.util";
import { type RecapGroupStats } from "../rewind-recap.interface";
import { averageOf } from "./average-of.util";
import { ratingVsCritics } from "./rating-vs-critics.util";
import { titlesWithStatus } from "./titles-with-status.util";

export function summarizeGroup(
	name: string,
	runs: RewindRun[]
): RecapGroupStats {
	const ratings = runs.flatMap(run =>
		run.userRating === null ? [] : [run.userRating]
	);
	const gaps = runs.flatMap(run => {
		const gap = ratingVsCritics(run);
		return gap === null ? [] : [gap];
	});
	const hours = runs.flatMap(run => {
		const runHours = resolveRunHours(run);
		return runHours === null ? [] : [runHours.hours];
	});
	return {
		name,
		games: runs.length,
		finished: runs.filter(run => run.status === "completed").length,
		abandoned: runs.filter(run => run.status === "abandoned").length,
		averageRating: averageOf(ratings),
		averageRatingVsCritics: averageOf(gaps),
		averageHours: averageOf(hours),
		finishedTitles: titlesWithStatus(runs, "completed"),
		abandonedTitles: titlesWithStatus(runs, "abandoned")
	};
}
