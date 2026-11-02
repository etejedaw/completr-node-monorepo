import { type RewindRun } from "../rewind-run.interface";

export function countDistinctGames(runs: RewindRun[]): number {
	return new Set(runs.map(run => run.gameId)).size;
}
