import { Request, Response } from "express";
import { RegisterGameShelfDto } from "./dtos/register-game-shelf.dto";
import * as gameShelfService from "./game-shelf.service";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { CustomRequest } from "../common/interfaces/custom-request.interface";
import { UpdateGameShelfDto } from "./dtos/update-game-shelf.dto";
import { GameShelfIdParam } from "./schemas/game-shelf-id-params.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import {
	gameShelfMeSerializer,
	gameShelfSerializer,
	gameShelfSerializerTiny
} from "./serializers";

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

export async function getUserGameShelf(request: Request, response: Response) {
	const params = request.params as UsernameParam;
	const { username } = params;

	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomainError.userNotFound();
	if (!user.isPublic) throw userDomainError.userPrivate();

	const gameShelf = await gameShelfService.findPublicGameShelfByUserId(
		user.id
	);
	const gameShelfPlain = gameShelf.map(item => item.get({ plain: true }));

	const data = { gameShelf: gameShelfPlain.map(gameShelfSerializer) };
	return response.status(200).json({ data });
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
