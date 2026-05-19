import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";
import * as favoritesService from "./favorites.service";
import { ReplaceFavoritesBody } from "./schemas/replace-favorites.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import { favoriteSerializer } from "./favorites.serializer";
import * as activityService from "../activity/activity.service";

export async function putFavorites(request: Request, response: Response) {
	const body = request.locals.body as ReplaceFavoritesBody;
	const user = request.locals.user as RequestUser;

	const currentIds = new Set(
		(await favoritesService.findFavoritesByUserId(user.id)).map(
			e => e.Game.id
		)
	);

	const entries = await favoritesService.replaceFavorites(user, body.gameIds);
	const entriesPlain = entries.map(e => e.get({ plain: true }));

	for (const gameId of body.gameIds) {
		if (!currentIds.has(gameId)) {
			activityService.record(user.id, "favorite_added", gameId);
		}
	}

	const data = { favorites: entriesPlain.map(favoriteSerializer) };
	return response.status(200).json({ data });
}

export async function getMeFavorites(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { rows, total } =
		await favoritesService.findFavoritesByUserIdPaginated(user.id, query);
	const entriesPlain = rows.map(e => e.get({ plain: true }));

	const data = { favorites: entriesPlain.map(favoriteSerializer), total };
	return response.status(200).json({ data });
}

export async function getUserFavorites(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();
	if (!user.isPublic) throw userDomainError.userPrivate();
	if (!user.isFavoritePublic) throw userDomainError.userPrivate();

	const { rows, total } =
		await favoritesService.findFavoritesByUserIdPaginated(user.id, query);
	const entriesPlain = rows.map(e => e.get({ plain: true }));

	const data = { favorites: entriesPlain.map(favoriteSerializer), total };
	return response.status(200).json({ data });
}
