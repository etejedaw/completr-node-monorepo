import { type ClosedRewindRun } from "../../rewind/rewind-run.interface";

export function finishedMonth(run: ClosedRewindRun): number {
	return Number(run.finishedAt.slice(5, 7));
}
