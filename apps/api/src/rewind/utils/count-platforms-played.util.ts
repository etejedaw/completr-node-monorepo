import { type ClosedRewindRun } from "../rewind-run.interface";
import { rankPlatforms } from "./rank-platforms.util";

export function countPlatformsPlayed(finishedRuns: ClosedRewindRun[]): number {
	return rankPlatforms(finishedRuns).length;
}
