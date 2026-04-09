import { Favorite } from "./favorite.model";

export function favoriteSerializer(entry: Favorite) {
	return {
		id: entry.id,
		position: entry.position,
		game: gameSerializer(entry.Game)
	};
}

function gameSerializer(game: Favorite["Game"]) {
	if (!game) return undefined;
	return {
		id: game.id,
		title: game.title,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc
	};
}
