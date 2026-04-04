import { Genre } from "../genres/genres.model";
import { Platform } from "../platforms/platform.model";
import { Game } from "./game.model";

export function gameSerializer(game: Game) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		description: game.description,
		releaseAt: game.releaseAt,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc,
		parentGameId: game.parentGameId,
		updatedAt: game.updatedAt,
		platforms: game.Platforms.map(platformSerializer),
		genres: game.Genres.map(genreSerializer)
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

function genreSerializer(genre: Genre) {
	return {
		id: genre.id,
		name: genre.name,
		code: genre.code
	};
}
