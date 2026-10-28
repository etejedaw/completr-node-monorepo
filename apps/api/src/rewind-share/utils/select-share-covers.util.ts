import { type Rewind, type RewindGameRef } from "../../rewind/rewind.interface";

export function selectShareCovers(
	rewind: Rewind,
	limit: number
): RewindGameRef[] {
	const latestFirst = [...rewind.finishedGames].reverse();
	const candidates = rewind.highlights.topRated
		? [rewind.highlights.topRated, ...latestFirst]
		: latestFirst;

	const seenGameIds = new Set<string>();
	return candidates
		.filter(game => {
			if (seenGameIds.has(game.gameId)) return false;
			seenGameIds.add(game.gameId);
			return true;
		})
		.slice(0, limit);
}
