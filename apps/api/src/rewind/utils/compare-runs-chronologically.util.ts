import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareText } from "./compare-text.util";

export function compareRunsChronologically(
	first: ClosedRewindRun,
	second: ClosedRewindRun
): number {
	return (
		compareText(first.finishedAt, second.finishedAt) ||
		compareText(first.id, second.id)
	);
}
