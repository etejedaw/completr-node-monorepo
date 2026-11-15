import { type RewindBacklogFlowMonth } from "../../rewind/rewind.interface";
import { type ClosedRewindRun } from "../../rewind/rewind-run.interface";
import { MONTHS } from "../rewind-recap.constants";
import { finishedMonth } from "./finished-month.util";

export function buildBacklogFlow(
	finishedRuns: ClosedRewindRun[],
	addedByMonth: number[]
): RewindBacklogFlowMonth[] {
	return MONTHS.map(month => ({
		month,
		added: addedByMonth[month - 1] ?? 0,
		finished: finishedRuns.filter(run => finishedMonth(run) === month)
			.length
	}));
}
