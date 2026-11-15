import { type RewindRun } from "../../rewind/rewind-run.interface";
import { lengthRangeOf } from "./length-range-of.util";

export function lengthBucketOf(run: RewindRun): string[] {
	const range = lengthRangeOf(run);
	return range === null ? [] : [range];
}
