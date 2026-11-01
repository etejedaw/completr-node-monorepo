const DELAY_SECONDS_PATTERN = /^\d+$/;

export function parseRetryAfter(
	header: string | null,
	now: number
): number | undefined {
	const value = header?.trim();
	if (!value) return undefined;

	if (DELAY_SECONDS_PATTERN.test(value)) return Number(value) * 1000;

	const date = Date.parse(value);
	if (Number.isNaN(date)) return undefined;

	return Math.max(0, date - now);
}
