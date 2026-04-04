import { Game } from "../../games/game.model";
import { Platform } from "../../platforms/platform.model";
import { GameShelf } from "../game-shelf.model";

export function gameShelfMeSerializer(gameShelf: GameShelf) {
	const ratio =
		gameShelf.score && gameShelf.duration
			? gameShelf.score / gameShelf.duration
			: null;

	return {
		id: gameShelf.id,
		userId: gameShelf.userId,
		acquiredAt: gameShelf.acquiredAt,
		edition: gameShelf.edition,
		notes: gameShelf.notes,
		isPublic: gameShelf.isPublic,
		score: gameShelf.score,
		duration: gameShelf.duration,
		scoreSource: gameShelf.scoreSource,
		durationSource: gameShelf.durationSource,
		ratio,
		game: gameSerializer(gameShelf.Game),
		platform: platformSerializer(gameShelf.Platform)
	};
}

function gameSerializer(game: Game) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		description: game.description,
		releaseAt: game.releaseAt,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc
	};
}

function platformSerializer(platform: Platform) {
	return {
		id: platform.id,
		name: platform.name,
		code: platform.code,
		generation: platform.generation,
		logoUrl: platform.logoUrl,
		releaseAt: platform.releaseAt
	};
}
