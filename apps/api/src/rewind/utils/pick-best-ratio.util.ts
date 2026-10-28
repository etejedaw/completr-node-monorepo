import { calculateRatio } from "../../common/utils/calculate-ratio.util";
import { type RewindRatioGame } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareRunsLatestFirst } from "./compare-runs-latest-first.util";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

interface RatioCandidate {
	run: ClosedRewindRun;
	personalRatio: number;
}

function toRatioCandidate(run: ClosedRewindRun): RatioCandidate[] {
	if (run.realDuration === null || run.realDuration <= 0) return [];

	const personalRatio = calculateRatio(run.score, run.realDuration);
	return personalRatio === null ? [] : [{ run, personalRatio }];
}

function compareByRatio(first: RatioCandidate, second: RatioCandidate) {
	return (
		second.personalRatio - first.personalRatio ||
		compareRunsLatestFirst(first.run, second.run)
	);
}

export function pickBestRatio(
	finishedRuns: ClosedRewindRun[]
): RewindRatioGame | null {
	const [best] = finishedRuns.flatMap(toRatioCandidate).sort(compareByRatio);
	if (!best) return null;

	return {
		...toRewindFinishedGame(best.run),
		personalRatio: best.personalRatio
	};
}
