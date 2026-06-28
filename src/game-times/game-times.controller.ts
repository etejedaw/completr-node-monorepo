import { type Request, type Response } from "express";

import { type RegisterGameTimeDto } from "./dtos/register-game-time.dto";
import { type UpdateGameTimeDto } from "./dtos/update-game-time.dto";
import * as gameTimesService from "./game-times.service";
import { type GameTimeIdParams } from "./schemas/game-time-id-params.schema";
import { type GameTimeParams } from "./schemas/game-time-params.schema";

export async function postGameTime(request: Request, response: Response) {
	const registerGameTimeDto = request.locals.body as RegisterGameTimeDto;

	const gameTime = await gameTimesService.createGameTime(
		registerGameTimeDto.gameId,
		registerGameTimeDto.source,
		registerGameTimeDto.duration
	);
	const data = { gameTime: gameTime.get({ plain: true }) };
	return response.status(201).json({ data });
}

export async function patchGameTime(request: Request, response: Response) {
	const params = request.locals.params as GameTimeIdParams;
	const updateGameTimeDto = request.locals.body as UpdateGameTimeDto;

	const gameTime = await gameTimesService.updateGameTime(
		params.gameId,
		params.source,
		updateGameTimeDto.duration
	);
	const data = { gameTime: gameTime.get({ plain: true }) };
	return response.status(200).json({ data });
}

export async function getGameTimes(request: Request, response: Response) {
	const params = request.locals.params as GameTimeParams;

	const times = await gameTimesService.findTimesByGameId(params.gameId);
	const data = {
		gameTimes: times.map(time => time.get({ plain: true }))
	};
	return response.status(200).json({ data });
}

export async function deleteGameTime(request: Request, response: Response) {
	const params = request.locals.params as GameTimeIdParams;

	await gameTimesService.deleteGameTime(params.gameId, params.source);

	return response.sendStatus(204);
}
