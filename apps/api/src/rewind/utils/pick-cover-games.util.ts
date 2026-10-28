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

function withDistinctCoverArt(games: RewindGameRef[]): RewindGameRef[] {
	const seenCoverUrls = new Set<string>();
	return games.filter(game => {
		if (!game.coverUrl) return true;
		if (seenCoverUrls.has(game.coverUrl)) return false;
		seenCoverUrls.add(game.coverUrl);
		return true;
	});
}

function coversFirst(games: RewindGameRef[]): RewindGameRef[] {
	return [
		...games.filter(game => game.coverUrl),
		...games.filter(game => !game.coverUrl)
	];
}

export function pickCoverGames(
	latestFinishedRuns: ClosedRewindRun[]
): RewindGameRef[] {
	const rankedGames = [...latestFinishedRuns]
		.sort(compareByRatingThenRecency)
		.map(run => ({ ...run.game }));
	return coversFirst(withDistinctCoverArt(rankedGames)).slice(
		0,
		REWIND_COVERS_LIMIT
	);
}
