import { Request, Response } from "express";
import { RegisterGameDto } from "./dtos/register-game.dto";
import * as gameService from "./games.service";
import * as gameDomainError from "./errors/games.domain-error";
import { GameCodeParam } from "./schemas/game-code-params.schema";

export async function getGameByCode(request: Request, response: Response) {
	const params = request.params as GameCodeParam;

	const { code } = params;

	const game = await gameService.findGameByCode(code);
	if (!game) throw gameDomainError.gameNotFound();

	const gamePlain = game.get({ plain: true });

	const data = { game: gamePlain };
	return response.status(200).json(data);
}

export async function postGame(request: Request, response: Response) {
	const registerGameDto = request.body as RegisterGameDto;

	const gameRegister = await gameService.registerGame(registerGameDto);

	const gamePlain = gameRegister.get({ plain: true });

	const data = { game: gamePlain };
	return response.status(201).json(data);
}
