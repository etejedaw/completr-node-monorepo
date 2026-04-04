import { Request, Response } from "express";
import * as gameScoresService from "./game-scores.service";
import { ScoreSource } from "./game-score.model";

export async function postGameScore(request: Request, response: Response) {
	const { gameId, source, score } = request.body as {
		gameId: string;
		source: ScoreSource;
		score: number;
	};

	const gameScore = await gameScoresService.upsertGameScore(
		gameId,
		source,
		score
	);
	const data = { gameScore: gameScore.get({ plain: true }) };
	return response.status(201).json({ data });
}

export async function getGameScores(request: Request, response: Response) {
	const { gameId } = request.params as { gameId: string };

	const scores = await gameScoresService.findScoresByGameId(gameId);
	const data = {
		gameScores: scores.map(s => s.get({ plain: true }))
	};
	return response.status(200).json({ data });
}
