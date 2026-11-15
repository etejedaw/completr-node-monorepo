export function toDateOnly(value: string | null): string | null {
	return value === null ? null : value.slice(0, 10);
}
