import { type Game } from "../../games/game.model";
import { type Platform } from "../../platforms/platform.model";
import { type GameShelf } from "../game-shelf.model";

export function gameShelfMeSerializer(
	gameShelf: GameShelf,
	moodTags?: string[]
) {
	return {
		id: gameShelf.id,
		userId: gameShelf.userId,
		acquiredAt: gameShelf.acquiredAt,
		edition: gameShelf.edition,
		notes: gameShelf.notes,
		isPublic: gameShelf.isPublic,
		moodTags: moodTags ?? [],
		game: gameSerializer(gameShelf.Game),
		platform: platformSerializer(gameShelf.Platform)
	};
}

function gameSerializer(game: Game) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc
	};
}

function platformSerializer(platform: Platform) {
	return {
		id: platform.id,
		name: platform.name,
		code: platform.code,
		abbreviation: platform.abbreviation,
		generation: platform.generation,
		logoUrl: platform.logoUrl,
		releaseAt: platform.releaseAt
	};
}
