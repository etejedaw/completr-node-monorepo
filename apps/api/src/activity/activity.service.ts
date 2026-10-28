import { literal, Op } from "sequelize";

import { Game } from "../games/game.model";
import { List } from "../lists/list.model";
import * as userFollowersService from "../user-followers/user-followers.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import { sectionVisibleToViewerSql } from "../users/helpers/visibility.helper";
import { User } from "../users/user.model";
import { Activity, type ActivityType } from "./activity.model";
import { type FeedCategory } from "./schemas/feed-query.schema";
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
	"game_reviewed",
	"game_platinumed"
];
const LIST_TYPES: string[] = ["list_created", "list_followed"];
const USER_TYPES: string[] = [
	"user_followed",
	"user_followed_by",
	"coop_tagged"
];
const SOCIAL_TYPES: string[] = ["user_followed", "user_followed_by"];
const PLATINUM_TYPES: string[] = ["game_platinumed"];
const FRIEND_VISIBLE_LEVELS = ["public", "friends"];

export function record(
	userId: string,
	type: ActivityType,
	targetId?: string,
	metadata?: Record<string, unknown>
) {
	persist(userId, type, targetId, metadata).catch(
		Function.prototype as () => void
	);
}

async function persist(
	userId: string,
	type: ActivityType,
	targetId?: string,
	metadata?: Record<string, unknown>
) {
	const activity = await Activity.create({ userId, type, metadata });

	if (!targetId) return activity;

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
	options: { includeSocial?: boolean; includePlatinums?: boolean } = {}
) {
	const where: Record<string, unknown> = { userId };
	const hiddenTypes = [
		...(options.includeSocial ? [] : SOCIAL_TYPES),
		...(options.includePlatinums === false ? PLATINUM_TYPES : [])
	];
	if (hiddenTypes.length > 0) {
		where.type = { [Op.notIn]: hiddenTypes };
	}
	return Activity.findAll({
		where,
		include: TARGET_INCLUDES,
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
		limit
	});
}

const CATEGORY_TYPES: Record<FeedCategory, readonly string[]> = {
	games: GAME_TYPES,
	lists: LIST_TYPES,
	social: USER_TYPES
};

function resolveFeedTypes(filter: {
	category?: FeedCategory;
	types?: readonly ActivityType[];
}): string[] | undefined {
	const { category, types } = filter;
	let allowed: string[] | undefined = category
		? [...CATEGORY_TYPES[category]]
		: undefined;
	if (types?.length) {
		allowed = allowed
			? allowed.filter(type => types.includes(type as ActivityType))
			: [...types];
	}
	return allowed;
}

function platinumActivityVisibleCondition(viewerId: string) {
	const platinumTypes = PLATINUM_TYPES.map(type => `'${type}'`).join(", ");
	const ownerAllows = sectionVisibleToViewerSql(
		"platinum",
		viewerId,
		'"Activity"."userId"'
	);
	return literal(
		`("Activity"."type" NOT IN (${platinumTypes}) OR ${ownerAllows})`
	);
}

export async function getFeed(
	userId: string,
	limit = 25,
	offset = 0,
	filter: {
		category?: FeedCategory;
		types?: readonly ActivityType[];
	} = {}
) {
	const followingIds = await userFollowersService.getFollowingIds(userId);
	const mutualIds = await userFollowersService.getMutualFollowerIds(
		userId,
		followingIds
	);
	const feedUserIds = [userId, ...followingIds];

	const typeCondition: { [Op.notIn]: readonly string[]; [Op.in]?: string[] } =
		{
			[Op.notIn]: SOCIAL_TYPES
		};
	const allowedTypes = resolveFeedTypes(filter);
	if (allowedTypes) typeCondition[Op.in] = allowedTypes;

	const { rows, count } = await Activity.findAndCountAll({
		where: {
			userId: { [Op.in]: feedUserIds },
			type: typeCondition,
			[Op.and]: [platinumActivityVisibleCondition(userId)]
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
						},
						{
							id: { [Op.in]: mutualIds },
							profileVisibility: {
								[Op.in]: FRIEND_VISIBLE_LEVELS
							},
							feedVisibility: { [Op.in]: FRIEND_VISIBLE_LEVELS }
						}
					]
				}
			},
			...TARGET_INCLUDES
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
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
