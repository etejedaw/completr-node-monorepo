import { isUtcDayBetween } from "../../common/utils/is-utc-day-between.util";
import { type RewindCalendar } from "../rewind-run.interface";
import { resolveOpenRewindEdition } from "./resolve-open-rewind-edition.util";

export function isRewindGraceWindow(
	year: number,
	calendar: Pick<RewindCalendar, "today" | "edition">
): boolean {
	const edition = resolveOpenRewindEdition(calendar);
	if (edition?.year !== year) return false;
	return isUtcDayBetween(
		calendar.today,
		edition.graceStartsAt,
		edition.graceEndsAt
	);
}
