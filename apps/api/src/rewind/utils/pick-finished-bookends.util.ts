import { type RewindFinishedGame } from "../rewind.interface";

export interface FinishedBookends {
	firstFinished: RewindFinishedGame | null;
	lastFinished: RewindFinishedGame | null;
}

export function pickFinishedBookends(
	finishedGames: RewindFinishedGame[]
): FinishedBookends {
	return {
		firstFinished: finishedGames.at(0) ?? null,
		lastFinished: finishedGames.at(-1) ?? null
	};
}
