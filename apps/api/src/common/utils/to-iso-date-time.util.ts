export function toIsoDateTime(value: Date | string | null | undefined) {
	if (value === null || value === undefined) return null;
	return value instanceof Date ? value.toISOString() : value;
}
