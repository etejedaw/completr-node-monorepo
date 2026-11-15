import { type Transaction } from "sequelize";

import { GamePlatform } from "./game-platform.model";

export async function linkGameToPlatforms(
	gameId: string,
	platformIds: string[],
	transaction?: Transaction
) {
	return linkGamesToPlatforms([gameId], platformIds, transaction);
}

export async function linkGamesToPlatforms(
	gameIds: string[],
	platformIds: string[],
	transaction?: Transaction
) {
	const gamePlatforms = gameIds.flatMap(gameId =>
		platformIds.map(platformId => ({ gameId, platformId }))
	);
	if (gamePlatforms.length === 0) return [];
	return GamePlatform.bulkCreate(gamePlatforms, {
		ignoreDuplicates: true,
		transaction
	});
}

export async function replaceGamePlatforms(
	gameId: string,
	platformIds: string[],
	transaction?: Transaction
) {
	await GamePlatform.destroy({ where: { gameId }, transaction });
	if (!platformIds.length) return;

	return linkGameToPlatforms(gameId, platformIds, transaction);
}
