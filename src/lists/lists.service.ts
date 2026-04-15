import { Op } from "sequelize";
import { List } from "./list.model";
import { ListItem } from "../list-items/list-item.model";
import { ListFollower } from "../list-followers/list-follower.model";
import { Game } from "../games/game.model";
import { Backlog } from "../backlog/backlog.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { RegisterListDto } from "./dtos/register-list.dto";
import { UpdateListDto } from "./dtos/update-list.dto";
import * as listsServiceError from "./errors/lists.service-error";

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

export async function findListById(id: string) {
	return List.findOne({
		where: { id },
		include: [
			{
				model: ListItem,
				include: [{ model: Game }],
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

// TODO: Mejorar este código
export async function getBacklogStatusMap(
	gameIds: string[],
	userId: string
): Promise<Map<string, string>> {
	if (gameIds.length === 0) return new Map();

	const backlogs = await Backlog.findAll({
		where: { userId, gameId: { [Op.in]: gameIds } },
		order: [["createdAt", "DESC"]]
	});

	const statusMap = new Map<string, string>();
	for (const backlog of backlogs) {
		if (!statusMap.has(backlog.gameId)) {
			statusMap.set(backlog.gameId, backlog.status);
		}
	}
	return statusMap;
}

export async function getListProgress(
	listId: string,
	userId: string
): Promise<{ completed: number; total: number }> {
	const items = await ListItem.findAll({
		where: { listId },
		attributes: ["gameId"]
	});
	if (items.length === 0) return { completed: 0, total: 0 };

	const gameIds = items.map(i => i.gameId);
	const completed = await Backlog.count({
		where: { userId, gameId: { [Op.in]: gameIds }, status: "completed" }
	});
	return { completed, total: items.length };
}

export async function findListsByUserId(user: RequestUser) {
	const lists = await List.findAll({
		where: { userId: user.id },
		order: [["createdAt", "DESC"]]
	});

	const frozen = await areFrozen(user.id, user.role);

	return { lists, frozen };
}

export async function findPublicListsByUserId(userId: string) {
	return List.findAll({
		where: { userId, isPublic: true },
		order: [["createdAt", "DESC"]]
	});
}

export async function searchPublicLists(query: string, limit = 20) {
	return List.findAll({
		where: {
			name: { [Op.iLike]: `%${query}%` },
			isPublic: true
		},
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
