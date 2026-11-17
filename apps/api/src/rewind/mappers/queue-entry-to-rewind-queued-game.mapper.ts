import { type Queue } from "../../queue/queue.model";
import { type RewindQueuedGame } from "../../rewind-recap/rewind-recap.interface";

function toHoursOrNull(value: number | null | undefined): number | null {
	return value === null || value === undefined ? null : Number(value);
}

export function queueEntryToRewindQueuedGame(
	entry: Queue,
	genreNamesByGame: Map<string, string[]>
): RewindQueuedGame {
	const run = entry.Backlog;
	return {
		gameId: run.gameId,
		title: run.Game.title,
		genres: genreNamesByGame.get(run.gameId) ?? [],
		realDuration: toHoursOrNull(run.realDuration),
		duration: toHoursOrNull(run.duration),
		addedAt: run.createdAt.toISOString().slice(0, 10),
		queuedAt: entry.createdAt.toISOString().slice(0, 10)
	};
}
