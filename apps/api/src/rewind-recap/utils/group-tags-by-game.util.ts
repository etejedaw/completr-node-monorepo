import { type RewindGameTag } from "../rewind-recap.interface";

export function groupTagsByGame(tags: RewindGameTag[]): Map<string, string[]> {
	const tagsByGame = new Map<string, string[]>();
	for (const { gameId, tag } of tags) {
		const gameTags = tagsByGame.get(gameId) ?? [];
		if (!gameTags.includes(tag)) gameTags.push(tag);
		tagsByGame.set(gameId, gameTags);
	}
	return tagsByGame;
}
