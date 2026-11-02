const NUMERIC_TEXT_PATTERN = /^-?\d+(?:\.\d+)?$/;

export function toFiniteNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;

	if (typeof value === "string" && NUMERIC_TEXT_PATTERN.test(value.trim()))
		return Number(value.trim());

	return null;
}
