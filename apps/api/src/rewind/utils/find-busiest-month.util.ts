import { type RewindMonth } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";

function compareByGameCount(first: RewindMonth, second: RewindMonth) {
	return second.count - first.count || first.month - second.month;
}

export function findBusiestMonth(
	latestFinishedRuns: ClosedRewindRun[]
): RewindMonth | null {
	const countByMonth = new Map<number, number>();

	for (const run of latestFinishedRuns) {
		const month = Number(run.finishedAt.slice(5, 7));
		countByMonth.set(month, (countByMonth.get(month) ?? 0) + 1);
	}

	const [busiest] = [...countByMonth.entries()]
		.map(([month, count]) => ({ month, count }))
		.sort(compareByGameCount);
	return busiest ?? null;
}
