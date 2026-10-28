import {
	REWIND_MAX_YEAR,
	REWIND_MIN_YEAR,
	REWIND_OPENING_MONTH
} from "../rewind.constants";

export function isRewindYearOpen(year: number, today: Date): boolean {
	if (year < REWIND_MIN_YEAR || year > REWIND_MAX_YEAR) return false;

	const currentYear = today.getUTCFullYear();
	if (year < currentYear) return true;
	return (
		year === currentYear && today.getUTCMonth() + 1 >= REWIND_OPENING_MONTH
	);
}
