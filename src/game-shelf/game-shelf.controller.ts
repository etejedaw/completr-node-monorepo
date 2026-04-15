import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import { RegisterGameShelfDto } from "./dtos/register-game-shelf.dto";
import * as gameShelfService from "./game-shelf.service";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";

import { UpdateGameShelfDto } from "./dtos/update-game-shelf.dto";
import { GameShelfIdParam } from "./schemas/game-shelf-id-params.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import {
	gameShelfMeSerializer,
	gameShelfSerializer,
	gameShelfSerializerTiny
} from "./serializers";

export async function postGameShelf(request: Request, response: Response) {
	const registerGameShelfDto = request.locals.body as RegisterGameShelfDto;

	const user = request.locals.user as RequestUser;

	const gameShelfRegister = await gameShelfService.registerGameShelf(
		user.id,
		registerGameShelfDto
	);
	const gameShelfPlain = gameShelfRegister.get({ plain: true });

	const data = { gameShelf: gameShelfPlain };
	return response.status(201).json({ data });
}

export async function getMeGameShelf(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const gameShelf = await gameShelfService.findGameShelfByUserId(user.id);
	const gameShelfPlain = gameShelf.map(game => game.get({ plain: true }));

	const data = { gameShelf: gameShelfPlain.map(gameShelfMeSerializer) };
	return response.status(200).json({ data });
}

export async function getUserGameShelf(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const { username } = params;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomainError.userNotFound();
	if (!user.isPublic) throw userDomainError.userPrivate();

	const { rows, total } = await gameShelfService.findPublicGameShelfByUserId(
		user.id,
		query
	);
	const gameShelfPlain = rows.map(item => item.get({ plain: true }));

	const data = { gameShelf: gameShelfPlain.map(gameShelfSerializer), total };
	return response.status(200).json({ data });
}

export async function patchGameShelf(request: Request, response: Response) {
	const updateGameShelfDto = request.locals.body as UpdateGameShelfDto;
	const params = request.locals.params as GameShelfIdParam;

	const gameShelfId = params.gameShelfId;
	const user = request.locals.user as RequestUser;

	const gameShelfUpdate = await gameShelfService.updateGameShelf(
		gameShelfId,
		user.id,
		updateGameShelfDto
	);

	const gameShelfPlain = gameShelfUpdate.get({ plain: true });

	const data = { gameShelf: gameShelfSerializerTiny(gameShelfPlain) };
	return response.status(200).json({ data });
}

export async function deleteGameShelf(request: Request, response: Response) {
	const params = request.locals.params as GameShelfIdParam;

	const gameShelfId = params.gameShelfId;
	const user = request.locals.user as RequestUser;

	await gameShelfService.removeGameShelf(gameShelfId, user.id);

	return response.sendStatus(204);
}
