import {
	REWIND_MAX_YEAR,
	REWIND_MIN_YEAR,
	REWIND_OPENING_MONTH
} from "../rewind.constants";
import { type RewindCalendar } from "../rewind-run.interface";

function isSupportedYear(year: number, calendar: RewindCalendar): boolean {
	return (
		year >= Math.max(REWIND_MIN_YEAR, calendar.firstYear) &&
		year <= REWIND_MAX_YEAR
	);
}

export function isRewindYearOpen(
	year: number,
	calendar: RewindCalendar
): boolean {
	if (!isSupportedYear(year, calendar)) return false;

	const { today } = calendar;
	const currentYear = today.getUTCFullYear();
	if (year < currentYear) return true;
	return (
		year === currentYear && today.getUTCMonth() + 1 >= REWIND_OPENING_MONTH
	);
}
