export function escapeApicalypseString(value: string): string {
	return value.replace(/[\\"]/g, character => `\\${character}`);
}
