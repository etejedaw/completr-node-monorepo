import { REWIND_CLASSIC_MIN_AGE_YEARS } from "../rewind.constants";
import { type RewindClassicGame } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { type ReleasedRun } from "../rewind-run.types";
import { compareText } from "./compare-text.util";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

function isClassicFor(rewindYear: number) {
	return (run: ClosedRewindRun): run is ReleasedRun =>
		run.releaseYear !== null &&
		rewindYear - run.releaseYear >= REWIND_CLASSIC_MIN_AGE_YEARS;
}

function compareOldestRelease(first: ReleasedRun, second: ReleasedRun) {
	return (
		first.releaseYear - second.releaseYear ||
		compareText(first.finishedAt, second.finishedAt) ||
		compareText(first.gameId, second.gameId)
	);
}

export function pickClassicGame(
	latestFinishedRuns: ClosedRewindRun[],
	rewindYear: number
): RewindClassicGame | null {
	const [oldest] = latestFinishedRuns
		.filter(isClassicFor(rewindYear))
		.sort(compareOldestRelease);
	if (!oldest) return null;

	return { ...toRewindFinishedGame(oldest), releaseYear: oldest.releaseYear };
}
