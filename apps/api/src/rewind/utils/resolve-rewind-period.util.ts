import { type RewindPeriod } from "../rewind.interface";
import { type RewindCalendar } from "../rewind-run.interface";
import { resolveOpenRewindEdition } from "./resolve-open-rewind-edition.util";

export function resolveRewindPeriod(
	calendar: Pick<RewindCalendar, "today" | "edition" | "upcomingEdition">
): RewindPeriod | null {
	const open = resolveOpenRewindEdition(calendar);
	const status: RewindPeriod["status"] = open
		? "open"
		: calendar.upcomingEdition
			? "scheduled"
			: "closed";
	const edition = open ?? calendar.upcomingEdition ?? calendar.edition;
	if (!edition) return null;
	return {
		status,
		year: edition.year,
		opensAt: edition.opensAt,
		closesAt: edition.closesAt
	};
}
