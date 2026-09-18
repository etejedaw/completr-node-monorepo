import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { canView } from "../users/helpers/visibility.helper";
import { type UsernameParam } from "../users/schemas/username-params.schema";
import * as usersService from "../users/users.service";
import { type RegisterGameShelfDto } from "./dtos/register-game-shelf.dto";
import { type UpdateGameShelfDto } from "./dtos/update-game-shelf.dto";
import * as gameShelfService from "./game-shelf.service";
import { type GameShelfIdParam } from "./schemas/game-shelf-id-params.schema";
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

	activityService.record(user.id, "shelf_added", registerGameShelfDto.gameId);

	const data = { gameShelf: gameShelfPlain };
	return response.status(201).json({ data });
}

export async function getMeGameShelf(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { rows, total } =
		await gameShelfService.findGameShelfByUserIdPaginated(user.id, query);
	const gameShelfPlain = rows.map(game => game.get({ plain: true }));
	const gameIds = gameShelfPlain.map(e => e.gameId);
	const [tagsByGame, backlogGameIds] = await Promise.all([
		moodTagsService.findTagsForGames(user.id, gameIds),
		backlogService.findGameIdsInBacklogByUser(user.id, gameIds)
	]);
	const inBacklogIds = new Set(backlogGameIds);

	const data = {
		gameShelf: gameShelfPlain.map(e =>
			gameShelfMeSerializer(
				e,
				tagsByGame.get(e.gameId),
				inBacklogIds.has(e.gameId)
			)
		),
		total
	};
	return response.status(200).json({ data });
}

export async function getUserGameShelf(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const { username } = params;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomainError.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;
	const isSelf = currentUser?.id === user.id;

	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomainError.userPrivate();
	if (!(await canView(currentUser?.id, user, "shelf")))
		throw userDomainError.userPrivate();

	const { rows, total } = isSelf
		? await gameShelfService.findGameShelfByUserIdPaginated(user.id, query)
		: await gameShelfService.findPublicGameShelfByUserId(user.id, query);
	const gameShelfPlain = rows.map(item => item.get({ plain: true }));
	const tagsByGame = isSelf
		? await moodTagsService.findTagsForGames(
				user.id,
				gameShelfPlain.map(e => e.gameId)
			)
		: new Map<string, string[]>();

	const data = {
		gameShelf: gameShelfPlain.map(e =>
			gameShelfSerializer(e, tagsByGame.get(e.gameId))
		),
		total
	};
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
