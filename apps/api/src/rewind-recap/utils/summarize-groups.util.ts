import { type RewindRun } from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { type RecapGroupStats } from "../rewind-recap.interface";
import { summarizeGroup } from "./summarize-group.util";

export function summarizeGroups(
	groups: Map<string, RewindRun[]>,
	minGames: number
): RecapGroupStats[] {
	return [...groups.entries()]
		.filter(([, runs]) => runs.length >= minGames)
		.map(([name, runs]) => summarizeGroup(name, runs))
		.sort(
			(first, second) =>
				second.games - first.games ||
				compareText(first.name, second.name)
		);
}
