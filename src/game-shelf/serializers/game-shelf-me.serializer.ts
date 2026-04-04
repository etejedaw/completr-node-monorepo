import { Game } from "../../games/game.model";
import { Platform } from "../../platforms/platform.model";
import { GameShelf } from "../game-shelf.model";

export function gameShelfMeSerializer(gameShelf: GameShelf) {
	return {
		id: gameShelf.id,
		userId: gameShelf.userId,
		acquiredAt: gameShelf.acquiredAt,
		edition: gameShelf.edition,
		notes: gameShelf.notes,
		isPublic: gameShelf.isPublic,
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
		isDlc: game.isDlc,
		genres:
			game.Genres?.map(g => ({ id: g.id, name: g.name, code: g.code })) ??
			[]
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
