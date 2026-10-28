const HOURS_ROUNDING_THRESHOLD = 100;

export function formatCount(value: number): string {
	return value.toLocaleString("en-US");
}

export function formatHours(hours: number): string {
	const shown =
		hours >= HOURS_ROUNDING_THRESHOLD
			? Math.round(hours)
			: Math.round(hours * 10) / 10;
	return shown.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function formatRating(rating: number): string {
	return rating.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
