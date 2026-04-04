import { UniqueConstraintError } from "sequelize";
import { GameScore, ScoreSource } from "./game-score.model";
import * as gameScoreServiceError from "./errors/game-scores.service-error";

export async function createGameScore(
	gameId: string,
	source: ScoreSource,
	score: number
) {
	try {
		return await GameScore.create({ gameId, source, score });
	} catch (error) {
		if (error instanceof UniqueConstraintError)
			throw gameScoreServiceError.uniqueConstraintError(error);
		throw error;
	}
}

export async function updateGameScore(
	gameId: string,
	source: ScoreSource,
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
