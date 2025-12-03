import { Request, Response } from "express";
import { RegisterGameDto } from "./dtos/register-game.dto";
import * as gameService from "./games.service";
import * as gameDomainError from "./errors/games.domain-error";
import { GameCodeParam } from "./schemas/game-code-params.schema";
import { gameSerializer } from "./games.serializer";
import { GameIdParam } from "./schemas/game-id-params.schema";
import { UpdateGameDto } from "./dtos/update-game.dto";

export async function getGameByCode(request: Request, response: Response) {
	const params = request.params as GameCodeParam;

	const { code } = params;

	const game = await gameService.findGameByCode(code);
	if (!game) throw gameDomainError.gameNotFound();

	const gamePlain = game.get({ plain: true });

	const data = { game: gameSerializer(gamePlain) };
	return response.status(200).json({ data });
}

export async function postGame(request: Request, response: Response) {
	const registerGameDto = request.body as RegisterGameDto;

	const gameRegister = await gameService.registerGame(registerGameDto);

	const gamePlain = gameRegister.get({ plain: true });

	const data = { game: gameSerializer(gamePlain) };
	return response.status(201).json({ data });
}

export async function patchGame(request: Request, response: Response) {
	const params = request.params as GameIdParam;
	const updateGameDto = request.body as UpdateGameDto;

	const { id } = params;

	const game = await gameService.updateGame(id, updateGameDto);

	const gamePlain = game.get({ plain: true });

	const data = { game: gameSerializer(gamePlain) };
	return response.status(200).json({ data });
}

export async function deleteGame(request: Request, response: Response) {
	const gameIdParam = request.params as GameIdParam;

	const { id } = gameIdParam;

	await gameService.deactivateGame(id);
	return response.sendStatus(204);
}
