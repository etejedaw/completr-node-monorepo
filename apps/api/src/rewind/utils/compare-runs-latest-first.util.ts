import { type ClosedRewindRun } from "../rewind-run.interface";
import { compareText } from "./compare-text.util";

export function compareRunsLatestFirst(
	first: ClosedRewindRun,
	second: ClosedRewindRun
): number {
	return (
		compareText(second.finishedAt, first.finishedAt) ||
		compareText(first.id, second.id)
	);
}
