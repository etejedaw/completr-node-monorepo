import { Op } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import { USER_CARD_ATTRS } from "../users/constants/user-attrs.constants";
import { User } from "../users/user.model";
import * as usersService from "../users/users.service";
import * as serviceError from "./errors/user-followers.service-error";
import { UserFollower } from "./user-follower.model";

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
	try {
		return await UserFollower.create({ followerId, followingId });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => serviceError.alreadyFollowingError(),
			validation: serviceError.validationError
		});
	}
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
				attributes: USER_CARD_ATTRS,
				where: { isActive: true }
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
				attributes: USER_CARD_ATTRS,
				where: { isActive: true }
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function getFollowerCount(userId: string) {
	return UserFollower.count({
		where: { followingId: userId },
		include: [{ model: User, as: "Follower", where: { isActive: true } }]
	});
}

export async function getFollowerCounts(userIds: string[]) {
	const counts = new Map<string, number>(userIds.map(id => [id, 0]));
	if (userIds.length === 0) return counts;

	const rows = (await UserFollower.findAll({
		where: { followingId: { [Op.in]: userIds } },
		include: [
			{
				model: User,
				as: "Follower",
				where: { isActive: true },
				attributes: []
			}
		],
		attributes: [
			"followingId",
			[sequelize.fn("COUNT", sequelize.col("UserFollower.id")), "count"]
		],
		group: ["UserFollower.followingId"],
		raw: true
	})) as unknown as { followingId: string; count: string }[];

	for (const row of rows) counts.set(row.followingId, Number(row.count));
	return counts;
}

export async function getFollowingCount(userId: string) {
	return UserFollower.count({
		where: { followerId: userId },
		include: [{ model: User, as: "Following", where: { isActive: true } }]
	});
}

export async function getFollowingIds(userId: string) {
	const rows = await UserFollower.findAll({
		where: { followerId: userId },
		attributes: ["followingId"]
	});
	return rows.map(row => row.followingId);
}

export async function getMutualFollowerIds(
	userId: string,
	followingIds: string[]
) {
	if (followingIds.length === 0) return [];

	const rows = await UserFollower.findAll({
		where: { followingId: userId, followerId: { [Op.in]: followingIds } },
		attributes: ["followerId"]
	});
	return rows.map(row => row.followerId);
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

export async function findFollowEdges(userId: string, otherIds: string[]) {
	const edges = {
		followingIds: new Set<string>(),
		followerIds: new Set<string>()
	};
	if (otherIds.length === 0) return edges;

	const rows = await UserFollower.findAll({
		where: {
			[Op.or]: [
				{ followerId: userId, followingId: { [Op.in]: otherIds } },
				{ followingId: userId, followerId: { [Op.in]: otherIds } }
			]
		},
		attributes: ["followerId", "followingId"]
	});
	for (const row of rows) {
		if (row.followerId === userId) edges.followingIds.add(row.followingId);
		if (row.followingId === userId) edges.followerIds.add(row.followerId);
	}
	return edges;
}
