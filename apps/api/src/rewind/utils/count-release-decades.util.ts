import { type RewindReleaseDecade } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { resolveReleaseDecade } from "./resolve-release-decade.util";

export function countReleaseDecades(
	latestFinishedRuns: ClosedRewindRun[],
	rewindYear: number
): RewindReleaseDecade[] {
	const countByDecade = new Map<number, number>();
	for (const run of latestFinishedRuns) {
		const decade = resolveReleaseDecade(run, rewindYear);
		if (decade !== null)
			countByDecade.set(decade, (countByDecade.get(decade) ?? 0) + 1);
	}

	return [...countByDecade.entries()]
		.map(([decade, count]) => ({ decade, count }))
		.sort((first, second) => first.decade - second.decade);
}
