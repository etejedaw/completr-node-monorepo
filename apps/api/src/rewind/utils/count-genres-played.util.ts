import {
	type ClosedRewindRun,
	type RewindGameGenre
} from "../rewind-run.interface";
import { rankGenres } from "./rank-genres.util";

export function countGenresPlayed(
	latestFinishedRuns: ClosedRewindRun[],
	genres: RewindGameGenre[]
): number {
	return rankGenres(latestFinishedRuns, genres).length;
}
