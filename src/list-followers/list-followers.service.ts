import { List } from "../lists/list.model";
import { User } from "../users/user.model";
import { ListFollower } from "./list-follower.model";
import { PaginationQuery } from "../common/schemas/pagination-query.schema";
import * as listsService from "../lists/lists.service";
import * as listFollowersServiceError from "./errors/list-followers.service-error";

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
		include: [{ model: List }],
		order: [["createdAt", "DESC"]]
	});
}

export async function getFollowingListsPaginated(
	userId: string,
	pagination: PaginationQuery = {}
) {
	const query: Record<string, unknown> = {
		where: { userId },
		include: [{ model: List }],
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
