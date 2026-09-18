import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ListIdParams } from "../lists/schemas/list-id-params.schema";
import { type ReplaceListItemsDto } from "./dtos/replace-list-items.dto";
import { listItemSerializer } from "./list-items.serializer";
import * as listItemsService from "./list-items.service";

export async function putListItems(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const replaceListItems = request.locals.body as ReplaceListItemsDto;
	const user = request.locals.user as RequestUser;

	const items = await listItemsService.replaceItems(
		params.listId,
		user,
		replaceListItems.gameIds
	);
	const itemsPlain = items.map(item => item.get({ plain: true }));

	const data = { items: itemsPlain.map(listItemSerializer) };
	return response.status(200).json({ data });
}

export async function postListItem(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const body = request.locals.body as { gameId: string };
	const user = request.locals.user as RequestUser;

	const item = await listItemsService.addItem(
		params.listId,
		user,
		body.gameId
	);
	const itemPlain = item.get({ plain: true });

	const data = { item: listItemSerializer(itemPlain) };
	return response.status(201).json({ data });
}

export async function deleteListItem(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams & { gameId: string };
	const user = request.locals.user as RequestUser;

	await listItemsService.removeItem(params.listId, user, params.gameId);
	return response.sendStatus(204);
}

export async function postRefreshScores(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	const updatedCount = await listItemsService.refreshScores(
		params.listId,
		user
	);

	const data = { updatedItems: updatedCount };
	return response.status(200).json({ data });
}
