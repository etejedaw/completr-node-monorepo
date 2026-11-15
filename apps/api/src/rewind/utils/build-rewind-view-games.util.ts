import { type RewindViewGame } from "../rewind.interface";
import { type RewindGameGenre, type RewindRun } from "../rewind-run.interface";
import { collectYearRuns } from "./collect-year-runs.util";
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
	runs: RewindRun[],
	year: number,
	genres: RewindGameGenre[]
): RewindViewGame[] {
	const namesByGame = groupGenreNamesByGame(genres);
	const { finished } = collectYearRuns(runs, year);
	return listLatestFinishedRuns(finished).map(run => ({
		...toRewindFinishedGame(run),
		platformName: run.platform?.name ?? null,
		genres: namesByGame.get(run.gameId) ?? []
	}));
}
