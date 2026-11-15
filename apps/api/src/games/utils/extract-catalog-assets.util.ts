import { type Game } from "../game.model";
import { type CatalogAssets } from "../games.interface";

export function extractCatalogAssets(game: Game): CatalogAssets {
	return {
		platformIds: game.Platforms?.map(platform => platform.id) ?? [],
		genreIds: game.Genres?.map(genre => genre.id) ?? [],
		scores:
			game.GameScores?.map(score => ({
				source: score.source,
				score: score.score
			})) ?? [],
		times:
			game.GameTimes?.map(time => ({
				source: time.source,
				duration: time.duration
			})) ?? []
	};
}
