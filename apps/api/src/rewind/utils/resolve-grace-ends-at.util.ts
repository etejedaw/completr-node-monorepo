import { REWIND_GRACE_LAST_DAY } from "../rewind.constants";
import { type RewindRecord } from "../rewind-record.interface";
import { isRewindGraceWindow } from "./is-rewind-grace-window.util";

export function resolveGraceEndsAt(
	record: Pick<RewindRecord, "year" | "graceUsed">,
	today: Date
): string | null {
	if (record.graceUsed || !isRewindGraceWindow(record.year, today))
		return null;
	const lastDay = String(REWIND_GRACE_LAST_DAY).padStart(2, "0");
	return `${record.year + 1}-01-${lastDay}`;
}
