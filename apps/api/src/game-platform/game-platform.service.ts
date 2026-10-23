import { type Transaction } from "sequelize";

import { GamePlatform } from "./game-platform.model";

export async function linkGameToPlatforms(
	gameId: string,
	platformsId: string[],
	transaction?: Transaction
) {
	const gamePlatforms = platformsId.map(platformId => ({
		gameId,
		platformId
	}));
	return GamePlatform.bulkCreate(gamePlatforms, {
		ignoreDuplicates: true,
		transaction
	});
}

export async function linkGamesToPlatforms(
	gameIds: string[],
	platformsId: string[],
	transaction?: Transaction
) {
	const gamePlatforms = gameIds.flatMap(gameId =>
		platformsId.map(platformId => ({ gameId, platformId }))
	);
	if (gamePlatforms.length === 0) return [];
	return GamePlatform.bulkCreate(gamePlatforms, {
		ignoreDuplicates: true,
		transaction
	});
}

export async function replaceGamePlatforms(
	gameId: string,
	platformsId: string[],
	transaction?: Transaction
) {
	await GamePlatform.destroy({ where: { gameId }, transaction });
	if (!platformsId.length) return;

	return await linkGameToPlatforms(gameId, platformsId, transaction);
}
