import { type RewindRun } from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import {
	type RecapPlatinumGroup,
	type RewindRunPlatinum
} from "../rewind-recap.interface";

export function summarizePlatinumGroups(
	groups: Map<string, RewindRun[]>,
	platinumsByRun: Map<string, RewindRunPlatinum>
): RecapPlatinumGroup[] {
	return [...groups.entries()]
		.map(([name, runs]) => ({
			name,
			games: runs.length,
			platinumed: runs.filter(run => platinumsByRun.has(run.id)).length
		}))
		.sort(
			(first, second) =>
				second.platinumed - first.platinumed ||
				second.games - first.games ||
				compareText(first.name, second.name)
		);
}
