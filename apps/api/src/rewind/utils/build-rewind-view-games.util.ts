import { type RewindViewGame } from "../rewind.interface";
import {
	type ClosedRewindRun,
	type RewindGameGenre
} from "../rewind-run.interface";
import { listLatestFinishedRuns } from "./list-latest-finished-runs.util";
import { toRewindFinishedGame } from "./to-rewind-finished-game.util";

function groupGenreNamesByGame(
	genres: RewindGameGenre[]
): Map<string, string[]> {
	const namesByGame = new Map<string, string[]>();
	for (const genre of genres) {
		const names = namesByGame.get(genre.gameId) ?? [];
		if (!names.includes(genre.name)) names.push(genre.name);
		namesByGame.set(genre.gameId, names);
	}
	return namesByGame;
}

export function buildRewindViewGames(
	closedRuns: ClosedRewindRun[],
	genres: RewindGameGenre[]
): RewindViewGame[] {
	const namesByGame = groupGenreNamesByGame(genres);
	return listLatestFinishedRuns(closedRuns).map(run => ({
		...toRewindFinishedGame(run),
		backlogId: run.id,
		platformName: run.platform?.name ?? null,
		genres: namesByGame.get(run.gameId) ?? []
	}));
}
