import { Request, Response } from "express";
import * as gameScoresService from "./game-scores.service";
import { RegisterGameScoreDto } from "./dtos/register-game-score.dto";
import { UpdateGameScoreDto } from "./dtos/update-game-score.dto";
import { GameScoreParams } from "./schemas/game-score-params.schema";
import { GameScoreIdParams } from "./schemas/game-score-id-params.schema";

export async function postGameScore(request: Request, response: Response) {
	const registerGameScoreDto = request.body as RegisterGameScoreDto;

	const gameScore = await gameScoresService.createGameScore(
		registerGameScoreDto.gameId,
		registerGameScoreDto.source,
		registerGameScoreDto.score
	);
	const data = { gameScore: gameScore.get({ plain: true }) };
	return response.status(201).json({ data });
}

export async function patchGameScore(request: Request, response: Response) {
	const params = request.params as GameScoreIdParams;
	const updateGameScoreDto = request.body as UpdateGameScoreDto;

	const gameScore = await gameScoresService.updateGameScore(
		params.gameId,
		params.source,
		updateGameScoreDto.score
	);
	const data = { gameScore: gameScore.get({ plain: true }) };
	return response.status(200).json({ data });
}

export async function getGameScores(request: Request, response: Response) {
	const params = request.params as GameScoreParams;

	const scores = await gameScoresService.findScoresByGameId(params.gameId);
	const data = {
		gameScores: scores.map(s => s.get({ plain: true }))
	};
	return response.status(200).json({ data });
}
