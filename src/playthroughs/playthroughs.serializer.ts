import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Playthrough } from "./playthrough.model";

export function playthroughSerializer(playthrough: Playthrough) {
	return {
		id: playthrough.id,
		status: playthrough.status,
		startedAt: playthrough.startedAt,
		finishedAt: playthrough.finishedAt,
		realDuration: playthrough.realDuration,
		userRating: playthrough.userRating,
		isPublic: playthrough.isPublic,
		notes: playthrough.notes,
		createdAt: playthrough.createdAt,
		game: gameSerializer(playthrough.Game),
		platform: platformSerializer(playthrough.Platform)
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
