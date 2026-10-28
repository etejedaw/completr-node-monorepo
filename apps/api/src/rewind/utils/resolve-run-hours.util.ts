import { type RewindRun } from "../rewind-run.interface";

export interface RunHours {
	hours: number;
	isEstimate: boolean;
}

export function resolveRunHours(run: RewindRun): RunHours | null {
	if (run.realDuration !== null && run.realDuration > 0)
		return { hours: run.realDuration, isEstimate: false };
	if (run.duration !== null && run.duration > 0)
		return { hours: run.duration, isEstimate: true };
	return null;
}
