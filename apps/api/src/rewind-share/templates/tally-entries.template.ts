import { type RewindTotals } from "../../rewind/rewind.interface";
import { SHARE_COLORS } from "../rewind-share.constants";
import { formatCount, formatHours } from "../utils/format-count.util";
import { type TallyEntry } from "./elements.template";

export function tallyEntries(totals: RewindTotals): TallyEntry[] {
	const leadEntry =
		totals.finished > 0
			? {
					label: "Finished",
					value: formatCount(totals.finished),
					color: SHARE_COLORS.finished
				}
			: {
					label: "Started",
					value: formatCount(totals.started),
					color: SHARE_COLORS.started
				};

	return [
		leadEntry,
		{
			label: "Left behind",
			value: formatCount(totals.abandoned),
			color: SHARE_COLORS.abandoned
		},
		{
			label: "Hours played",
			value: formatHours(totals.hoursPlayed),
			color: SHARE_COLORS.foreground
		}
	];
}

export function platinumEntry(totals: RewindTotals): TallyEntry | null {
	if (!totals.platinums) return null;
	return {
		label: "Platinums",
		value: formatCount(totals.platinums),
		color: SHARE_COLORS.platinum
	};
}
