import { type RewindPersonaCode } from "../rewind.constants";
import { type RewindTotals } from "../rewind.interface";
import { type ClosedRewindRun } from "../rewind-run.interface";
import { calculateAverageFinishedHours } from "./calculate-average-finished-hours.util";
import { chooseRewindPersona } from "./choose-rewind-persona.util";

export function pickYearPersona(
	totals: RewindTotals,
	latestFinishedRuns: ClosedRewindRun[]
): RewindPersonaCode {
	return chooseRewindPersona({
		totals,
		averageFinishedHours: calculateAverageFinishedHours(latestFinishedRuns)
	});
}
