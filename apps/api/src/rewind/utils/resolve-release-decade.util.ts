import { REWIND_MIN_RELEASE_YEAR } from "../rewind.constants";
import { type RewindRun } from "../rewind-run.interface";

export function resolveReleaseDecade(
	run: RewindRun,
	rewindYear: number
): number | null {
	const { releaseYear } = run;
	if (releaseYear === null) return null;
	if (releaseYear < REWIND_MIN_RELEASE_YEAR || releaseYear > rewindYear)
		return null;
	return Math.floor(releaseYear / 10) * 10;
}
