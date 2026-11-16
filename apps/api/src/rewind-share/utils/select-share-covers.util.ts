import { type Rewind, type RewindGameRef } from "../../rewind/rewind.interface";
import { sharePosterUrl } from "./share-poster-url.util";

function isFirstAppearance(
	game: RewindGameRef,
	seenGameIds: Set<string>,
	seenCoverUrls: Set<string>
): boolean {
	const posterUrl = sharePosterUrl(game);
	if (seenGameIds.has(game.gameId)) return false;
	if (posterUrl && seenCoverUrls.has(posterUrl)) return false;
	seenGameIds.add(game.gameId);
	if (posterUrl) seenCoverUrls.add(posterUrl);
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
		...distinct.filter(game => !game.coverUrl && game.backgroundUrl),
		...distinct.filter(game => !sharePosterUrl(game))
	].slice(0, limit);
}
