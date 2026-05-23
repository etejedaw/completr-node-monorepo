import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { Queue } from "./queue.model";

export function queueSerializer(entry: Queue) {
	return {
		id: entry.id,
		position: entry.position,
		backlog: backlogSerializer(entry.Backlog)
	};
}

function backlogSerializer(backlog: Queue["Backlog"]) {
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

function gameSerializer(game: Queue["Backlog"]["Game"]) {
	if (!game) return undefined;
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc
	};
}

function platformSerializer(platform: Queue["Backlog"]["Platform"]) {
	if (!platform) return undefined;
	return {
		id: platform.id,
		abbreviation: platform.abbreviation
	};
}
