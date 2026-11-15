import { toUtcDay } from "./to-utc-day.util";

export function isUtcDayBetween(date: Date, first: string, last: string) {
	const day = toUtcDay(date);
	return first <= day && day <= last;
}
