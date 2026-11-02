export function compareText(first: string, second: string): number {
	if (first === second) return 0;
	return first < second ? -1 : 1;
}
