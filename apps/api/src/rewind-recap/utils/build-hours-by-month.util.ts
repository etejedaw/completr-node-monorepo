import { type RewindMonthHours } from "../../rewind/rewind.interface";
import { type ClosedRewindRun } from "../../rewind/rewind-run.interface";
import { resolveRunHours } from "../../rewind/utils/resolve-run-hours.util";
import { roundToTenth } from "../../rewind/utils/round-to-tenth.util";
import { MONTHS } from "../rewind-recap.constants";
import { finishedMonth } from "./finished-month.util";

export function buildHoursByMonth(
	finishedRuns: ClosedRewindRun[]
): RewindMonthHours[] {
	return MONTHS.map(month => {
		const hours = finishedRuns
			.filter(run => finishedMonth(run) === month)
			.reduce((sum, run) => sum + (resolveRunHours(run)?.hours ?? 0), 0);
		return { month, hours: roundToTenth(hours) };
	});
}
