import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapRatingHabits } from "../rewind-recap.interface";
import { mostUsedRating } from "./most-used-rating.util";

export function summarizeRatingHabits(runs: RewindRun[]): RecapRatingHabits {
	const ratings = runs.flatMap(run =>
		run.userRating === null ? [] : [run.userRating]
	);
	return {
		rated: ratings.length,
		mostUsedRating: mostUsedRating(ratings),
		fives: ratings.filter(rating => rating === 5).length
	};
}
