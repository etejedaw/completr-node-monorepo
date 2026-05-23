import { Game } from "../games/game.model";
import { calculateRatio } from "../common/utils/calculate-ratio.util";
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

function gameSerializer(game: Game) {
	if (!game) return;
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc
	};
}
