import {
	REWIND_OPENING_MONTH,
	REWIND_SPOTLIGHT_LAST_MONTH
} from "../rewind.constants";

export function resolveSpotlightYear(today: Date): number | null {
	const month = today.getUTCMonth() + 1;
	const year = today.getUTCFullYear();

	if (month >= REWIND_OPENING_MONTH) return year;
	if (month <= REWIND_SPOTLIGHT_LAST_MONTH) return year - 1;
	return null;
}
