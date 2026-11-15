import { type RewindRun } from "../../rewind/rewind-run.interface";
import { roundToTenth } from "../../rewind/utils/round-to-tenth.util";

export function ratingVsCritics(run: RewindRun): number | null {
	if (run.userRating === null || run.score === null) return null;
	return roundToTenth(run.userRating - run.score);
}
