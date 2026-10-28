import { type RewindFinishedGame } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";

export function toRewindFinishedGame(run: ClosedRewindRun): RewindFinishedGame {
	return {
		...run.game,
		finishedAt: run.finishedAt,
		platformAbbreviation: run.platform?.abbreviation ?? null
	};
}
