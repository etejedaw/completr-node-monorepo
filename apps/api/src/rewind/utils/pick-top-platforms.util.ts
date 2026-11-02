import { REWIND_TOP_LIMIT } from "../rewind.constants";
import { type RewindPlatform } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { rankPlatforms } from "./rank-platforms.util";

export function pickTopPlatforms(
	finishedRuns: ClosedRewindRun[]
): RewindPlatform[] {
	return rankPlatforms(finishedRuns).slice(0, REWIND_TOP_LIMIT);
}
