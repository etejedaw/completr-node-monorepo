import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import * as backlogService from "../backlog/backlog.service";
import { type ExportFormat } from "../common/interfaces/export-format.interface";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ExportSearchQuery } from "../common/schemas/export-search-query.schema";
import { sendExport } from "../common/utils/send-export.util";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { canView } from "../users/helpers/visibility.helper";
import { type UsernameParam } from "../users/schemas/username-params.schema";
import * as usersService from "../users/users.service";
import { type ReplaceFavoritesDto } from "./dtos/replace-favorites.dto";
import {
	FAVORITES_EXPORT_COLUMNS,
	favoriteToExportRow
} from "./favorites.export-row.mapper";
import { favoriteSerializer } from "./favorites.serializer";
import * as favoritesService from "./favorites.service";

export async function putFavorites(request: Request, response: Response) {
	const body = request.locals.body as ReplaceFavoritesDto;
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

export async function getMeFavoriteGameIds(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;

	const favorites = await favoritesService.findFavoritesByUserId(user.id);

	const data = { gameIds: favorites.map(e => e.gameId) };
	return response.status(200).json({ data });
}

export async function getMeFavorites(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { rows, total } =
		await favoritesService.findFavoritesByUserIdPaginated(user.id, query);
	const entriesPlain = rows.map(e => e.get({ plain: true }));
	const gameIds = entriesPlain.map(e => e.gameId);
	const [tagsByGame, backlogGameIds] = await Promise.all([
		moodTagsService.findTagsForGames(user.id, gameIds),
		backlogService.findGameIdsInBacklogByUser(user.id, gameIds)
	]);
	const inBacklogIds = new Set(backlogGameIds);

	const data = {
		favorites: entriesPlain.map(e =>
			favoriteSerializer(
				e,
				tagsByGame.get(e.gameId),
				inBacklogIds.has(e.gameId)
			)
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

export async function getMeFavoritesExport(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;
	const format = request.locals.exportFormat as ExportFormat;
	const query = request.locals.query as ExportSearchQuery;

	const entries = await favoritesService.findFavoritesForExport(
		user.id,
		query
	);

	return sendExport(response, {
		resource: "favorites",
		format,
		columns: FAVORITES_EXPORT_COLUMNS,
		rows: entries.map(entry =>
			favoriteToExportRow(entry.get({ plain: true }))
		)
	});
}
