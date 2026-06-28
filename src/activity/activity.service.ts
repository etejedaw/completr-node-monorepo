import { Op } from "sequelize";

import { Game } from "../games/game.model";
import { List } from "../lists/list.model";
import * as userFollowersService from "../user-followers/user-followers.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import { User } from "../users/user.model";
import { Activity, type ActivityType } from "./activity.model";
import { ActivityGame } from "./targets/activity-game.model";
import { ActivityList } from "./targets/activity-list.model";
import { ActivityUser } from "./targets/activity-user.model";

const GAME_TYPES: string[] = [
	"backlog_added",
	"backlog_completed",
	"backlog_abandoned",
	"backlog_endless",
	"backlog_playing",
	"backlog_not_started",
	"queue_added",
	"wishlist_added",
	"shelf_added",
	"favorite_added",
	"game_reviewed"
];
const LIST_TYPES: string[] = ["list_created", "list_followed"];
const USER_TYPES: string[] = [
	"user_followed",
	"user_followed_by",
	"coop_tagged"
];
const SOCIAL_TYPES: string[] = ["user_followed", "user_followed_by"];

export function record(userId: string, type: ActivityType, targetId?: string) {
	persist(userId, type, targetId).catch(Function.prototype as () => void);
}

async function persist(userId: string, type: ActivityType, targetId?: string) {
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
				attributes: USER_PUBLIC_ATTRS
			}
		]
	}
];

export async function getUserActivity(
	userId: string,
	limit = 10,
	options: { includeSocial?: boolean } = {}
) {
	const where: Record<string, unknown> = { userId };
	if (!options.includeSocial) {
		where.type = { [Op.notIn]: SOCIAL_TYPES };
	}
	return Activity.findAll({
		where,
		include: TARGET_INCLUDES,
		order: [["createdAt", "DESC"]],
		limit
	});
}

export async function getFeed(userId: string, limit = 25, offset = 0) {
	const followingIds = await userFollowersService.getFollowingIds(userId);
	const feedUserIds = [userId, ...followingIds];

	const { rows, count } = await Activity.findAndCountAll({
		where: {
			userId: { [Op.in]: feedUserIds },
			type: { [Op.notIn]: SOCIAL_TYPES }
		},
		include: [
			{
				model: User,
				attributes: USER_PUBLIC_ATTRS,
				where: {
					[Op.or]: [
						{ id: userId },
						{
							profileVisibility: "public",
							feedVisibility: "public"
						}
					]
				}
			},
			...TARGET_INCLUDES
		],
		order: [["createdAt", "DESC"]],
		limit,
		offset
	});

	return { rows, total: count };
}

export async function deleteActivity(activityId: string, userId: string) {
	const activity = await Activity.findOne({
		where: { id: activityId, userId }
	});
	if (!activity) return false;
	await activity.destroy();
	return true;
}
