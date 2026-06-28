import { Op } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { Game } from "../games/game.model";
import { ListFollower } from "../list-followers/list-follower.model";
import { ListItem } from "../list-items/list-item.model";
import { User } from "../users/user.model";
import { type RegisterListDto } from "./dtos/register-list.dto";
import { type UpdateListDto } from "./dtos/update-list.dto";
import * as listsServiceError from "./errors/lists.service-error";
import { List } from "./list.model";

const FREE_LIST_LIMIT = 5;

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

	return List.create({
		...registerList,
		userId: user.id
	});
}

export async function findListBasicById(id: string) {
	return List.findOne({ where: { id } });
}

export async function findListById(id: string) {
	return List.findOne({
		where: { id },
		include: [
			{
				model: User,
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
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
				],
				separate: true,
				order: [["position", "ASC"]]
			}
		]
	});
}

export async function getFollowerCount(listId: string) {
	return ListFollower.count({ where: { listId } });
}

export async function getIsFollowing(listId: string, userId: string) {
	const follower = await ListFollower.findOne({
		where: { listId, userId }
	});
	return !!follower;
}

export interface BacklogSummary {
	status: string;
	realDuration: number | null;
	personalRatio: number | null;
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
			personalRatio: calculateRatio(row.score, row.realDuration) ?? null
		});
	}
	return map;
}

export async function getListProgress(
	listId: string,
	userId: string,
	publicOnly = false
): Promise<{ completed: number; total: number }> {
	const items = await ListItem.findAll({
		where: { listId },
		attributes: ["gameId"]
	});
	if (items.length === 0) return { completed: 0, total: 0 };

	const gameIds = items.map(i => i.gameId);
	const completed =
		await backlogService.countDistinctGamesByUserStatusAndGameIds(
			userId,
			gameIds,
			["completed", "abandoned", "endless"],
			publicOnly
		);
	return { completed, total: items.length };
}

export async function findListsByUserId(
	user: RequestUser,
	pagination: { limit?: number; offset?: number } = {}
) {
	const query: Record<string, unknown> = {
		where: { userId: user.id },
		include: [
			{
				model: User,
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
				separate: true,
				limit: 1,
				order: [["position", "ASC"]] as [string, string][],
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
		order: [["createdAt", "DESC"]]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await List.findAndCountAll(query);
	const frozen = await areFrozen(user.id, user.role);

	return { lists: rows, total: count, frozen };
}

export async function findPublicListsByUserId(userId: string) {
	return List.findAll({
		where: { userId, isPublic: true },
		order: [["createdAt", "DESC"]]
	});
}

export async function countListsByUserId(userId: string, publicOnly = false) {
	const where: Record<string, unknown> = { userId };
	if (publicOnly) where["isPublic"] = true;
	return List.count({ where });
}

export async function findPublicListsByGameId(gameId: string) {
	return List.findAll({
		where: { isPublic: true },
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
		order: [["createdAt", "DESC"]]
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
		order: [["createdAt", "DESC"]]
	});
}

export async function findUserListsWithGameFlag(
	userId: string,
	gameId: string
) {
	const [allLists, containingIds] = await Promise.all([
		List.findAll({
			where: { userId },
			attributes: ["id", "name", "isPublic"],
			order: [["createdAt", "DESC"]]
		}),
		ListItem.findAll({
			where: { gameId },
			attributes: ["listId"],
			include: [
				{
					model: List,
					where: { userId },
					attributes: []
				}
			],
			raw: true
		})
	]);

	const containsSet = new Set(
		(containingIds as unknown as { listId: string }[]).map(r => r.listId)
	);

	return allLists.map(l => ({
		id: l.id,
		name: l.name,
		isPublic: l.isPublic,
		contains: containsSet.has(l.id)
	}));
}

export async function findRecentUserLists(limit = 12) {
	return List.findAll({
		where: { isPublic: true },
		include: [
			{
				model: User,
				where: { role: { [Op.ne]: "admin" } },
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
				separate: true,
				limit: 1,
				order: [["position", "ASC"]] as [string, string][],
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
		order: [["createdAt", "DESC"]]
	});
}

export async function findOfficialLists(limit = 12) {
	return List.findAll({
		where: { isPublic: true },
		include: [
			{
				model: User,
				where: { role: "admin" },
				attributes: ["id", "username", "role"]
			},
			{
				model: ListItem,
				separate: true,
				limit: 1,
				order: [["position", "ASC"]] as [string, string][],
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
		order: [["createdAt", "DESC"]]
	});
}

export async function searchPublicLists(query: string, limit = 20) {
	return List.findAll({
		where: {
			name: { [Op.iLike]: `%${query}%` },
			isPublic: true
		},
		include: [
			{
				model: User,
				attributes: ["id", "username", "role"]
			}
		],
		limit,
		order: [["name", "ASC"]]
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

	return list.update(updateList);
}

export async function removeList(id: string, user: RequestUser) {
	const list = await List.findOne({ where: { id } });
	if (!list) throw listsServiceError.notFoundError();
	if (list.userId !== user.id) throw listsServiceError.forbiddenError();

	await List.destroy({ where: { id } });
	return true;
}
