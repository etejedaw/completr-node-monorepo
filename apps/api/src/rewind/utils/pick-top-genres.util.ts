import { REWIND_TOP_LIMIT } from "../rewind.constants";
import { type RewindGenre } from "../rewind.interface";
import {
	type ClosedRewindRun,
	type RewindGameGenre
} from "../rewind-run.interface";
import { rankGenres } from "./rank-genres.util";

export function pickTopGenres(
	latestFinishedRuns: ClosedRewindRun[],
	genres: RewindGameGenre[]
): RewindGenre[] {
	return rankGenres(latestFinishedRuns, genres).slice(0, REWIND_TOP_LIMIT);
}
