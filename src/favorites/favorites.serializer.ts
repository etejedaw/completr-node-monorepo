import { Favorite } from "./favorite.model";

export function favoriteSerializer(entry: Favorite, moodTags?: string[]) {
	return {
		id: entry.id,
		position: entry.position,
		moodTags: moodTags ?? [],
		game: gameSerializer(entry.Game)
	};
}

function gameSerializer(game: Favorite["Game"]) {
	if (!game) return undefined;
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc
	};
}
