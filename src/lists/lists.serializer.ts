import { Game } from "../games/game.model";
import { ListItem } from "../list-items/list-item.model";
import { List } from "./list.model";

function calculateRatio(score?: number, duration?: number) {
	if (!score || !duration) return undefined;
	return Math.round((score / duration) * 100) / 100;
}

function listItemSerializer(item: ListItem) {
	return {
		id: item.id,
		position: item.position,
		score: item.score,
		duration: item.duration,
		ratio: calculateRatio(item.score, item.duration),
		game: item.Game ? gameSerializer(item.Game) : undefined
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

export function listSerializer(list: List) {
	return {
		id: list.id,
		name: list.name,
		slug: list.slug,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		basedOnId: list.basedOnId,
		isFork: list.isFork,
		items: (list as List & { ListItems?: ListItem[] }).ListItems?.map(
			listItemSerializer
		)
	};
}

export function listSummarySerializer(list: List) {
	return {
		id: list.id,
		name: list.name,
		slug: list.slug,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		basedOnId: list.basedOnId,
		isFork: list.isFork
	};
}
