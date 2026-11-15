import { isUtcDayBetween } from "../../common/utils/is-utc-day-between.util";
import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import { type RewindCalendar } from "../rewind-run.interface";

export function resolveOpenRewindEdition(
	calendar: Pick<RewindCalendar, "today" | "edition">
): RewindEditionRecord | null {
	const { edition, today } = calendar;
	if (!edition) return null;
	return isUtcDayBetween(today, edition.opensAt, edition.closesAt)
		? edition
		: null;
}
