import { type RecapGroupStats } from "../rewind-recap.interface";

export function orderedByName(
	stats: RecapGroupStats[],
	names: string[]
): RecapGroupStats[] {
	return names.flatMap(name => stats.filter(entry => entry.name === name));
}
