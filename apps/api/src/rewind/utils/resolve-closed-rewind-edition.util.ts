import { toUtcDay } from "../../common/utils/to-utc-day.util";
import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import { type RewindCalendar } from "../rewind-run.interface";

export function resolveClosedRewindEdition(
	calendar: Pick<RewindCalendar, "today" | "edition">
): RewindEditionRecord | null {
	const { edition, today } = calendar;
	if (!edition) return null;
	return toUtcDay(today) > edition.closesAt ? edition : null;
}
