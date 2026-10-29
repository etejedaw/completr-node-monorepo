import { type RewindYearMix } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { countLengthMix } from "./count-length-mix.util";
import { countReleaseDecades } from "./count-release-decades.util";

function sumCounts(items: { count: number }[]): number {
	return items.reduce((total, item) => total + item.count, 0);
}

export function calculateRewindYearMix(
	latestFinishedRuns: ClosedRewindRun[],
	rewindYear: number
): RewindYearMix {
	const lengthMix = countLengthMix(latestFinishedRuns);
	const releaseDecades = countReleaseDecades(latestFinishedRuns, rewindYear);

	return {
		lengthMix,
		releaseDecades,
		gamesWithoutHours: latestFinishedRuns.length - sumCounts(lengthMix),
		gamesWithoutRelease:
			latestFinishedRuns.length - sumCounts(releaseDecades)
	};
}
