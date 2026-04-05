import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Backlog } from "./backlog.model";

function calculateRatio(score?: number, duration?: number) {
	if (!score || !duration) return undefined;
	return Math.round((score / duration) * 100) / 100;
}

export function backlogSerializer(backlogEntry: Backlog) {
	return {
		id: backlogEntry.id,
		status: backlogEntry.status,
		score: backlogEntry.score,
		duration: backlogEntry.duration,
		ratio: calculateRatio(backlogEntry.score, backlogEntry.duration),
		startedAt: backlogEntry.startedAt,
		finishedAt: backlogEntry.finishedAt,
		realDuration: backlogEntry.realDuration,
		userRating: backlogEntry.userRating,
		isPublic: backlogEntry.isPublic,
		notes: backlogEntry.notes,
		game: gameSerializer(backlogEntry.Game),
		platform: platformSerializer(backlogEntry.Platform)
	};
}

function gameSerializer(game: Game) {
	return {
		id: game.id,
		title: game.title,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc
	};
}

function platformSerializer(platform: Platform) {
	return {
		id: platform.id,
		abbreviation: platform.abbreviation
	};
}
