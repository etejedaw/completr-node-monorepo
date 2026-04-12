import { Wishlist } from "./wishlist.model";

function calculateRatio(score?: number, duration?: number) {
	if (!score || !duration) return undefined;
	return Math.round((score / duration) * 100) / 100;
}

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
		ratio: calculateRatio(backlog.score, backlog.duration),
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
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl,
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
