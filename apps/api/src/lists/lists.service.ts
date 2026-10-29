import { Op, QueryTypes } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import * as listFollowersService from "../list-followers/list-followers.service";
import { ListItem } from "../list-items/list-item.model";
import * as listItemsService from "../list-items/list-items.service";
import * as scoreSourcesService from "../score-sources/score-sources.service";
import { visibleListsCondition } from "../users/helpers/visibility.helper";
import { User } from "../users/user.model";
import { type DuplicateListDto } from "./dtos/duplicate-list.dto";
import { type RegisterListDto } from "./dtos/register-list.dto";
import { type UpdateListDto } from "./dtos/update-list.dto";
import * as listsServiceError from "./errors/lists.service-error";
import { List } from "./list.model";
import { type BacklogSummary, type ListProgress } from "./lists.interface";

const FREE_LIST_LIMIT = 5;
export const LIST_PREVIEW_SIZE = 4;
const FINISHED_STATUSES = ["completed", "abandoned", "endless"];

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

async function areFrozen(userId: string, role: string) {
	if (isPremium(role)) return false;
	const count = await List.count({ where: { userId } });
	return count > FREE_LIST_LIMIT;
}

export async function createList(
	user: RequestUser,
	registerList: RegisterListDto
) {
	if (!isPremium(user.role)) {
		const count = await List.count({ where: { userId: user.id } });
		if (count >= FREE_LIST_LIMIT)
			throw listsServiceError.limitReachedError();
	}
	await assertScoreSourceExists(registerList.scoreSource);

	return List.create({
		...registerList,
		userId: user.id
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
				model: ListItem,
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
		throw listsServiceError.forbiddenError();
	if (!(await isListVisibleToViewer(source.id, user.id)))
		throw listsServiceError.notFoundError();

	if (!isPremium(user.role)) {
		const count = await List.count({ where: { userId: user.id } });
		if (count >= FREE_LIST_LIMIT)
			throw listsServiceError.limitReachedError();
	}

	const items = source.ListItems ?? [];

	return sequelize.transaction(async transaction => {
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

const LIST_DETAIL_INCLUDE = [
	{
		model: User,
		attributes: ["id", "username", "role"]
	},
	{
		model: ListItem,
		include: [
			{
				model: Game,
				attributes: ["id", "code", "title", "backgroundUrl", "isDlc"]
			}
		],
		separate: true,
		order: [
			["position", "ASC"],
			["id", "ASC"]
		] as [string, string][]
	}
];

export async function findListsByIds(ids: string[]) {
	return List.findAll({ where: { id: { [Op.in]: ids } } });
}

export async function findListById(id: string) {
	return List.findOne({ where: { id }, include: LIST_DETAIL_INCLUDE });
}

export async function findOwnListForExport(id: string, userId: string) {
	return List.findOne({
		where: { id, userId },
		attributes: ["id", "name"],
		include: [
			{
				model: ListItem,
				attributes: [
					"id",
					"position",
					"score",
					"duration",
					"createdAt"
				],
				include: [{ model: Game, attributes: ["id", "title"] }]
			}
		],
		order: [
			[ListItem, "position", "ASC"],
			[ListItem, "id", "ASC"]
		]
	});
}

export async function findVisibleListById(
	id: string,
	viewerId: string | undefined
) {
	return List.findOne({
		where: { id, [Op.and]: [visibleListsCondition(viewerId)] },
		include: LIST_DETAIL_INCLUDE
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
				model: User,
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
				separate: true,
				limit: LIST_PREVIEW_SIZE,
				order: [
					["position", "ASC"],
					["id", "ASC"]
				] as [string, string][],
				include: [
					{
						model: Game,
						attributes: [
							"id",
							"code",
							"title",
							"backgroundUrl",
							"isDlc"
						]
					}
				]
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
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
			{
				model: ListItem,
				separate: true,
				limit: LIST_PREVIEW_SIZE,
				order: [
					["position", "ASC"],
					["id", "ASC"]
				] as [string, string][],
				include: [
					{
						model: Game,
						attributes: [
							"id",
							"code",
							"title",
							"backgroundUrl",
							"isDlc"
						]
					}
				]
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
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
				model: ListItem,
				where: { gameId },
				attributes: []
			},
			{
				model: User,
				attributes: ["id", "username", "role"]
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function findUserListsByGameId(gameId: string, userId: string) {
	return List.findAll({
		where: { userId },
		attributes: ["id", "name", "isPublic"],
		include: [
			{
				model: ListItem,
				where: { gameId },
				attributes: []
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
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
			order: [
				["createdAt", "DESC"],
				["id", "DESC"]
			]
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
				model: User,
				where: { role: { [Op.ne]: "admin" } },
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
				separate: true,
				limit: LIST_PREVIEW_SIZE,
				order: [
					["position", "ASC"],
					["id", "ASC"]
				] as [string, string][],
				include: [
					{
						model: Game,
						attributes: [
							"id",
							"code",
							"title",
							"backgroundUrl",
							"isDlc"
						]
					}
				]
			}
		],
		limit,
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
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
				model: User,
				where: { role: "admin" },
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
				separate: true,
				limit: LIST_PREVIEW_SIZE,
				order: [
					["position", "ASC"],
					["id", "ASC"]
				] as [string, string][],
				include: [
					{
						model: Game,
						attributes: [
							"id",
							"code",
							"title",
							"backgroundUrl",
							"isDlc"
						]
					}
				]
			}
		],
		limit,
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
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
				model: User,
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
				separate: true,
				limit: LIST_PREVIEW_SIZE,
				order: [
					["position", "ASC"],
					["id", "ASC"]
				] as [string, string][],
				include: [
					{
						model: Game,
						attributes: [
							"id",
							"code",
							"title",
							"backgroundUrl",
							"isDlc"
						]
					}
				]
			}
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
	if (!list) throw listsServiceError.notFoundError();
	if (list.userId !== user.id) throw listsServiceError.forbiddenError();

	const frozen = await areFrozen(user.id, user.role);
	if (frozen) throw listsServiceError.frozenError();
	if (updateList.scoreSource)
		await assertScoreSourceExists(updateList.scoreSource);

	return list.update(updateList);
}

export async function removeList(id: string, user: RequestUser) {
	const list = await List.findOne({ where: { id } });
	if (!list) throw listsServiceError.notFoundError();
	if (list.userId !== user.id) throw listsServiceError.forbiddenError();

	await List.destroy({ where: { id } });
	return true;
}

async function assertScoreSourceExists(scoreSource: string) {
	if (!(await scoreSourcesService.existsByCode(scoreSource)))
		throw listsServiceError.scoreSourceNotFoundError(scoreSource);
}
