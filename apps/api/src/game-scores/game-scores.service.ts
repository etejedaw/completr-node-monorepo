import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import { COMPLETR_SCORE_SOURCE } from "../score-sources/score-source.constants";
import * as scoreSourcesService from "../score-sources/score-sources.service";
import * as gameScoreServiceError from "./errors/game-scores.service-error";
import { GameScore } from "./game-score.model";

export async function createGameScore(
	gameId: string,
	source: string,
	score: number,
	transaction?: Transaction
) {
	await assertScoreWithinSourceScale(source, score);
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

	await assertScoreWithinSourceScale(source, score);
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

export async function upsertScore(
	gameId: string,
	source: string,
	score: number,
	transaction?: Transaction
) {
	return GameScore.upsert(
		{ gameId, source, score },
		{ conflictFields: ["gameId", "source"], transaction }
	);
}

export async function replaceGameScores(
	gameId: string,
	scores: { source: string; score: number }[]
) {
	const sources = scores.map(entry => entry.source);
	try {
		return await sequelize.transaction(async transaction => {
			await assertGameExists(gameId, transaction);
			for (const entry of scores)
				await assertScoreWithinSourceScale(entry.source, entry.score);

			await GameScore.destroy({
				where: {
					gameId,
					source: {
						[Op.notIn]: [...sources, COMPLETR_SCORE_SOURCE]
					}
				},
				transaction
			});
			for (const entry of scores)
				await upsertScore(
					gameId,
					entry.source,
					entry.score,
					transaction
				);

			return GameScore.findAll({
				where: { gameId, source: { [Op.ne]: COMPLETR_SCORE_SOURCE } },
				order: [["source", "ASC"]],
				transaction
			});
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameScoreServiceError.uniqueConstraintError
		});
	}
}

export async function deleteGameScore(gameId: string, source: string) {
	const existing = await GameScore.findOne({ where: { gameId, source } });
	if (!existing) throw gameScoreServiceError.notFoundError();

	await existing.destroy();
}

async function assertGameExists(gameId: string, transaction: Transaction) {
	if ((await Game.count({ where: { id: gameId }, transaction })) === 0)
		throw gameScoreServiceError.gameNotFoundError(gameId);
}

async function assertScoreWithinSourceScale(source: string, score: number) {
	const scoreSource = await scoreSourcesService.findByCode(source);
	if (!scoreSource) throw gameScoreServiceError.unknownSourceError(source);
	if (score > scoreSource.scale)
		throw gameScoreServiceError.scoreOutOfRangeError(
			source,
			score,
			scoreSource.scale
		);
}
