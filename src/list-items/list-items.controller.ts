import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as listItemsService from "./list-items.service";
import { AddListItemDto } from "./dtos/add-list-item.dto";
import { UpdateListItemDto } from "./dtos/update-list-item.dto";
import { ListIdParams } from "../lists/schemas/list-id-params.schema";
import { ListItemIdParams } from "./schemas/list-item-id-params.schema";
import { listItemSerializer } from "./list-items.serializer";

export async function postListItem(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const addListItem = request.locals.body as AddListItemDto;
	const user = request.locals.user as RequestUser;

	const item = await listItemsService.addItem(
		params.listId,
		user.id,
		addListItem.gameId
	);
	const itemPlain = item.get({ plain: true });

	const data = { item: listItemSerializer(itemPlain) };
	return response.status(201).json({ data });
}

export async function patchListItem(request: Request, response: Response) {
	const params = request.locals.params as ListItemIdParams;
	const updateListItem = request.locals.body as UpdateListItemDto;
	const user = request.locals.user as RequestUser;

	const item = await listItemsService.updateItemPosition(
		params.listId,
		params.itemId,
		user.id,
		updateListItem.position
	);
	const itemPlain = item.get({ plain: true });

	const data = { item: listItemSerializer(itemPlain) };
	return response.status(200).json({ data });
}

export async function deleteListItem(request: Request, response: Response) {
	const params = request.locals.params as ListItemIdParams;
	const user = request.locals.user as RequestUser;

	await listItemsService.removeItem(params.listId, params.itemId, user.id);
	return response.sendStatus(204);
}

export async function postRefreshScores(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	const updatedCount = await listItemsService.refreshScores(
		params.listId,
		user.id
	);

	const data = { updatedItems: updatedCount };
	return response.status(200).json({ data });
}
