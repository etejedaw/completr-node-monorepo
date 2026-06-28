import { Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import * as gameTimeServiceError from "./errors/game-times.service-error";
import { GameTime, TimeSource } from "./game-time.model";

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
		rethrowSequelizeError(error, {
			unique: gameTimeServiceError.uniqueConstraintError
		});
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

export async function findTimesByGameIdsAndSource(
	gameIds: string[],
	source: TimeSource
) {
	if (gameIds.length === 0) return [];
	return GameTime.findAll({ where: { gameId: gameIds, source } });
}

export async function upsertTime(
	gameId: string,
	source: TimeSource,
	duration: number
) {
	return GameTime.upsert(
		{ gameId, source, duration },
		{ conflictFields: ["gameId", "source"] }
	);
}

export async function deleteGameTime(gameId: string, source: TimeSource) {
	const existing = await GameTime.findOne({ where: { gameId, source } });
	if (!existing) throw gameTimeServiceError.notFoundError();

	await existing.destroy();
}
