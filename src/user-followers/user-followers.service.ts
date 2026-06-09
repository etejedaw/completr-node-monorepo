import { UserFollower } from "./user-follower.model";
import { User } from "../users/user.model";
import * as usersService from "../users/users.service";
import * as serviceError from "./errors/user-followers.service-error";

export async function follow(followerId: string, username: string) {
	const target = await usersService.findUserByUsername(username);
	if (!target) throw serviceError.userNotFoundError();
	if (target.id === followerId) throw serviceError.cannotFollowSelfError();

	const existing = await UserFollower.findOne({
		where: { followerId, followingId: target.id }
	});
	if (existing) throw serviceError.alreadyFollowingError();

	return UserFollower.create({ followerId, followingId: target.id });
}

export async function unfollow(followerId: string, username: string) {
	const target = await usersService.findUserByUsername(username);
	if (!target) throw serviceError.userNotFoundError();

	const existing = await UserFollower.findOne({
		where: { followerId, followingId: target.id }
	});
	if (!existing) throw serviceError.notFollowingError();

	await existing.destroy();
}

export async function getFollowers(username: string) {
	const user = await usersService.findUserByUsername(username);
	if (!user) throw serviceError.userNotFoundError();

	return UserFollower.findAll({
		where: { followingId: user.id },
		include: [
			{
				model: User,
				as: "Follower",
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function getFollowing(username: string) {
	const user = await usersService.findUserByUsername(username);
	if (!user) throw serviceError.userNotFoundError();

	return UserFollower.findAll({
		where: { followerId: user.id },
		include: [
			{
				model: User,
				as: "Following",
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function getFollowerCount(userId: string) {
	return UserFollower.count({ where: { followingId: userId } });
}

export async function getFollowingCount(userId: string) {
	return UserFollower.count({ where: { followerId: userId } });
}

export async function getFollowingIds(userId: string) {
	const rows = await UserFollower.findAll({
		where: { followerId: userId },
		attributes: ["followingId"]
	});
	return rows.map(row => row.followingId);
}

export async function isFollowing(followerId: string, followingId: string) {
	const existing = await UserFollower.findOne({
		where: { followerId, followingId }
	});
	return !!existing;
}
