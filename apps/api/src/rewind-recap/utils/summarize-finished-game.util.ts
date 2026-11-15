import { type RewindFinishedGame } from "../../rewind/rewind.interface";

export function summarizeFinishedGame(game: RewindFinishedGame | null) {
	return game && { title: game.title, finishedAt: game.finishedAt };
}
