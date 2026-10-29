import { type RewindRun } from "../rewind-run.interface";
import { collectYearRuns } from "./collect-year-runs.util";

export function listActiveGameIds(
	runs: RewindRun[],
	years: number[]
): string[] {
	const gameIds = years.flatMap(year => {
		const { finished, abandoned, started } = collectYearRuns(runs, year);
		return [...finished, ...abandoned, ...started].map(run => run.gameId);
	});
	return [...new Set(gameIds)];
}
