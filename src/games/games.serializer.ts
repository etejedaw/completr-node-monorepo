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
		averageScore: game.averageScore,
		averagePlaytime: game.averagePlaytime,
		updatedAt: game.updatedAt,
		platforms: game.Platforms.map(platformSerializer)
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
