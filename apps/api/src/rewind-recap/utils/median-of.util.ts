import { roundToHundredth } from "./round-to-hundredth.util";

export function medianOf(values: number[]): number | null {
	const sorted = [...values].sort((first, second) => first - second);
	if (sorted.length === 0) return null;
	const middle = Math.floor(sorted.length / 2);
	const median =
		sorted.length % 2 === 1
			? (sorted[middle] ?? 0)
			: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
	return roundToHundredth(median);
}
