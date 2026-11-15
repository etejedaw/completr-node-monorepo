import { type RewindRun } from "../../rewind/rewind-run.interface";
import { resolveRunHours } from "../../rewind/utils/resolve-run-hours.util";
import { LENGTH_BUCKETS } from "../rewind-recap.constants";

export function lengthRangeOf(run: RewindRun): string | null {
	const runHours = resolveRunHours(run);
	if (runHours === null) return null;
	const bucket = LENGTH_BUCKETS.find(
		candidate => runHours.hours < candidate.maxHours
	);
	return bucket?.name ?? null;
}
