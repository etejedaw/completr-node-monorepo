import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { canView } from "../users/helpers/visibility.helper";
import { type UsernameParam } from "../users/schemas/username-params.schema";
import * as usersService from "../users/users.service";
import { favoriteSerializer } from "./favorites.serializer";
import * as favoritesService from "./favorites.service";
import { type ReplaceFavoritesBody } from "./schemas/replace-favorites.schema";

export async function putFavorites(request: Request, response: Response) {
	const body = request.locals.body as ReplaceFavoritesBody;
	const user = request.locals.user as RequestUser;

	const currentIds = new Set(
		(await favoritesService.findFavoritesByUserId(user.id)).map(
			e => e.gameId
		)
	);

	const entries = await favoritesService.replaceFavorites(user, body.gameIds);
	const entriesPlain = entries.map(e => e.get({ plain: true }));

	for (const gameId of body.gameIds) {
		if (!currentIds.has(gameId)) {
			activityService.record(user.id, "favorite_added", gameId);
		}
	}

	const tagsByGame = await moodTagsService.findTagsForGames(
		user.id,
		entriesPlain.map(e => e.gameId)
	);

	const data = {
		favorites: entriesPlain.map(e =>
			favoriteSerializer(e, tagsByGame.get(e.gameId))
		)
	};
	return response.status(200).json({ data });
}

export async function getMeFavorites(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { rows, total } =
		await favoritesService.findFavoritesByUserIdPaginated(user.id, query);
	const entriesPlain = rows.map(e => e.get({ plain: true }));
	const tagsByGame = await moodTagsService.findTagsForGames(
		user.id,
		entriesPlain.map(e => e.gameId)
	);

	const data = {
		favorites: entriesPlain.map(e =>
			favoriteSerializer(e, tagsByGame.get(e.gameId))
		),
		total
	};
	return response.status(200).json({ data });
}

export async function getUserFavorites(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;

	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomainError.userPrivate();
	if (!(await canView(currentUser?.id, user, "favorite")))
		throw userDomainError.userPrivate();

	const { rows, total } =
		await favoritesService.findFavoritesByUserIdPaginated(user.id, query);
	const entriesPlain = rows.map(e => e.get({ plain: true }));
	const currentUserId = currentUser?.id;
	const tagsByGame =
		currentUserId === user.id
			? await moodTagsService.findTagsForGames(
					user.id,
					entriesPlain.map(e => e.gameId)
				)
			: new Map<string, string[]>();

	const data = {
		favorites: entriesPlain.map(e =>
			favoriteSerializer(e, tagsByGame.get(e.gameId))
		),
		total
	};
	return response.status(200).json({ data });
}
