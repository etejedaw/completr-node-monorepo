import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ExportFormat } from "../common/types/export-format.types";
import { sendExport } from "../common/utils/send-export.util";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import { type User } from "../users/user.model";
import { type AddWishlistDto } from "./dtos/add-wishlist.dto";
import { type ReplaceWishlistDto } from "./dtos/replace-wishlist.dto";
import { type WishlistExportQuery } from "./schemas/wishlist-export-query.schema";
import { type WishlistGameParams } from "./schemas/wishlist-game-params.schema";
import { type WishlistQuery } from "./schemas/wishlist-query.schema";
import {
	WISHLIST_EXPORT_COLUMNS,
	wishlistToExportRow
} from "./wishlist.export-row.mapper";
import { wishlistSerializer } from "./wishlist.serializer";
import * as wishlistService from "./wishlist.service";

export async function getMeWishlistGameIds(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;

	const entries = await wishlistService.findWishlistByUserId(user.id);

	const data = { gameIds: entries.map(e => e.gameId) };
	return response.status(200).json({ data });
}

export async function putWishlist(request: Request, response: Response) {
	const body = request.locals.body as ReplaceWishlistDto;
	const user = request.locals.user as RequestUser;

	const currentIds = new Set(
		(await wishlistService.findWishlistByUserId(user.id)).map(e => e.gameId)
	);

	const entries = await wishlistService.replaceWishlist(user, body.gameIds);
	const entriesPlain = entries.map(e => e.get({ plain: true }));

	activityService.recordManyForGames(
		user.id,
		"wishlist_added",
		body.gameIds.filter(gameId => !currentIds.has(gameId))
	);

	const tagsByGame = await moodTagsService.findTagsForGames(
		user.id,
		entriesPlain.map(e => e.gameId)
	);

	const data = {
		wishlist: entriesPlain.map(e =>
			wishlistSerializer(e, tagsByGame.get(e.gameId))
		)
	};
	return response.status(200).json({ data });
}

export async function postWishlist(request: Request, response: Response) {
	const body = request.locals.body as AddWishlistDto;
	const user = request.locals.user as RequestUser;

	const entry = await wishlistService.addToWishlist(
		user,
		body.gameId,
		body.platformId
	);
	const entryPlain = entry!.get({ plain: true });

	activityService.record(user.id, "wishlist_added", body.gameId);

	const data = { wishlist: wishlistSerializer(entryPlain) };
	return response.status(201).json({ data });
}

export async function deleteWishlistItem(request: Request, response: Response) {
	const params = request.locals.params as WishlistGameParams;
	const user = request.locals.user as RequestUser;

	await wishlistService.removeFromWishlist(user, params.gameId);
	return response.sendStatus(204);
}

export async function getMeWishlist(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query as WishlistQuery;

	const { rows, total } = await wishlistService.findWishlistByUserIdPaginated(
		user.id,
		query
	);
	const entriesPlain = rows.map(e => e.get({ plain: true }));
	const tagsByGame = await moodTagsService.findTagsForGames(
		user.id,
		entriesPlain.map(e => e.gameId)
	);

	const data = {
		wishlist: entriesPlain.map(e =>
			wishlistSerializer(e, tagsByGame.get(e.gameId))
		),
		total
	};
	return response.status(200).json({ data });
}

export async function getUserWishlist(request: Request, response: Response) {
	const query = request.locals.query ?? {};

	const user = request.locals.profileOwner as User;

	const currentUser = request.locals.user as RequestUser | undefined;

	const { rows, total } = await wishlistService.findWishlistByUserIdPaginated(
		user.id,
		query
	);
	const entriesPlain = rows.map(e => e.get({ plain: true }));
	const tagsByGame =
		currentUser?.id === user.id
			? await moodTagsService.findTagsForGames(
					user.id,
					entriesPlain.map(e => e.gameId)
				)
			: new Map<string, string[]>();

	const data = {
		wishlist: entriesPlain.map(e =>
			wishlistSerializer(e, tagsByGame.get(e.gameId))
		),
		total
	};
	return response.status(200).json({ data });
}

export async function getMeWishlistExport(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;
	const format = request.locals.exportFormat as ExportFormat;
	const query = request.locals.query as WishlistExportQuery;

	const entries = await wishlistService.findWishlistForExport(user.id, query);

	return sendExport(response, {
		resource: "wishlist",
		format,
		columns: WISHLIST_EXPORT_COLUMNS,
		rows: entries.map(entry =>
			wishlistToExportRow(entry.get({ plain: true }))
		)
	});
}
