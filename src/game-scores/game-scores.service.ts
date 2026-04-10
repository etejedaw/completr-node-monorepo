import { Transaction, UniqueConstraintError } from "sequelize";
import { GameScore } from "./game-score.model";
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
		if (error instanceof UniqueConstraintError)
			throw gameScoreServiceError.uniqueConstraintError(error);
		throw error;
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
