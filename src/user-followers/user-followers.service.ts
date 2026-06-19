import { Op } from "sequelize";
import { UserFollower } from "./user-follower.model";
import { User } from "../users/user.model";
import * as usersService from "../users/users.service";
import * as serviceError from "./errors/user-followers.service-error";

export async function unfollow(followerId: string, username: string) {
	const target = await usersService.findUserByUsername(username);
	if (!target) throw serviceError.userNotFoundError();

	const existing = await UserFollower.findOne({
		where: { followerId, followingId: target.id }
	});
	if (!existing) throw serviceError.notFollowingError();

	await existing.destroy();
}

export async function createFollow(followerId: string, followingId: string) {
	return UserFollower.create({ followerId, followingId });
}

export async function findFollow(followerId: string, followingId: string) {
	return UserFollower.findOne({ where: { followerId, followingId } });
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

export async function areMutualFollowers(a: string, b: string) {
	if (a === b) return false;
	const rows = await UserFollower.findAll({
		where: {
			[Op.or]: [
				{ followerId: a, followingId: b },
				{ followerId: b, followingId: a }
			]
		},
		attributes: ["followerId", "followingId"]
	});
	return rows.length === 2;
}
