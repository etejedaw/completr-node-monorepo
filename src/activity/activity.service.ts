import { Op } from "sequelize";
import { Activity, ActivityType } from "./activity.model";
import { User } from "../users/user.model";
import { Game } from "../games/game.model";
import { UserFollower } from "../user-followers/user-follower.model";

export async function record(
	userId: string,
	type: ActivityType,
	gameId?: string,
	metadata?: Record<string, unknown>
) {
	return Activity.create({
		userId,
		type,
		gameId: gameId ?? null,
		metadata: metadata ?? null
	});
}

export async function getUserActivity(userId: string, limit = 10) {
	return Activity.findAll({
		where: { userId },
		include: [
			{
				model: Game,
				attributes: ["id", "title", "code", "backgroundUrl"]
			}
		],
		order: [["createdAt", "DESC"]],
		limit
	});
}

export async function getFeed(userId: string, limit = 30, offset = 0) {
	const following = await UserFollower.findAll({
		where: { followerId: userId },
		attributes: ["followingId"]
	});

	const feedUserIds = [userId, ...following.map(f => f.followingId)];

	return Activity.findAll({
		where: { userId: { [Op.in]: feedUserIds } },
		include: [
			{
				model: User,
				attributes: ["id", "username", "name", "avatarUrl"],
				where: {
					[Op.or]: [
						{ id: userId },
						{ isPublic: true, isFeedPublic: true }
					]
				}
			},
			{
				model: Game,
				attributes: ["id", "title", "code", "backgroundUrl"]
			}
		],
		order: [["createdAt", "DESC"]],
		limit,
		offset
	});
}

export async function deleteActivity(activityId: string, userId: string) {
	const activity = await Activity.findOne({
		where: { id: activityId, userId }
	});
	if (!activity) return false;
	await activity.destroy();
	return true;
}
