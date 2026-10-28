import { type RewindGenre } from "../rewind.interface";
import {
	type ClosedRewindRun,
	type RewindGameGenre
} from "../rewind-run.interface";
import { compareText } from "./compare-text.util";

function compareByGameCount(first: RewindGenre, second: RewindGenre) {
	return second.count - first.count || compareText(first.name, second.name);
}

export function findFavoriteGenre(
	latestFinishedRuns: ClosedRewindRun[],
	genres: RewindGameGenre[]
): RewindGenre | null {
	const finishedGameIds = new Set(latestFinishedRuns.map(run => run.gameId));
	const gamesByGenre = new Map<
		string,
		{ name: string; gameIds: Set<string> }
	>();

	for (const genre of genres) {
		if (!finishedGameIds.has(genre.gameId)) continue;
		const entry = gamesByGenre.get(genre.code) ?? {
			name: genre.name,
			gameIds: new Set<string>()
		};
		entry.gameIds.add(genre.gameId);
		gamesByGenre.set(genre.code, entry);
	}

	const [favorite] = [...gamesByGenre.entries()]
		.map(([code, { name, gameIds }]) => ({
			code,
			name,
			count: gameIds.size
		}))
		.sort(compareByGameCount);
	return favorite ?? null;
}
