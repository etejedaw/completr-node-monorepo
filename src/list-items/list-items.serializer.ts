import { Game } from "../games/game.model";
import { ListItem } from "./list-item.model";

export function listItemSerializer(item: ListItem) {
	return {
		id: item.id,
		position: item.position,
		score: item.score,
		duration: item.duration,
		ratio: calculateRatio(item.score, item.duration),
		game: gameSerializer(item.Game)
	};
}

function calculateRatio(score?: number, duration?: number) {
	if (!score || !duration) return undefined;
	return Math.round((score / duration) * 100) / 100;
}

function gameSerializer(game: Game) {
	if (!game) return;
	return {
		id: game.id,
		title: game.title,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc
	};
}
