import { type RewindDurationGame } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareRunsChronologically } from "./compare-runs-chronologically.util";
import { resolveRunHours, type RunHours } from "./resolve-run-hours.util";
import { roundToTenth } from "./round-to-tenth.util";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

interface DurationCandidate extends RunHours {
	run: ClosedRewindRun;
}

export interface DurationExtremes {
	longest: RewindDurationGame | null;
	fastest: RewindDurationGame | null;
}

function toDurationCandidate(run: ClosedRewindRun): DurationCandidate[] {
	const runHours = resolveRunHours(run);
	return runHours ? [{ run, ...runHours }] : [];
}

function compareLongestFirst(
	first: DurationCandidate,
	second: DurationCandidate
) {
	return (
		second.hours - first.hours ||
		compareRunsChronologically(first.run, second.run)
	);
}

function compareFastestFirst(
	first: DurationCandidate,
	second: DurationCandidate
) {
	return (
		first.hours - second.hours ||
		compareRunsChronologically(first.run, second.run)
	);
}

function toDurationGame(candidate: DurationCandidate): RewindDurationGame {
	return {
		...toRewindFinishedGame(candidate.run),
		hours: roundToTenth(candidate.hours),
		isEstimate: candidate.isEstimate
	};
}

export function pickDurationExtremes(
	finishedRuns: ClosedRewindRun[]
): DurationExtremes {
	const candidates = finishedRuns.flatMap(toDurationCandidate);
	const [longest] = [...candidates].sort(compareLongestFirst);
	const [fastest] = [...candidates].sort(compareFastestFirst);
	if (!longest || !fastest) return { longest: null, fastest: null };

	const isSameGame = fastest.run.gameId === longest.run.gameId;
	return {
		longest: toDurationGame(longest),
		fastest: isSameGame ? null : toDurationGame(fastest)
	};
}
