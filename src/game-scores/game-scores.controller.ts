import { Request, Response } from "express";
import * as gameScoresService from "./game-scores.service";
import { RegisterGameScoreDto } from "./dtos/register-game-score.dto";
import { GameScoreParams } from "./schemas/game-score-params.schema";

export async function postGameScore(request: Request, response: Response) {
	const registerGameScoreDto = request.body as RegisterGameScoreDto;

	const gameScore = await gameScoresService.upsertGameScore(
		registerGameScoreDto.gameId,
		registerGameScoreDto.source,
		registerGameScoreDto.score
	);
	const data = { gameScore: gameScore.get({ plain: true }) };
	return response.status(201).json({ data });
}

export async function getGameScores(request: Request, response: Response) {
	const params = request.params as GameScoreParams;

	const scores = await gameScoresService.findScoresByGameId(params.gameId);
	const data = {
		gameScores: scores.map(s => s.get({ plain: true }))
	};
	return response.status(200).json({ data });
}
