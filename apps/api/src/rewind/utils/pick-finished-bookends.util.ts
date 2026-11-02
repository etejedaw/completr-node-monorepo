import { type RewindFinishedGame } from "../rewind.interface";
import { type FinishedBookends } from "../rewind-build.interface";

export function pickFinishedBookends(
	finishedGames: RewindFinishedGame[]
): FinishedBookends {
	return {
		firstFinished: finishedGames.at(0) ?? null,
		lastFinished: finishedGames.at(-1) ?? null
	};
}
