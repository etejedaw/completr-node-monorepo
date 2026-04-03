import { Request, Response } from "express";
import { RegisterGameShelfDto } from "./dtos/register-game-shelf.dto";
import * as gameShelfService from "./game-shelf.service";
import { CustomRequest } from "../common/interfaces/custom-request.interface";
import { UpdateGameShelfDto } from "./dtos/update-game-shelf.dto";
import { GameShelfIdParam } from "./schemas/game-shelf-id-params.schema";
import { gameShelfMeSerializer, gameShelfSerializerTiny } from "./serializers";

export async function postGameShelf(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const registerGameShelfDto = request.body as RegisterGameShelfDto;

	const userId = customRequest.user.id;

	const gameShelfRegister = await gameShelfService.registerGameShelf(
		userId,
		registerGameShelfDto
	);
	const gameShelfPlain = gameShelfRegister.get({ plain: true });

	const data = { gameShelf: gameShelfPlain };
	return response.status(201).json({ data });
}

export async function getMeGameShelf(request: Request, response: Response) {
	const customRequest = request as CustomRequest;

	const userId = customRequest.user.id;

	const gameShelf = await gameShelfService.findGameShelfByUserId(userId);
	const gameShelfPlain = gameShelf.map(game => game.get({ plain: true }));

	const data = { gameShelf: gameShelfPlain.map(gameShelfMeSerializer) };
	return response.status(200).json({ data });
}

export async function getUserGameShelf(_request: Request, _response: Response) {
	// TODO
}

export async function patchGameShelf(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const updateGameShelfDto = request.body as UpdateGameShelfDto;
	const params = customRequest.params as GameShelfIdParam;

	const gameShelfId = params.gameShelfId;
	const userId = customRequest.user.id;

	const gameShelfUpdate = await gameShelfService.updateGameShelf(
		gameShelfId,
		userId,
		updateGameShelfDto
	);

	const gameShelfPlain = gameShelfUpdate.get({ plain: true });

	const data = { gameShelf: gameShelfSerializerTiny(gameShelfPlain) };
	return response.status(200).json({ data });
}

export async function deleteGameShelf(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const params = customRequest.params as GameShelfIdParam;

	const gameShelfId = params.gameShelfId;
	const userId = customRequest.user.id;

	await gameShelfService.removeGameShelf(gameShelfId, userId);

	return response.sendStatus(204);
}
