import { type RewindRun } from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { toDateOnly } from "./to-date-only.util";

export function compareByFinishedAt(first: RewindRun, second: RewindRun) {
	return (
		compareText(
			toDateOnly(first.finishedAt) ?? "",
			toDateOnly(second.finishedAt) ?? ""
		) ||
		compareText(first.game.title, second.game.title) ||
		compareText(first.id, second.id)
	);
}
