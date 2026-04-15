import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as listsService from "./lists.service";
import { RegisterListDto } from "./dtos/register-list.dto";
import { UpdateListDto } from "./dtos/update-list.dto";
import { ListIdParams } from "./schemas/list-id-params.schema";
import { listSerializer, listSummarySerializer } from "./lists.serializer";
import { SearchQuery } from "../common/schemas/search-query.schema";
import * as listDomainError from "./errors/lists.domain-error";

export async function postList(request: Request, response: Response) {
	const registerList = request.locals.body as RegisterListDto;
	const user = request.locals.user as RequestUser;

	const list = await listsService.createList(user, registerList);
	const listPlain = list.get({ plain: true });

	const data = { list: listSummarySerializer(listPlain) };
	return response.status(201).json({ data });
}

export async function getMeLists(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const { lists, frozen } = await listsService.findListsByUserId(user);
	const listsPlain = lists.map(list => list.get({ plain: true }));

	const data = {
		lists: listsPlain.map(listSummarySerializer),
		frozen
	};
	return response.status(200).json({ data });
}

export async function getListById(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser | undefined;

	const list = await listsService.findListById(params.listId);
	if (!list) throw listDomainError.listNotFound();

	const listPlain = list.get({ plain: true });
	const followerCount = await listsService.getFollowerCount(params.listId);

	let isFollowing = false;
	let backlogStatusMap = new Map<string, string>();

	if (user) {
		const gameIds = (list.ListItems ?? []).map(item => item.gameId);
		[isFollowing, backlogStatusMap] = await Promise.all([
			listsService.getIsFollowing(params.listId, user.id),
			listsService.getBacklogStatusMap(gameIds, user.id)
		]);
	}

	const data = {
		list: listSerializer(listPlain, {
			followerCount,
			isFollowing,
			backlogStatusMap
		})
	};
	return response.status(200).json({ data });
}

export async function searchLists(request: Request, response: Response) {
	const { query } = request.locals.query as SearchQuery;

	const lists = await listsService.searchPublicLists(query);
	const listsPlain = lists.map(list => list.get({ plain: true }));

	const data = { lists: listsPlain.map(listSummarySerializer) };
	return response.status(200).json({ data });
}

export async function patchList(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const updateList = request.locals.body as UpdateListDto;
	const user = request.locals.user as RequestUser;

	const list = await listsService.updateList(params.listId, user, updateList);

	const listPlain = list.get({ plain: true });

	const data = { list: listSerializer(listPlain) };
	return response.status(200).json({ data });
}

export async function deleteList(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	await listsService.removeList(params.listId, user);
	return response.sendStatus(204);
}
