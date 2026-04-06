import { List } from "../lists/list.model";
import { ListFollower } from "./list-follower.model";
import * as listFollowersServiceError from "./errors/list-followers.service-error";

export async function followList(listId: string, userId: string) {
	const list = await List.findOne({ where: { id: listId } });
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

	await ListFollower.destroy({ where: { id: follower.id } });
	return true;
}
