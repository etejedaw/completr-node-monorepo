import { literal, Op, type Transaction, type WhereOptions } from "sequelize";

import { CHRONOLOGICAL_ORDER } from "../common/constants/chronological-order.constants";
import { PinoLogger } from "../common/logger/pino.logger";
import { sequelize } from "../database/sequelize.database";
import * as userFollowersService from "../user-followers/user-followers.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import { sectionVisibleToViewerSql } from "../users/helpers/visibility.helper";
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

const DEFAULT_PROFILE_ACTIVITY_LIMIT = 10;
const DEFAULT_FEED_LIMIT = 25;

const logger = new PinoLogger("Activity Service");

export function record(
	userId: string,
	type: ActivityType,
	targetId?: string,
	metadata?: Record<string, unknown>
) {
	persist(userId, type, targetId, metadata).catch(error =>
		logger.warn("record", "failed", {
			type,
			error: error instanceof Error ? error.message : String(error)
		})
	);
}

export function recordManyForGames(
	userId: string,
	type: ActivityType,
	gameIds: string[]
) {
	if (gameIds.length === 0) return;
	persistManyForGames(userId, type, gameIds).catch(error =>
		logger.warn("recordManyForGames", "failed", {
			type,
			error: error instanceof Error ? error.message : String(error)
		})
	);
}

async function createTarget(
	activityId: string,
	type: ActivityType,
	targetId: string,
	transaction: Transaction
) {
	if (GAME_TYPES.includes(type))
		await ActivityGame.create(
			{ activityId, gameId: targetId },
			{ transaction }
		);
	else if (LIST_TYPES.includes(type))
		await ActivityList.create(
			{ activityId, listId: targetId },
			{ transaction }
		);
	else if (USER_TYPES.includes(type))
		await ActivityUser.create(
			{ activityId, targetUserId: targetId },
			{ transaction }
		);
}

async function persist(
	userId: string,
	type: ActivityType,
	targetId?: string,
	metadata?: Record<string, unknown>
) {
	return sequelize.transaction(async transaction => {
		const activity = await Activity.create(
			{ userId, type, metadata },
			{ transaction }
		);
		if (targetId)
			await createTarget(activity.id, type, targetId, transaction);
		return activity;
	});
}

async function persistManyForGames(
	userId: string,
	type: ActivityType,
	gameIds: string[]
) {
	const startedAt = Date.now();
	return sequelize.transaction(async transaction => {
		const activities = await Activity.bulkCreate(
			gameIds.map((_, index) => ({
				userId,
				type,
				createdAt: new Date(startedAt + index)
			})),
			{ transaction }
		);
		await ActivityGame.bulkCreate(
			activities.map((activity, index) => ({
				activityId: activity.id,
				gameId: gameIds[index]
			})),
			{ transaction }
		);
	});
}

const TARGET_INCLUDES = [
	{
		model: ActivityGame,
		include: [
			{
				association: "Game",
				attributes: ["id", "title", "code", "coverUrl", "backgroundUrl"]
			}
		]
	},
	{
		model: ActivityList,
		include: [{ association: "List", attributes: ["id", "name"] }]
	},
	{
		model: ActivityUser,
		include: [
			{
				association: "TargetUser",
				attributes: USER_PUBLIC_ATTRS
			}
		]
	}
];

export async function getUserActivity(
	userId: string,
	limit = DEFAULT_PROFILE_ACTIVITY_LIMIT,
	options: {
		includeSocial?: boolean;
		includePlatinums?: boolean;
		viewerId?: string;
	} = {}
) {
	const where: WhereOptions = {
		userId,
		[Op.and]: [hidesPrivateListsFrom(options.viewerId)]
	};
	const hiddenTypes = [
		...(options.includeSocial ? [] : SOCIAL_TYPES),
		...(options.includePlatinums === false ? PLATINUM_TYPES : [])
	];
	return Activity.findAll({
		where:
			hiddenTypes.length > 0
				? { ...where, type: { [Op.notIn]: hiddenTypes } }
				: where,
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

const PRIVATE_LIST_TARGET_SQL = `EXISTS (SELECT 1 FROM "ActivityLists" AS "private_target" INNER JOIN "Lists" AS "private_list" ON "private_list"."id" = "private_target"."listId" WHERE "private_target"."activityId" = "Activity"."id" AND "private_list"."isPublic" = false)`;

function hidesPrivateListsFrom(viewerId?: string) {
	const ownActivity = viewerId
		? `"Activity"."userId" = ${sequelize.escape(viewerId)} OR `
		: "";
	return literal(`(${ownActivity}NOT ${PRIVATE_LIST_TARGET_SQL})`);
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
	limit = DEFAULT_FEED_LIMIT,
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
			[Op.and]: [
				platinumActivityVisibleCondition(userId),
				hidesPrivateListsFrom(userId)
			]
		},
		include: [
			{
				association: "User",
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

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await ActivityGame.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}

export async function findActivitiesForDataExport(userId: string) {
	return Activity.findAll({
		where: { userId },
		include: TARGET_INCLUDES,
		order: CHRONOLOGICAL_ORDER
	});
}

export async function deleteActivitiesTargetingUser(
	targetUserId: string,
	transaction: Transaction
) {
	const targetingActivities = await ActivityUser.findAll({
		where: { targetUserId },
		attributes: ["activityId"],
		transaction
	});
	const activityIds = targetingActivities.map(target => target.activityId);
	if (activityIds.length === 0) return 0;
	return Activity.destroy({ where: { id: activityIds }, transaction });
}
