import { Request, Response } from "express";
import * as gameTimesService from "./game-times.service";
import { RegisterGameTimeDto } from "./dtos/register-game-time.dto";
import { GameTimeParams } from "./schemas/game-time-params.schema";

export async function postGameTime(request: Request, response: Response) {
	const registerGameTimeDto = request.body as RegisterGameTimeDto;

	const gameTime = await gameTimesService.upsertGameTime(
		registerGameTimeDto.gameId,
		registerGameTimeDto.source,
		registerGameTimeDto.duration
	);
	const data = { gameTime: gameTime.get({ plain: true }) };
	return response.status(201).json({ data });
}

export async function getGameTimes(request: Request, response: Response) {
	const params = request.params as GameTimeParams;

	const times = await gameTimesService.findTimesByGameId(params.gameId);
	const data = {
		gameTimes: times.map(t => t.get({ plain: true }))
	};
	return response.status(200).json({ data });
}
