import { Game } from "../../games/game.model";
import { Platform } from "../../platforms/platform.model";
import { User } from "../../users";
import { GameShelf } from "../game-shelf.model";

export function gameShelfSerializer(gameShelf: GameShelf) {
	return {
		id: gameShelf.id,
		acquiredAt: gameShelf.acquiredAt,
		edition: gameShelf.edition,
		notes: gameShelf.notes,
		isPublic: gameShelf.isPublic,
		user: userSerializer(gameShelf.User),
		game: gameSerializer(gameShelf.Game),
		platform: platformSerializer(gameShelf.Platform)
	};
}

function userSerializer(user: User) {
	return {
		id: user.id,
		username: user.username,
		name: user.name,
		bio: user.bio,
		avatarUrl: user.avatarUrl
	};
}

function gameSerializer(game: Game) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		releaseAt: game.releaseAt,
		coverUrl: game.coverUrl
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
