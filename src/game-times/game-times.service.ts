import { Transaction, UniqueConstraintError } from "sequelize";
import { GameTime, TimeSource } from "./game-time.model";
import * as gameTimeServiceError from "./errors/game-times.service-error";

export async function createGameTime(
	gameId: string,
	source: TimeSource,
	duration: number,
	transaction?: Transaction
) {
	try {
		return await GameTime.create(
			{ gameId, source, duration },
			{ transaction }
		);
	} catch (error) {
		if (error instanceof UniqueConstraintError)
			throw gameTimeServiceError.uniqueConstraintError(error);
		throw error;
	}
}

export async function updateGameTime(
	gameId: string,
	source: TimeSource,
	duration: number
) {
	const existing = await GameTime.findOne({
		where: { gameId, source }
	});
	if (!existing) throw gameTimeServiceError.notFoundError();

	await existing.update({ duration });
	return existing;
}

export async function findTimesByGameId(gameId: string) {
	return GameTime.findAll({ where: { gameId } });
}
