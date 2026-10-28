import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import * as gamesService from "../games/games.service";
import * as gameTimeServiceError from "./errors/game-times.service-error";
import { GameTime, TIME_SOURCES_API, type TimeSource } from "./game-time.model";

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

export async function createGameTimes(
	rows: { gameId: string; source: TimeSource; duration: number }[],
	transaction?: Transaction
) {
	if (rows.length === 0) return [];
	try {
		return await GameTime.bulkCreate(rows, {
			validate: true,
			transaction
		});
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

export async function findTimesByGameIdAndSources(
	gameId: string,
	sources: TimeSource[]
) {
	if (sources.length === 0) return [];
	return GameTime.findAll({ where: { gameId, source: sources } });
}

export async function upsertTime(
	gameId: string,
	source: TimeSource,
	duration: number,
	transaction?: Transaction
) {
	return GameTime.upsert(
		{ gameId, source, duration },
		{ conflictFields: ["gameId", "source"], transaction }
	);
}

export async function replaceGameTimes(
	gameId: string,
	times: { source: TimeSource; duration: number }[]
) {
	const sources = times.map(entry => entry.source);
	try {
		return await sequelize.transaction(async transaction => {
			await assertGameExists(gameId, transaction);

			await GameTime.destroy({
				where: {
					gameId,
					source: {
						[Op.in]: TIME_SOURCES_API.filter(
							source => !sources.includes(source)
						)
					}
				},
				transaction
			});
			for (const entry of times)
				await upsertTime(
					gameId,
					entry.source,
					entry.duration,
					transaction
				);

			return GameTime.findAll({
				where: { gameId, source: { [Op.in]: TIME_SOURCES_API } },
				order: [
					["source", "ASC"],
					["id", "ASC"]
				],
				transaction
			});
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameTimeServiceError.uniqueConstraintError
		});
	}
}

async function assertGameExists(gameId: string, transaction: Transaction) {
	if (!(await gamesService.existsGameById(gameId, transaction)))
		throw gameTimeServiceError.gameNotFoundError(gameId);
}

export async function deleteGameTime(gameId: string, source: TimeSource) {
	const existing = await GameTime.findOne({ where: { gameId, source } });
	if (!existing) throw gameTimeServiceError.notFoundError();

	await existing.destroy();
}
