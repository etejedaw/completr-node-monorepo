import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapGroupStats } from "../rewind-recap.interface";
import { groupBy } from "./group-by.util";
import { orderedByName } from "./ordered-by-name.util";
import { summarizeGroups } from "./summarize-groups.util";

const SOLO_GROUP = "solo";

const COOP_GROUP = "co-op";

export function summarizeSocial(
	closed: RewindRun[],
	coopAliasesByRun: Map<string, string[]>
): RecapGroupStats[] {
	if (!closed.some(run => coopAliasesByRun.has(run.id))) return [];
	return orderedByName(
		summarizeGroups(
			groupBy(closed, run => [
				coopAliasesByRun.has(run.id) ? COOP_GROUP : SOLO_GROUP
			]),
			1
		),
		[SOLO_GROUP, COOP_GROUP]
	);
}
