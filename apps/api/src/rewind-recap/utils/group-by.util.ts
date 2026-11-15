import { type RewindRun } from "../../rewind/rewind-run.interface";

export function groupBy(
	runs: RewindRun[],
	keysOf: (run: RewindRun) => string[]
): Map<string, RewindRun[]> {
	const groups = new Map<string, RewindRun[]>();
	for (const run of runs) {
		for (const key of new Set(keysOf(run))) {
			groups.set(key, [...(groups.get(key) ?? []), run]);
		}
	}
	return groups;
}
