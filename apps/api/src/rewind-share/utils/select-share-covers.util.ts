import { type Rewind, type RewindGameRef } from "../../rewind/rewind.interface";

function isFirstAppearance(
	game: RewindGameRef,
	seenGameIds: Set<string>,
	seenCoverUrls: Set<string>
): boolean {
	if (seenGameIds.has(game.gameId)) return false;
	if (game.coverUrl && seenCoverUrls.has(game.coverUrl)) return false;
	seenGameIds.add(game.gameId);
	if (game.coverUrl) seenCoverUrls.add(game.coverUrl);
	return true;
}

export function selectShareCovers(
	rewind: Rewind,
	limit: number
): RewindGameRef[] {
	const latestFirst = [...rewind.finishedGames].reverse();
	const candidates = rewind.highlights.topRated
		? [rewind.highlights.topRated, ...latestFirst]
		: latestFirst;

	const seenGameIds = new Set<string>();
	const seenCoverUrls = new Set<string>();
	const distinct = candidates.filter(game =>
		isFirstAppearance(game, seenGameIds, seenCoverUrls)
	);
	return [
		...distinct.filter(game => game.coverUrl),
		...distinct.filter(game => !game.coverUrl)
	].slice(0, limit);
}
