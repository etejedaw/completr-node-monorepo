import { REWIND_COVERS_LIMIT } from "../rewind.constants";
import { type RewindGameRef } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareRunsLatestFirst } from "./compare-runs-latest-first.util";

function compareByRatingThenRecency(
	first: ClosedRewindRun,
	second: ClosedRewindRun
): number {
	const ratingGap = (second.userRating ?? -1) - (first.userRating ?? -1);
	return ratingGap || compareRunsLatestFirst(first, second);
}

export function pickCoverGames(
	latestFinishedRuns: ClosedRewindRun[]
): RewindGameRef[] {
	return [...latestFinishedRuns]
		.sort(compareByRatingThenRecency)
		.slice(0, REWIND_COVERS_LIMIT)
		.map(run => ({ ...run.game }));
}
