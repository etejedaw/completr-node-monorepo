import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareRunsChronologically } from "./compare-runs-chronologically.util";

export function listLatestFinishedRuns(
	finishedRuns: ClosedRewindRun[]
): ClosedRewindRun[] {
	const latestRunByGame = new Map<string, ClosedRewindRun>();
	for (const run of [...finishedRuns].sort(compareRunsChronologically))
		latestRunByGame.set(run.gameId, run);

	return [...latestRunByGame.values()].sort(compareRunsChronologically);
}
