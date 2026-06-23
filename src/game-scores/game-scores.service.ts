import { Transaction } from "sequelize";
import { GameScore } from "./game-score.model";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import * as gameScoreServiceError from "./errors/game-scores.service-error";

export async function createGameScore(
	gameId: string,
	source: string,
	score: number,
	transaction?: Transaction
) {
	try {
		return await GameScore.create(
			{ gameId, source, score },
			{ transaction }
		);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameScoreServiceError.uniqueConstraintError
		});
	}
}

export async function updateGameScore(
	gameId: string,
	source: string,
	score: number
) {
	const existing = await GameScore.findOne({
		where: { gameId, source }
	});
	if (!existing) throw gameScoreServiceError.notFoundError();

	await existing.update({ score });
	return existing;
}

export async function findScoresByGameId(gameId: string) {
	return GameScore.findAll({ where: { gameId } });
}

export async function findScoresByGameIdsAndSource(
	gameIds: string[],
	source: string
) {
	if (gameIds.length === 0) return [];
	return GameScore.findAll({ where: { gameId: gameIds, source } });
}

export async function deleteGameScore(gameId: string, source: string) {
	const existing = await GameScore.findOne({ where: { gameId, source } });
	if (!existing) throw gameScoreServiceError.notFoundError();

	await existing.destroy();
}
