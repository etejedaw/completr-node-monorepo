import { type RewindGameGenre } from "../../rewind/rewind-run.interface";

export function groupGenreNamesByGame(
	genres: RewindGameGenre[]
): Map<string, string[]> {
	const namesByGame = new Map<string, string[]>();
	for (const genre of genres) {
		const names = namesByGame.get(genre.gameId) ?? [];
		if (!names.includes(genre.name)) names.push(genre.name);
		namesByGame.set(genre.gameId, names);
	}
	return namesByGame;
}
