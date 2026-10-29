import { REWIND_LENGTH_RANGES } from "../rewind.constants";
import { type RewindLengthBucket } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { resolveLengthRange } from "./resolve-length-range.util";

export function countLengthMix(
	latestFinishedRuns: ClosedRewindRun[]
): RewindLengthBucket[] {
	const ranges = latestFinishedRuns.map(resolveLengthRange);
	return REWIND_LENGTH_RANGES.map(range => ({
		range,
		count: ranges.filter(candidate => candidate === range).length
	}));
}
