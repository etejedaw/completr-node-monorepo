import { type RewindRun } from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { activityStart } from "./activity-start.util";
import { toDateOnly } from "./to-date-only.util";

export function compareLatestActivityFirst(
	first: RewindRun,
	second: RewindRun
) {
	return (
		compareText(
			toDateOnly(second.finishedAt) ?? "",
			toDateOnly(first.finishedAt) ?? ""
		) ||
		compareText(activityStart(second) ?? "", activityStart(first) ?? "") ||
		compareText(first.id, second.id)
	);
}
