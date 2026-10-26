import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import * as userDomainError from "../users/errors/users.domain-error";
import { canView } from "../users/helpers/visibility.helper";
import { type UsernameParam } from "../users/schemas/username-params.schema";
import * as usersService from "../users/users.service";
import {
	gamePlatinumSerializer,
	platinumEntrySerializer
} from "./game-platinum.serializer";
import * as gamePlatinumService from "./game-platinum.service";
import { type GamePlatinumParams } from "./schemas/game-platinum-params.schema";
import { type UpsertGamePlatinumDto } from "./upsert-game-platinum.dto";

export async function putPlatinum(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GamePlatinumParams;
	const body = request.locals.body as UpsertGamePlatinumDto;

	const { platinum, created } = await gamePlatinumService.upsertPlatinum(
		user.id,
		params.gameId,
		body
	);
	if (created)
		activityService.record(user.id, "game_platinumed", params.gameId);

	const data = { platinum: gamePlatinumSerializer(platinum) };
	return response.status(created ? 201 : 200).json({ data });
}

export async function deletePlatinum(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GamePlatinumParams;

	await gamePlatinumService.removePlatinum(user.id, params.gameId);
	return response.sendStatus(204);
}

export async function getUserPlatinums(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = (request.locals.query ?? {}) as PaginatedSearchQuery;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;

	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomainError.userPrivate();
	if (!(await canView(currentUser?.id, user, "platinum")))
		throw userDomainError.userPrivate();

	const isOwner = currentUser?.id === user.id;
	const { rows, total } =
		await gamePlatinumService.findPlatinumsByUserIdPaginated(
			user.id,
			query
		);

	const data = {
		platinums: rows.map(platinum =>
			platinumEntrySerializer(platinum, isOwner)
		),
		total
	};
	return response.status(200).json({ data });
}
