import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Backlog } from "./backlog.model";

export function backlogSerializer(backlogEntry: Backlog) {
	const ratio =
		backlogEntry.score && backlogEntry.duration
			? backlogEntry.score / backlogEntry.duration
			: undefined;

	return {
		id: backlogEntry.id,
		status: backlogEntry.status,
		score: backlogEntry.score,
		duration: backlogEntry.duration,
		ratio,
		startedAt: backlogEntry.startedAt,
		finishedAt: backlogEntry.finishedAt,
		realDuration: backlogEntry.realDuration,
		userRating: backlogEntry.userRating,
		isPublic: backlogEntry.isPublic,
		notes: backlogEntry.notes,
		createdAt: backlogEntry.createdAt,
		game: gameSerializer(backlogEntry.Game),
		platform: platformSerializer(backlogEntry.Platform)
	};
}

function gameSerializer(game: Game) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc
	};
}

function platformSerializer(platform: Platform) {
	return {
		id: platform.id,
		name: platform.name,
		code: platform.code,
		abbreviation: platform.abbreviation
	};
}
