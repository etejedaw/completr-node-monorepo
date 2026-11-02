import { type ClosedRewindRun } from "../rewind-run.interface";
import { roundToTenth } from "./round-to-tenth.util";

export function calculateAverageRating(
	finishedRuns: ClosedRewindRun[]
): number | null {
	const ratings = finishedRuns.flatMap(run =>
		run.userRating === null ? [] : [run.userRating]
	);
	if (ratings.length === 0) return null;

	const total = ratings.reduce((sum, rating) => sum + rating, 0);
	return roundToTenth(total / ratings.length);
}
