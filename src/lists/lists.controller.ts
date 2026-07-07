import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type SearchQuery } from "../common/schemas/search-query.schema";
import { type DuplicateListDto } from "./dtos/duplicate-list.dto";
import { type RegisterListDto } from "./dtos/register-list.dto";
import { type UpdateListDto } from "./dtos/update-list.dto";
import * as listDomainError from "./errors/lists.domain-error";
import { listSerializer, listSummarySerializer } from "./lists.serializer";
import * as listsService from "./lists.service";
import { type ListIdParams } from "./schemas/list-id-params.schema";

export async function postList(request: Request, response: Response) {
	const registerList = request.locals.body as RegisterListDto;
	const user = request.locals.user as RequestUser;

	const list = await listsService.createList(user, registerList);
	const listPlain = list.get({ plain: true });

	if (list.isPublic) {
		activityService.record(user.id, "list_created", list.id);
	}

	const data = { list: listSummarySerializer(listPlain) };
	return response.status(201).json({ data });
}

export async function postDuplicateList(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const body = request.locals.body as DuplicateListDto;
	const user = request.locals.user as RequestUser;

	const created = await listsService.duplicateList(user, params.listId, body);

	if (created.isPublic) {
		activityService.record(user.id, "list_created", created.id);
	}

	const full = await listsService.findListById(created.id);
	if (!full) throw listDomainError.listInternalError();

	const data = { list: listSerializer(full.get({ plain: true })) };
	return response.status(201).json({ data });
}

export async function getMeLists(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { lists, total, frozen } = await listsService.findListsByUserId(
		user,
		query
	);
	const listsPlain = lists.map(list => list.get({ plain: true }));

	const data = {
		lists: listsPlain.map(listSummarySerializer),
		total,
		frozen
	};
	return response.status(200).json({ data });
}

export async function getListById(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	const list = await listsService.findListById(params.listId);
	if (!list) throw listDomainError.listNotFound();
	if (!list.isPublic && list.userId !== user.id)
		throw listDomainError.listNotFound();

	const listPlain = list.get({ plain: true });
	const gameIds = (list.ListItems ?? []).map(item => item.gameId);

	const [followerCount, isFollowing, backlogSummaryMap, progress] =
		await Promise.all([
			listsService.getFollowerCount(params.listId),
			listsService.getIsFollowing(params.listId, user.id),
			listsService.getBacklogSummaryMap(gameIds, user.id),
			listsService.getListProgress(params.listId, user.id)
		]);

	const data = {
		list: listSerializer(listPlain, {
			followerCount,
			isFollowing,
			backlogSummaryMap,
			progress
		})
	};
	return response.status(200).json({ data });
}

export async function getRecentLists(request: Request, response: Response) {
	const limit = Number(request.query.limit ?? 12);
	const lists = await listsService.findRecentUserLists(limit);
	const listsPlain = lists.map(list => list.get({ plain: true }));

	const data = { lists: listsPlain.map(listSummarySerializer) };
	return response.status(200).json({ data });
}

export async function getOfficialLists(request: Request, response: Response) {
	const limit = Number(request.query.limit ?? 12);
	const lists = await listsService.findOfficialLists(limit);
	const listsPlain = lists.map(list => list.get({ plain: true }));

	const data = { lists: listsPlain.map(listSummarySerializer) };
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
