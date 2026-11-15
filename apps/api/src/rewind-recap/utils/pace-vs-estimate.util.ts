import { type RewindRun } from "../../rewind/rewind-run.interface";
import { roundToHundredth } from "./round-to-hundredth.util";

export function paceVsEstimate(run: RewindRun): number | null {
	if (run.realDuration === null || run.duration === null) return null;
	if (run.realDuration <= 0 || run.duration <= 0) return null;
	return roundToHundredth(run.realDuration / run.duration);
}
