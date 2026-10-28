import { type RewindPlatform } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareText } from "./compare-text.util";

function compareByRunCount(first: RewindPlatform, second: RewindPlatform) {
	return second.count - first.count || compareText(first.name, second.name);
}

export function rankPlatforms(
	finishedRuns: ClosedRewindRun[]
): RewindPlatform[] {
	const platformsByName = new Map<string, RewindPlatform>();

	for (const { platform } of finishedRuns) {
		if (!platform) continue;
		const entry = platformsByName.get(platform.name) ?? {
			name: platform.name,
			abbreviation: platform.abbreviation,
			count: 0
		};
		entry.count += 1;
		platformsByName.set(platform.name, entry);
	}

	return [...platformsByName.values()].sort(compareByRunCount);
}
