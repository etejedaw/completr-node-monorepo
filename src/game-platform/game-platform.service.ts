import { Transaction } from "sequelize";

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

export async function replaceGamePlatforms(
	gameId: string,
	platformsId: string[]
) {
	await GamePlatform.destroy({ where: { gameId } });
	if (!platformsId.length) return;

	return await linkGameToPlatforms(gameId, platformsId);
}
