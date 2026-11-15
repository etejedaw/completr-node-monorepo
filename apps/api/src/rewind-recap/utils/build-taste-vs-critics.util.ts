import { type RewindCriticGap } from "../../rewind/rewind.interface";
import { type ClosedRewindRun } from "../../rewind/rewind-run.interface";
import { REWIND_TASTE_VS_CRITICS_LIMIT } from "../rewind-recap.constants";
import { compareByGapSize } from "./compare-by-gap-size.util";
import { toCriticGap } from "./to-critic-gap.util";

export function buildTasteVsCritics(
	latestFinishedRuns: ClosedRewindRun[]
): RewindCriticGap[] {
	return latestFinishedRuns
		.flatMap(toCriticGap)
		.sort(compareByGapSize)
		.slice(0, REWIND_TASTE_VS_CRITICS_LIMIT);
}
