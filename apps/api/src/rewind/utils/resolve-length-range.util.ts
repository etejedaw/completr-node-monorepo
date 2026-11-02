import {
	REWIND_LENGTH_RANGE_MAX_HOURS,
	REWIND_LENGTH_RANGES,
	type RewindLengthRange
} from "../rewind.constants";
import { type RewindRun } from "../rewind-run.interface";
import { resolveRunHours } from "./resolve-run-hours.util";

export function resolveLengthRange(run: RewindRun): RewindLengthRange | null {
	const runHours = resolveRunHours(run);
	if (runHours === null) return null;
	return (
		REWIND_LENGTH_RANGES.find(
			range => runHours.hours < REWIND_LENGTH_RANGE_MAX_HOURS[range]
		) ?? null
	);
}
