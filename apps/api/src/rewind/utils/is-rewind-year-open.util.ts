import { REWIND_MAX_YEAR, REWIND_MIN_YEAR } from "../rewind.constants";
import { type RewindCalendar } from "../rewind-run.interface";

function isSupportedYear(year: number, calendar: RewindCalendar): boolean {
	return (
		year >= Math.max(REWIND_MIN_YEAR, calendar.firstYear) &&
		year <= REWIND_MAX_YEAR
	);
}

function lastOpenedYear(calendar: RewindCalendar): number {
	const lastClosedYear = calendar.today.getUTCFullYear() - 1;
	return Math.max(lastClosedYear, calendar.edition?.year ?? lastClosedYear);
}

export function isRewindYearOpen(
	year: number,
	calendar: RewindCalendar
): boolean {
	return isSupportedYear(year, calendar) && year <= lastOpenedYear(calendar);
}
