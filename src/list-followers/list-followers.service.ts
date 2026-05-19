import { List } from "../lists/list.model";
import { ListItem } from "../list-items/list-item.model";
import { Game } from "../games/game.model";
import { User } from "../users/user.model";
import { ListFollower } from "./list-follower.model";
import { PaginationQuery } from "../common/schemas/pagination-query.schema";
import * as listsService from "../lists/lists.service";
import * as listFollowersServiceError from "./errors/list-followers.service-error";

const FOLLOWED_LIST_PREVIEW_INCLUDE = {
	model: List,
	include: [
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
	]
};

export async function followList(listId: string, userId: string) {
	const list = await listsService.findListById(listId);
	if (!list) throw listFollowersServiceError.listNotFoundError();
	if (!list.isPublic) throw listFollowersServiceError.notPublicError();

	const existing = await ListFollower.findOne({
		where: { listId, userId }
	});
	if (existing) throw listFollowersServiceError.alreadyFollowingError();

	return ListFollower.create({ listId, userId });
}

export async function unfollowList(listId: string, userId: string) {
	const follower = await ListFollower.findOne({
		where: { listId, userId }
	});
	if (!follower) throw listFollowersServiceError.notFollowingError();

	await follower.destroy();
}

export async function getListFollowers(listId: string) {
	const list = await listsService.findListById(listId);
	if (!list) throw listFollowersServiceError.listNotFoundError();

	return ListFollower.findAll({
		where: { listId },
		include: [
			{
				model: User,
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function getFollowingLists(userId: string) {
	return ListFollower.findAll({
		where: { userId },
		include: [FOLLOWED_LIST_PREVIEW_INCLUDE],
		order: [["createdAt", "DESC"]]
	});
}

export async function getFollowingListsPaginated(
	userId: string,
	pagination: PaginationQuery = {}
) {
	const query: Record<string, unknown> = {
		where: { userId },
		include: [FOLLOWED_LIST_PREVIEW_INCLUDE],
		order: [["createdAt", "DESC"]]
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
