const HOURS_ROUNDING_THRESHOLD = 100;

export function formatHours(hours: number, locale: string): string {
	const shown =
		hours >= HOURS_ROUNDING_THRESHOLD
			? Math.round(hours)
			: Math.round(hours * 10) / 10;
	return shown.toLocaleString(locale, { maximumFractionDigits: 1 });
}
