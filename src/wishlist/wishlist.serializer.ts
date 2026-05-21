import { Wishlist } from "./wishlist.model";

export function wishlistSerializer(entry: Wishlist) {
	return {
		id: entry.id,
		position: entry.position,
		game: gameSerializer(entry.Game)
	};
}

function gameSerializer(game: Wishlist["Game"]) {
	if (!game) return undefined;
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc
	};
}
