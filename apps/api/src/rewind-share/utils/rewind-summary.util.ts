import { type RewindTotals } from "../../rewind/rewind.interface";
import {
	type ShareCopy,
	type ShareCountLabel
} from "../rewind-share.interface";
import { countLabel } from "./count-label.util";

function joinParts(parts: string[], lastSeparator: string): string {
	if (parts.length === 1) return parts[0] ?? "";
	return `${parts.slice(0, -1).join(", ")}${lastSeparator}${parts.at(-1)}`;
}

export function rewindSummary(totals: RewindTotals, copy: ShareCopy): string {
	const { summary } = copy;
	const counts: { count: number; verb: ShareCountLabel }[] = [
		{ count: totals.finished, verb: summary.finished },
		{ count: totals.abandoned, verb: summary.leftBehind },
		{ count: totals.started, verb: summary.started }
	].filter(({ count }) => count > 0);

	const [first] = counts;
	if (!first) return summary.emptyYear;

	const parts = counts.map(
		({ count, verb }) => `${count} ${countLabel(count, verb)}`
	);
	parts[0] = `${first.count} ${countLabel(first.count, summary.games)} ${countLabel(first.count, first.verb)}`;
	return `${joinParts(parts, summary.lastSeparator)}.`;
}
