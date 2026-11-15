import { type Transaction } from "sequelize";

import * as gameGenresService from "../../game-genre/game-genre.service";
import * as gamePlatformsService from "../../game-platform/game-platform.service";
import * as gameScoresService from "../../game-scores/game-scores.service";
import * as gameTimesService from "../../game-times/game-times.service";
import { type CatalogAssets } from "../games.interface";

export async function cloneCatalogAssetsToGames(
	gameIds: string[],
	assets: CatalogAssets,
	transaction: Transaction
) {
	await gamePlatformsService.linkGamesToPlatforms(
		gameIds,
		assets.platformIds,
		transaction
	);
	await gameGenresService.linkGamesToGenres(
		gameIds,
		assets.genreIds,
		transaction
	);
	await gameScoresService.createGameScores(
		gameIds.flatMap(gameId =>
			assets.scores.map(score => ({ gameId, ...score }))
		),
		transaction
	);
	await gameTimesService.createGameTimes(
		gameIds.flatMap(gameId =>
			assets.times.map(time => ({ gameId, ...time }))
		),
		transaction
	);
}
