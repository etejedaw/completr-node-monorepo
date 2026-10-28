import { type RewindGenre } from "../rewind.interface";
import {
	type ClosedRewindRun,
	type RewindGameGenre
} from "../rewind-run.interface";
import { compareText } from "./compare-text.util";

interface GenreGames {
	name: string;
	gameIds: Set<string>;
}

function compareByGameCount(first: RewindGenre, second: RewindGenre) {
	return second.count - first.count || compareText(first.name, second.name);
}

function groupFinishedGamesByGenre(
	latestFinishedRuns: ClosedRewindRun[],
	genres: RewindGameGenre[]
): Map<string, GenreGames> {
	const finishedGameIds = new Set(latestFinishedRuns.map(run => run.gameId));
	const gamesByGenre = new Map<string, GenreGames>();

	for (const genre of genres) {
		if (!finishedGameIds.has(genre.gameId)) continue;
		const entry = gamesByGenre.get(genre.code) ?? {
			name: genre.name,
			gameIds: new Set<string>()
		};
		entry.gameIds.add(genre.gameId);
		gamesByGenre.set(genre.code, entry);
	}
	return gamesByGenre;
}

export function rankGenres(
	latestFinishedRuns: ClosedRewindRun[],
	genres: RewindGameGenre[]
): RewindGenre[] {
	const gamesByGenre = groupFinishedGamesByGenre(latestFinishedRuns, genres);

	return [...gamesByGenre.entries()]
		.map(([code, { name, gameIds }]) => ({
			code,
			name,
			count: gameIds.size
		}))
		.sort(compareByGameCount);
}
