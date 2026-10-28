import { Op } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type PaginationQuery } from "../common/schemas/pagination-query.schema";
import { Game } from "../games/game.model";
import { ListItem } from "../list-items/list-item.model";
import { List } from "../lists/list.model";
import * as listsService from "../lists/lists.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import { visibleListsCondition } from "../users/helpers/visibility.helper";
import { User } from "../users/user.model";
import * as listFollowersServiceError from "./errors/list-followers.service-error";
import { ListFollower } from "./list-follower.model";

const FOLLOWED_LIST_PREVIEW_INCLUDE = {
	model: List,
	include: [
		{
			model: User,
			attributes: ["id", "username", "role"]
		},
		{
			model: ListItem,
			separate: true,
			limit: listsService.LIST_PREVIEW_SIZE,
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
	]
};

export async function followList(listId: string, userId: string) {
	const list = await listsService.findListById(listId);
	if (!list) throw listFollowersServiceError.listNotFoundError();
	if (!list.isPublic) throw listFollowersServiceError.notPublicError();
	if (!(await listsService.isListVisibleToViewer(listId, userId)))
		throw listFollowersServiceError.listNotFoundError();

	const existing = await ListFollower.findOne({
		where: { listId, userId }
	});
	if (existing) throw listFollowersServiceError.alreadyFollowingError();

	try {
		return await ListFollower.create({ listId, userId });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => listFollowersServiceError.alreadyFollowingError()
		});
	}
}

export async function unfollowList(listId: string, userId: string) {
	const follower = await ListFollower.findOne({
		where: { listId, userId }
	});
	if (!follower) throw listFollowersServiceError.notFollowingError();

	await follower.destroy();
}

export async function getListFollowers(listId: string, viewerId: string) {
	if (!(await listsService.isListVisibleToViewer(listId, viewerId)))
		throw listFollowersServiceError.listNotFoundError();

	return ListFollower.findAll({
		where: { listId },
		include: [
			{
				model: User,
				attributes: USER_PUBLIC_ATTRS
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function getFollowingLists(userId: string) {
	return ListFollower.findAll({
		where: { userId },
		include: [listVisibleToViewer(userId)],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

function listVisibleToViewer(viewerId: string | undefined) {
	return {
		...FOLLOWED_LIST_PREVIEW_INCLUDE,
		required: true,
		where: { [Op.and]: [visibleListsCondition(viewerId)] }
	};
}

export async function getFollowingListsPaginated(
	userId: string,
	viewerId: string | undefined,
	pagination: PaginationQuery = {}
) {
	const query: Record<string, unknown> = {
		where: { userId, isVisible: true },
		include: [listVisibleToViewer(viewerId)],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await ListFollower.findAndCountAll(query);
	return { rows, total: count };
}

export async function updateVisibility(
	listId: string,
	userId: string,
	isVisible: boolean
) {
	const follower = await ListFollower.findOne({
		where: { listId, userId }
	});
	if (!follower) throw listFollowersServiceError.notFollowingError();

	await follower.update({ isVisible });
	return follower;
}
