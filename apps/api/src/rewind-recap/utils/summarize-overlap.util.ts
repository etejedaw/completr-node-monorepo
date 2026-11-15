import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapOverlapStats } from "../rewind-recap.interface";
import { overlapsAnother } from "./overlaps-another.util";
import { toDayInterval } from "./to-day-interval.util";

export function summarizeOverlap(runs: RewindRun[]): RecapOverlapStats {
	const intervals = runs.flatMap(toDayInterval);
	const overlapping = intervals.filter(interval =>
		overlapsAnother(interval, intervals)
	).length;
	return {
		games: intervals.length,
		overlapping,
		solo: intervals.length - overlapping
	};
}
