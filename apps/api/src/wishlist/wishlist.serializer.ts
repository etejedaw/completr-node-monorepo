import { type Wishlist } from "./wishlist.model";

export function wishlistSerializer(entry: Wishlist, moodTags?: string[]) {
	return {
		id: entry.id,
		position: entry.position,
		moodTags: moodTags ?? [],
		game: gameSerializer(entry.Game),
		platform: platformSerializer(entry.Platform)
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

function platformSerializer(platform: Wishlist["Platform"]) {
	if (!platform) return null;
	return {
		id: platform.id,
		name: platform.name,
		abbreviation: platform.abbreviation
	};
}
