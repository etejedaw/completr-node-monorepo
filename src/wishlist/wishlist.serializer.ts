import { Wishlist } from "./wishlist.model";

export function wishlistSerializer(entry: Wishlist) {
	return {
		id: entry.id,
		position: entry.position,
		backlog: backlogSerializer(entry.Backlog)
	};
}

function backlogSerializer(backlog: Wishlist["Backlog"]) {
	if (!backlog) return undefined;
	return {
		id: backlog.id,
		status: backlog.status,
		score: backlog.score,
		duration: backlog.duration,
		startedAt: backlog.startedAt,
		notes: backlog.notes,
		game: gameSerializer(backlog.Game),
		platform: platformSerializer(backlog.Platform)
	};
}

function gameSerializer(game: Wishlist["Backlog"]["Game"]) {
	if (!game) return undefined;
	return {
		id: game.id,
		title: game.title,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc
	};
}

function platformSerializer(platform: Wishlist["Backlog"]["Platform"]) {
	if (!platform) return undefined;
	return {
		id: platform.id,
		abbreviation: platform.abbreviation
	};
}
