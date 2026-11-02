import { REWIND_MIN_STREAK_MONTHS } from "../rewind.constants";
import { type RewindStreak } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";

function listFinishedMonths(latestFinishedRuns: ClosedRewindRun[]): number[] {
	const months = new Set(
		latestFinishedRuns.map(run => Number(run.finishedAt.slice(5, 7)))
	);
	return [...months].sort((first, second) => first - second);
}

function splitIntoStreaks(months: number[]): RewindStreak[] {
	const streaks: RewindStreak[] = [];

	for (const month of months) {
		const current = streaks.at(-1);
		if (current && current.toMonth + 1 === month) {
			current.toMonth = month;
			current.months += 1;
		} else {
			streaks.push({ months: 1, fromMonth: month, toMonth: month });
		}
	}
	return streaks;
}

export function findLongestStreak(
	latestFinishedRuns: ClosedRewindRun[]
): RewindStreak | null {
	const streaks = splitIntoStreaks(listFinishedMonths(latestFinishedRuns));
	const longest = streaks.reduce<RewindStreak | null>(
		(best, streak) =>
			best === null || streak.months > best.months ? streak : best,
		null
	);

	if (!longest || longest.months < REWIND_MIN_STREAK_MONTHS) return null;
	return longest;
}
