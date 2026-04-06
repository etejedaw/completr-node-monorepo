import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as listItemsService from "./list-items.service";
import { ReplaceListItemsDto } from "./dtos/replace-list-items.dto";
import { ListIdParams } from "../lists/schemas/list-id-params.schema";
import { listItemSerializer } from "./list-items.serializer";

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
