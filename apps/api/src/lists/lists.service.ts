import { Op, QueryTypes, type Transaction } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { GAME_REFERENCE_ATTRS } from "../games/games.constants";
import * as gamesService from "../games/games.service";
import * as listFollowersService from "../list-followers/list-followers.service";
import * as listItemsService from "../list-items/list-items.service";
import { resolvePremiumAccess } from "../premium-access/premium-access.service";
import * as scoreSourcesService from "../score-sources/score-sources.service";
import { visibleListsCondition } from "../users/helpers/visibility.helper";
import * as usersService from "../users/users.service";
import { type DuplicateListDto } from "./dtos/duplicate-list.dto";
import { type RegisterListDto } from "./dtos/register-list.dto";
import { type UpdateListDto } from "./dtos/update-list.dto";
import * as listsServiceError from "./errors/lists.service-error";
import { List } from "./list.model";
import {
	FINISHED_STATUSES,
	FREE_LIST_LIMIT,
	LIST_ORDER_NEWEST_FIRST,
	LIST_PREVIEW_SIZE
} from "./lists.constants";
import { type BacklogSummary, type ListProgress } from "./lists.interface";

async function hasPremiumAccess(userId: string, role: string) {
	return resolvePremiumAccess({ id: userId, role }, "lists.unlimited");
}

async function areFrozen(userId: string, role: string) {
	const premiumAccess = await hasPremiumAccess(userId, role);
	if (premiumAccess.allowed) return false;
	const count = await List.count({ where: { userId } });
	return count > FREE_LIST_LIMIT;
}

async function lockUserLists(userId: string, transaction: Transaction) {
	await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:lockKey))", {
		replacements: { lockKey: `lists:${userId}` },
		transaction
	});
}

async function assertWithinListLimit(
	user: RequestUser,
	unlimited: boolean,
	transaction: Transaction
) {
	if (unlimited) return;
	const count = await List.count({ where: { userId: user.id }, transaction });
	if (count >= FREE_LIST_LIMIT) throw listsServiceError.limitReachedError();
}

export async function createList(
	user: RequestUser,
	registerList: RegisterListDto
) {
	const { allowed: unlimited } = await hasPremiumAccess(user.id, user.role);

	return sequelize.transaction(async transaction => {
		await lockUserLists(user.id, transaction);
		await assertWithinListLimit(user, unlimited, transaction);
		await assertScoreSourceExists(registerList.scoreSource, transaction);

		return List.create(
			{ ...registerList, userId: user.id },
			{ transaction }
		);
	});
}

export async function duplicateList(
	user: RequestUser,
	listId: string,
	duplicateList: DuplicateListDto
) {
	const source = await List.findOne({
		where: { id: listId },
		include: [
			{
				...listItemsService.listItemInclude(),
				separate: true,
				order: [
					["position", "ASC"],
					["id", "ASC"]
				]
			}
		]
	});
	if (!source) throw listsServiceError.notFoundError();
	if (!source.isPublic && source.userId !== user.id)
		throw listsServiceError.notFoundError();
	if (!(await isListVisibleToViewer(source.id, user.id)))
		throw listsServiceError.notFoundError();

	const items = source.ListItems ?? [];
	const { allowed: unlimited } = await hasPremiumAccess(user.id, user.role);

	return sequelize.transaction(async transaction => {
		await lockUserLists(user.id, transaction);
		await assertWithinListLimit(user, unlimited, transaction);

		const list = await List.create(
			{
				userId: user.id,
				name: duplicateList.name,
				description: source.description,
				isPublic: duplicateList.isPublic ?? false,
				scoreSource: source.scoreSource,
				durationSource: source.durationSource
			},
			{ transaction }
		);

		await listItemsService.copyItemsToList(list.id, items, transaction);

		return list;
	});
}

export async function isListVisibleToViewer(
	listId: string,
	viewerId: string | undefined
) {
	const visible = await List.findOne({
		where: { id: listId, [Op.and]: [visibleListsCondition(viewerId)] },
		attributes: ["id"]
	});
	return !!visible;
}

export async function findListBasicById(id: string) {
	return List.findOne({ where: { id } });
}

const LIST_GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
const LIST_OWNER_ATTRS = ["id", "username", "role"];
const LIST_ITEMS_ORDER: [string, string][] = [
	["position", "ASC"],
	["id", "ASC"]
];

function listPreviewItemsInclude() {
	return {
	...listItemsService.listItemInclude(),
	separate: true,
	limit: LIST_PREVIEW_SIZE,
	order: LIST_ITEMS_ORDER,
	include: [{ ...gamesService.gameInclude(), attributes: LIST_GAME_ATTRS }]
	};
}

function listDetailInclude() {
	return [
	{
		...usersService.userInclude(),
		attributes: LIST_OWNER_ATTRS
	},
	{
		...listItemsService.listItemInclude(),
		include: [{ ...gamesService.gameInclude(), attributes: LIST_GAME_ATTRS }],
		separate: true,
		order: LIST_ITEMS_ORDER
	}
	];
}

export async function findListsByIds(ids: string[]) {
	return List.findAll({ where: { id: { [Op.in]: ids } } });
}

export async function findListById(id: string) {
	return List.findOne({ where: { id }, include: listDetailInclude() });
}

export async function findOwnListForExport(id: string, userId: string) {
	return List.findOne({
		where: { id, userId },
		attributes: ["id", "name"],
		include: [
			{
				...listItemsService.listItemInclude(),
				attributes: [
					"id",
					"position",
					"score",
					"duration",
					"createdAt"
				],
				include: [{ ...gamesService.gameInclude(), attributes: ["id", "title"] }]
			}
		],
		order: [
			listItemsService.listItemOrder("position", "ASC"),
			listItemsService.listItemOrder("id", "ASC")
		]
	});
}

export async function findVisibleListById(
	id: string,
	viewerId: string | undefined
) {
	return List.findOne({
		where: { id, [Op.and]: [visibleListsCondition(viewerId)] },
		include: listDetailInclude()
	});
}

export async function getFollowerCount(listId: string) {
	return listFollowersService.countListFollowers(listId);
}

export async function getListFollowerCounts(
	listIds: string[]
): Promise<Map<string, number>> {
	const counts = new Map<string, number>(listIds.map(id => [id, 0]));
	if (listIds.length === 0) return counts;

	const rows = await listFollowersService.countFollowersByListIds(listIds);
	for (const row of rows) counts.set(row.listId, Number(row.count));
	return counts;
}

export async function getIsFollowing(listId: string, userId: string) {
	return listFollowersService.isUserFollowingList(listId, userId);
}

export async function getBacklogSummaryMap(
	gameIds: string[],
	userId: string,
	publicOnly = false
): Promise<Map<string, BacklogSummary>> {
	if (gameIds.length === 0) return new Map();

	const rows = await backlogService.findBacklogSummariesByUserAndGameIds(
		userId,
		gameIds,
		publicOnly
	);

	const map = new Map<string, BacklogSummary>();
	for (const row of rows) {
		map.set(row.gameId, {
			status: row.status,
			realDuration: row.realDuration,
			personalRatio: calculateRatio(row.score, row.realDuration)
		});
	}
	return map;
}

export async function getListProgress(
	listId: string,
	userId: string,
	publicOnly = false
): Promise<ListProgress> {
	const gameIds = await listItemsService.findGameIdsByListId(listId);
	if (gameIds.length === 0) return { completed: 0, total: 0 };

	const completed =
		await backlogService.countDistinctGamesByUserStatusAndGameIds(
			userId,
			gameIds,
			FINISHED_STATUSES,
			publicOnly
		);
	return { completed, total: gameIds.length };
}

export async function getListsProgress(
	listIds: string[],
	userId: string,
	publicOnly = false
): Promise<Map<string, ListProgress>> {
	const progressByList = new Map<string, ListProgress>(
		listIds.map(id => [id, { completed: 0, total: 0 }])
	);
	if (listIds.length === 0) return progressByList;

	const publicCondition = publicOnly ? `AND b."isPublic" = true` : "";
	const rows = (await sequelize.query(
		`SELECT li."listId" AS "listId",
			COUNT(*)::int AS "total",
			(COUNT(DISTINCT li."gameId") FILTER (
				WHERE EXISTS (
					SELECT 1 FROM "Backlogs" b
					WHERE b."userId" = :userId
						AND b."gameId" = li."gameId"
						AND b."status" IN (:statuses)
						${publicCondition}
				)
			))::int AS "completed"
		FROM "ListItems" li
		WHERE li."listId" IN (:listIds)
		GROUP BY li."listId"`,
		{
			replacements: {
				userId,
				listIds,
				statuses: FINISHED_STATUSES
			},
			type: QueryTypes.SELECT
		}
	)) as { listId: string; total: number; completed: number }[];

	for (const row of rows)
		progressByList.set(row.listId, {
			completed: row.completed,
			total: row.total
		});
	return progressByList;
}

function listsOfUserWhere(userId: string, search?: string) {
	const nameWhere = search
		? buildTextSearchWhere(search, ["List.name"])
		: null;
	return nameWhere ? { userId, ...nameWhere } : { userId };
}

export async function findListsByUserId(
	user: RequestUser,
	pagination: PaginatedSearchQuery = {}
) {
	const query: Record<string, unknown> = {
		where: listsOfUserWhere(user.id, pagination.search),
		include: [
			{
				...usersService.userInclude(),
				attributes: LIST_OWNER_ATTRS
			},
			listPreviewItemsInclude()
		],
		order: LIST_ORDER_NEWEST_FIRST
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await List.findAndCountAll(query);
	const frozen = await areFrozen(user.id, user.role);

	return { lists: rows, total: count, frozen };
}

export async function findPublicListsByUserId(
	userId: string,
	pagination: PaginatedSearchQuery = {}
) {
	const query: Record<string, unknown> = {
		where: {
			...listsOfUserWhere(userId, pagination.search),
			isPublic: true
		},
		include: [
			listPreviewItemsInclude()
		],
		order: LIST_ORDER_NEWEST_FIRST
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await List.findAndCountAll(query);
	return { lists: rows, total: count };
}

export async function countListsByUserId(userId: string, publicOnly = false) {
	const where: Record<string, unknown> = { userId };
	if (publicOnly) where["isPublic"] = true;
	return List.count({ where });
}

export async function findPublicListsByGameId(
	gameId: string,
	viewerId: string | undefined
) {
	return List.findAll({
		where: { isPublic: true, [Op.and]: [visibleListsCondition(viewerId)] },
		include: [
			{
				...listItemsService.listItemInclude(),
				where: { gameId },
				attributes: []
			},
			{
				...usersService.userInclude(),
				attributes: LIST_OWNER_ATTRS
			}
		],
		order: LIST_ORDER_NEWEST_FIRST
	});
}

export async function findUserListsWithGameFlag(
	userId: string,
	gameId: string
) {
	const [allLists, containingListIds] = await Promise.all([
		List.findAll({
			where: { userId },
			attributes: ["id", "name", "isPublic"],
			order: LIST_ORDER_NEWEST_FIRST
		}),
		listItemsService.findListIdsContainingGameOwnedBy(gameId, userId)
	]);

	const containsSet = new Set(containingListIds);

	return allLists.map(l => ({
		id: l.id,
		name: l.name,
		isPublic: l.isPublic,
		contains: containsSet.has(l.id)
	}));
}

export async function findRecentUserLists(
	viewerId: string | undefined,
	limit = 12
) {
	return List.findAll({
		where: { isPublic: true, [Op.and]: [visibleListsCondition(viewerId)] },
		include: [
			{
				...usersService.userInclude(),
				where: { role: { [Op.ne]: "admin" } },
				attributes: LIST_OWNER_ATTRS
			},
			listPreviewItemsInclude()
		],
		limit,
		order: LIST_ORDER_NEWEST_FIRST
	});
}

export async function findOfficialLists(
	viewerId: string | undefined,
	limit = 12
) {
	return List.findAll({
		where: { isPublic: true, [Op.and]: [visibleListsCondition(viewerId)] },
		include: [
			{
				...usersService.userInclude(),
				where: { role: "admin" },
				attributes: LIST_OWNER_ATTRS
			},
			listPreviewItemsInclude()
		],
		limit,
		order: LIST_ORDER_NEWEST_FIRST
	});
}

export async function searchPublicLists(
	query: string,
	viewerId: string | undefined,
	limit = 20
) {
	const nameWhere = buildTextSearchWhere(query, ["List.name"]);
	if (!nameWhere) return [];
	return List.findAll({
		where: {
			isPublic: true,
			[Op.and]: [nameWhere, visibleListsCondition(viewerId)]
		},
		include: [
			{
				...usersService.userInclude(),
				attributes: LIST_OWNER_ATTRS
			},
			listPreviewItemsInclude()
		],
		limit,
		order: [
			["name", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function updateList(
	id: string,
	user: RequestUser,
	updateList: UpdateListDto
) {
	const list = await findListById(id);
	if (!list || list.userId !== user.id)
		throw listsServiceError.notFoundError();

	const frozen = await areFrozen(user.id, user.role);
	if (frozen) throw listsServiceError.frozenError();
	if (updateList.scoreSource)
		await assertScoreSourceExists(updateList.scoreSource);

	return list.update(updateList);
}

export async function removeList(id: string, user: RequestUser) {
	const list = await List.findOne({ where: { id } });
	if (!list || list.userId !== user.id)
		throw listsServiceError.notFoundError();

	await List.destroy({ where: { id } });
	return true;
}

async function assertScoreSourceExists(
	scoreSource: string,
	transaction?: Transaction
) {
	if (!(await scoreSourcesService.existsByCode(scoreSource, transaction)))
		throw listsServiceError.scoreSourceNotFoundError(scoreSource);
}

export async function findOwnListsForDataExport(userId: string) {
	return List.findAll({
		where: { userId },
		include: [
			{
				...listItemsService.listItemInclude(),
				include: [{ ...gamesService.gameInclude(), attributes: GAME_REFERENCE_ATTRS }]
			}
		],
		order: [
			["createdAt", "ASC"],
			["id", "ASC"],
			listItemsService.listItemOrder("position", "ASC"),
			listItemsService.listItemOrder("id", "ASC")
		]
	});
}
