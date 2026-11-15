import { type RecapDayInterval } from "../rewind-recap.interface";

export function overlapsAnother(
	interval: RecapDayInterval,
	intervals: RecapDayInterval[]
): boolean {
	return intervals.some(
		other =>
			other.runId !== interval.runId &&
			interval.start < other.end &&
			other.start < interval.end
	);
}
