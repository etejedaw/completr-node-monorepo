import { type RewindClosedGame } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

export function toRewindClosedGame(
	run: ClosedRewindRun,
	platinumRunIds: ReadonlySet<string>
): RewindClosedGame {
	return {
		...toRewindFinishedGame(run),
		isPlatinumRun: platinumRunIds.has(run.id)
	};
}
