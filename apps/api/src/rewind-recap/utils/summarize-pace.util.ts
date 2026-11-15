import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapPaceStats } from "../rewind-recap.interface";
import { medianOf } from "./median-of.util";
import { paceVsEstimate } from "./pace-vs-estimate.util";

export function summarizePace(runs: RewindRun[]): RecapPaceStats {
	const paces = runs.flatMap(run => {
		const pace = paceVsEstimate(run);
		return pace === null ? [] : [pace];
	});
	return {
		games: paces.length,
		medianPace: medianOf(paces),
		slowerThanEstimate: paces.filter(pace => pace > 1).length,
		fasterThanEstimate: paces.filter(pace => pace < 1).length
	};
}
