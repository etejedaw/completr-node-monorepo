import { type Rewind } from "../../rewind/rewind.interface";

export function selectBackdropUrl(rewind: Rewind): string | null {
	const { topRated, firstFinished } = rewind.highlights;
	const candidates = [topRated, firstFinished, ...rewind.finishedGames];
	return candidates.find(game => game?.backgroundUrl)?.backgroundUrl ?? null;
}
