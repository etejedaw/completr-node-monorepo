import { type RewindRun } from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { activityStart } from "./activity-start.util";
import { toDateOnly } from "./to-date-only.util";

export function compareChronologically(first: RewindRun, second: RewindRun) {
	return (
		compareText(activityStart(first) ?? "", activityStart(second) ?? "") ||
		compareText(
			toDateOnly(first.finishedAt) ?? "",
			toDateOnly(second.finishedAt) ?? ""
		) ||
		compareText(first.id, second.id)
	);
}
