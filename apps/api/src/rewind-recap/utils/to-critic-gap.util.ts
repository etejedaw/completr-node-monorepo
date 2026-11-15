import { type RewindCriticGap } from "../../rewind/rewind.interface";
import { type ClosedRewindRun } from "../../rewind/rewind-run.interface";
import { roundToTenth } from "../../rewind/utils/round-to-tenth.util";

export function toCriticGap(run: ClosedRewindRun): RewindCriticGap[] {
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
