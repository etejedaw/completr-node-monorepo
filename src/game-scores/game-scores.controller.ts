import { Request, Response } from "express";
import * as gameScoresService from "./game-scores.service";
import { RegisterGameScoreDto } from "./dtos/register-game-score.dto";
import { UpdateGameScoreDto } from "./dtos/update-game-score.dto";
import { GameScoreParams } from "./schemas/game-score-params.schema";
import { GameScoreIdParams } from "./schemas/game-score-id-params.schema";

export async function postGameScore(request: Request, response: Response) {
	const registerGameScoreDto = request.locals.body as RegisterGameScoreDto;

	const gameScore = await gameScoresService.createGameScore(
		registerGameScoreDto.gameId,
		registerGameScoreDto.source,
		registerGameScoreDto.score
	);
	const gameScorePlain = gameScore.get({ plain: true });

	const data = { gameScore: gameScorePlain };
	return response.status(201).json({ data });
}

export async function patchGameScore(request: Request, response: Response) {
	const params = request.locals.params as GameScoreIdParams;
	const updateGameScoreDto = request.locals.body as UpdateGameScoreDto;

	const gameScore = await gameScoresService.updateGameScore(
		params.gameId,
		params.source,
		updateGameScoreDto.score
	);
	const gameScorePlain = gameScore.get({ plain: true });

	const data = { gameScore: gameScorePlain };
	return response.status(200).json({ data });
}

export async function getGameScores(request: Request, response: Response) {
	const params = request.locals.params as GameScoreParams;

	const scores = await gameScoresService.findScoresByGameId(params.gameId);
	const scoresPlain = scores.map(score => score.get({ plain: true }));

	const data = { gameScores: scoresPlain };
	return response.status(200).json({ data });
}

export async function deleteGameScore(request: Request, response: Response) {
	const params = request.locals.params as GameScoreIdParams;

	await gameScoresService.deleteGameScore(params.gameId, params.source);

	return response.sendStatus(204);
}
