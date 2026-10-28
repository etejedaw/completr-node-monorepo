import { type RewindRatedGame } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareRunsLatestFirst } from "./compare-runs-latest-first.util";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

type RatedRun = ClosedRewindRun & { userRating: number };

function isRated(run: ClosedRewindRun): run is RatedRun {
	return run.userRating !== null;
}

function compareByRating(first: RatedRun, second: RatedRun): number {
	return (
		second.userRating - first.userRating ||
		compareRunsLatestFirst(first, second)
	);
}

export function pickTopRated(
	finishedRuns: ClosedRewindRun[]
): RewindRatedGame | null {
	const [best] = finishedRuns.filter(isRated).sort(compareByRating);
	if (!best) return null;

	return { ...toRewindFinishedGame(best), userRating: best.userRating };
}
