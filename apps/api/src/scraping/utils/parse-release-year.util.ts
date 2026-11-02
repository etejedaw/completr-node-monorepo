const LEADING_YEAR_PATTERN = /^(\d{4})-\d{2}-\d{2}/;

export function parseReleaseYear(value: unknown): number | null {
	if (typeof value !== "string") return null;

	const match = LEADING_YEAR_PATTERN.exec(value.trim());
	if (!match) return null;

	const year = Number(match[1]);
	return year > 0 ? year : null;
}
