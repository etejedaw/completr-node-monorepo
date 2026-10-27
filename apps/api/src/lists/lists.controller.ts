import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type ExportFormat } from "../common/interfaces/export-format.interface";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type SearchQuery } from "../common/schemas/search-query.schema";
import { sendExport } from "../common/utils/send-export.util";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { type DuplicateListDto } from "./dtos/duplicate-list.dto";
import { type RegisterListDto } from "./dtos/register-list.dto";
import { type UpdateListDto } from "./dtos/update-list.dto";
import * as listDomainError from "./errors/lists.domain-error";
import {
	LIST_EXPORT_COLUMNS,
	listItemToExportRow
} from "./lists.export-row.mapper";
import { listSerializer, listSummarySerializer } from "./lists.serializer";
import * as listsService from "./lists.service";
import { type DiscoveryQuery } from "./schemas/discovery-query.schema";
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
	const progressByList = await listsService.getListsProgress(
		lists.map(list => list.id),
		user.id
	);
	const listsWithProgress = lists.map(list => ({
		...listSummarySerializer(list.get({ plain: true })),
		progress: progressByList.get(list.id) ?? { completed: 0, total: 0 }
	}));

	const data = {
		lists: listsWithProgress,
		total,
		frozen
	};
	return response.status(200).json({ data });
}

export async function getListById(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	const list = await listsService.findVisibleListById(params.listId, user.id);
	if (!list) throw listDomainError.listNotFound();

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
	const { limit } = request.locals.query as DiscoveryQuery;
	const user = request.locals.user as RequestUser;
	const lists = await listsService.findRecentUserLists(user.id, limit);
	const listsPlain = lists.map(list => list.get({ plain: true }));

	const data = { lists: listsPlain.map(listSummarySerializer) };
	return response.status(200).json({ data });
}

export async function getOfficialLists(request: Request, response: Response) {
	const { limit } = request.locals.query as DiscoveryQuery;
	const user = request.locals.user as RequestUser;
	const lists = await listsService.findOfficialLists(user.id, limit);
	const listsPlain = lists.map(list => list.get({ plain: true }));

	const data = { lists: listsPlain.map(listSummarySerializer) };
	return response.status(200).json({ data });
}

export async function searchLists(request: Request, response: Response) {
	const { query } = request.locals.query as SearchQuery;
	const user = request.locals.user as RequestUser;

	const lists = await listsService.searchPublicLists(query, user.id);
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

function listExportResource(listName: string) {
	const slug = titleToSlug(listName);
	return slug ? `list-${slug}` : "list";
}

export async function getListExport(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;
	const format = request.locals.exportFormat as ExportFormat;

	const list = await listsService.findOwnListForExport(
		params.listId,
		user.id
	);
	if (!list) throw listDomainError.listNotFound();

	const listPlain = list.get({ plain: true });

	return sendExport(response, {
		resource: listExportResource(listPlain.name),
		format,
		columns: LIST_EXPORT_COLUMNS,
		rows: (listPlain.ListItems ?? []).map(listItemToExportRow)
	});
}
