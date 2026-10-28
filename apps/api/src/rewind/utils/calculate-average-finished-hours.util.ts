import { type ClosedRewindRun } from "../rewind-run.interface";
import { resolveRunHours } from "./resolve-run-hours.util";

export function calculateAverageFinishedHours(
	latestFinishedRuns: ClosedRewindRun[]
): number | null {
	const hours = latestFinishedRuns.flatMap(run => {
		const runHours = resolveRunHours(run);
		return runHours ? [runHours.hours] : [];
	});
	if (hours.length === 0) return null;

	return hours.reduce((sum, value) => sum + value, 0) / hours.length;
}
