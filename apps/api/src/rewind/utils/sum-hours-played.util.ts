import { type RewindRun } from "../rewind-run.interface";
import { roundToTenth } from "./round-to-tenth.util";

export function sumHoursPlayed(closedRuns: RewindRun[]): number {
	const total = closedRuns.reduce(
		(sum, run) => sum + (run.realDuration ?? 0),
		0
	);
	return roundToTenth(total);
}
