import { Op } from "sequelize";
import { Activity, ActivityType } from "./activity.model";
import { ActivityGame } from "./targets/activity-game.model";
import { ActivityList } from "./targets/activity-list.model";
import { ActivityUser } from "./targets/activity-user.model";
import { User } from "../users/user.model";
import { Game } from "../games/game.model";
import { List } from "../lists/list.model";
import { UserFollower } from "../user-followers/user-follower.model";

const GAME_TYPES: string[] = [
	"backlog_added",
	"backlog_completed",
	"backlog_abandoned",
	"backlog_playing",
	"backlog_not_started",
	"wishlist_added",
	"shelf_added",
	"favorite_added",
	"game_reviewed"
];
const LIST_TYPES: string[] = ["list_created", "list_followed"];
const USER_TYPES: string[] = ["user_followed", "user_followed_by"];

export async function record(
	userId: string,
	type: ActivityType,
	targetId?: string
) {
	const activity = await Activity.create({ userId, type });

	if (targetId) {
		if (GAME_TYPES.includes(type)) {
			await ActivityGame.create({
				activityId: activity.id,
				gameId: targetId
			});
		} else if (LIST_TYPES.includes(type)) {
			await ActivityList.create({
				activityId: activity.id,
				listId: targetId
			});
		} else if (USER_TYPES.includes(type)) {
			await ActivityUser.create({
				activityId: activity.id,
				targetUserId: targetId
			});
		}
	}

	return activity;
}

const TARGET_INCLUDES = [
	{
		model: ActivityGame,
		include: [
			{
				model: Game,
				attributes: ["id", "title", "code", "backgroundUrl"]
			}
		]
	},
	{
		model: ActivityList,
		include: [{ model: List, attributes: ["id", "name"] }]
	},
	{
		model: ActivityUser,
		include: [
			{
				model: User,
				as: "TargetUser",
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		]
	}
];

export async function getUserActivity(userId: string, limit = 10) {
	return Activity.findAll({
		where: { userId },
		include: TARGET_INCLUDES,
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
			...TARGET_INCLUDES
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
