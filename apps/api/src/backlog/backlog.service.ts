import {
	col,
	fn,
	type IncludeOptions,
	literal,
	Op,
	type Order,
	QueryTypes,
	type Transaction
} from "sequelize";

import * as backlogProgressService from "../backlog-progress/backlog-progress.service";
import { CHRONOLOGICAL_ORDER } from "../common/constants/chronological-order.constants";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type BulkResult } from "../common/interfaces/bulk-result.interface";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { splitByPresence } from "../common/utils/split-by-presence.util";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { toBulkSkipped } from "../common/utils/to-bulk-skipped.util";
import { sequelize } from "../database/sequelize.database";
import * as gameShelfService from "../game-shelf/game-shelf.service";
import { GAME_REFERENCE_ATTRS } from "../games/games.constants";
import * as gamesService from "../games/games.service";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import * as platformsService from "../platforms/platforms.service";
import * as queueService from "../queue/queue.service";
import * as reviewsService from "../reviews/reviews.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import { sectionVisibleToViewerSql } from "../users/helpers/visibility.helper";
import * as usersService from "../users/services/users.service";
import { BACKLOG_GAME_ATTRS, BACKLOG_PLATFORM_ATTRS, DEFAULT_BACKLOG_PAGE_SIZE, RANDOM_PLAYERS_DEFAULT_LIMIT } from "./backlog.constants";
import { type BacklogSummary, type CreatedBacklog } from "./backlog.interface";
import { Backlog } from "./backlog.model";
import { type BacklogFields, type BacklogReview } from "./backlog.types";
import { type BulkUpdateBacklogDto } from "./dtos/bulk-update-backlog.dto";
import { type RegisterBacklogDto } from "./dtos/register-backlog.dto";
import { type UpdateBacklogDto } from "./dtos/update-backlog.dto";
import * as backlogServiceError from "./errors/backlog.service-error";
import { type BacklogExportQuery } from "./schemas/backlog-export-query.schema";
import { type BacklogQuery } from "./schemas/backlog-query.schema";
import { buildBacklogInclude } from "./utils/build-backlog-include.util";
import { buildBacklogWhere } from "./utils/build-backlog-where.util";
import { leavesQueue } from "./utils/leaves-queue.util";

async function assertCompilationContext(
	gameId: string,
	compilationGameId: string
) {
	if (!(await gamesService.existsActiveCompilation(compilationGameId)))
		throw backlogServiceError.compilationContextInvalidError();

	if (
		!(await gamesService.gameBelongsToCompilation(
			gameId,
			compilationGameId
		))
	)
		throw backlogServiceError.compilationContextInvalidError();
}

async function insertBacklog(
	userId: string,
	backlogFields: BacklogFields,
	transaction: Transaction
) {
	try {
		const backlogEntry = await Backlog.create(
			{ ...backlogFields, userId },
			{ transaction }
		);
		await backlogEntry.reload({ include: buildBacklogInclude(), transaction });
		return backlogEntry;
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: backlogServiceError.uniqueConstraintError,
			validation: backlogServiceError.validationError
		});
	}
}

async function createReviewIfMissing(
	userId: string,
	gameId: string,
	review: BacklogReview,
	transaction: Transaction
) {
	const existing = await reviewsService.findReviewByUserAndGame(
		userId,
		gameId,
		transaction
	);
	if (existing) return false;

	await reviewsService.createReview(userId, gameId, review, transaction);
	return true;
}

async function addToShelfIfMissing(
	user: RequestUser,
	backlogEntry: Backlog,
	transaction: Transaction
) {
	const { gameId, platformId } = backlogEntry;
	if (
		await gameShelfService.existsGameShelfEntry(
			user.id,
			gameId,
			platformId,
			transaction
		)
	)
		return false;

	await gameShelfService.registerGameShelf(
		user,
		{ gameId, platformId },
		transaction
	);
	return true;
}

export async function createBacklog(
	user: RequestUser,
	registerBacklog: RegisterBacklogDto
): Promise<CreatedBacklog> {
	const {
		addToQueue,
		addToShelf,
		moodTags,
		review,
		progressNote,
		...backlogFields
	} = registerBacklog;

	if (backlogFields.compilationGameId) {
		await assertCompilationContext(
			backlogFields.gameId,
			backlogFields.compilationGameId
		);
	}

	return sequelize.transaction(async transaction => {
		const backlogEntry = await insertBacklog(
			user.id,
			backlogFields,
			transaction
		);
		const { id, gameId } = backlogEntry;

		const reviewCreated = review
			? await createReviewIfMissing(user.id, gameId, review, transaction)
			: false;
		if (moodTags)
			await moodTagsService.replaceTags(
				user,
				gameId,
				moodTags,
				transaction
			);
		if (progressNote)
			await backlogProgressService.addProgress(
				user.id,
				id,
				progressNote,
				transaction
			);
		if (addToQueue)
			await queueService.addFromBacklog(id, user, transaction);
		const addedToShelf = addToShelf
			? await addToShelfIfMissing(user, backlogEntry, transaction)
			: false;

		return {
			backlog: backlogEntry,
			reviewCreated,
			addedToQueue: addToQueue === true,
			addedToShelf
		};
	});
}

export async function findBacklogById(id: string, transaction?: Transaction) {
	return Backlog.findOne({
		where: { id },
		include: buildBacklogInclude(),
		transaction
	});
}

export async function findBacklogBasicById(
	id: string,
	transaction?: Transaction
) {
	return Backlog.findOne({ where: { id }, transaction });
}

export async function findBacklogsByUserAndIds(
	userId: string,
	ids: string[],
	transaction?: Transaction
) {
	if (ids.length === 0) return [];
	return Backlog.findAll({ where: { id: ids, userId }, transaction });
}

export async function findGameIdsInBacklogByUser(
	userId: string,
	gameIds: string[]
) {
	if (gameIds.length === 0) return [];
	const rows = await Backlog.findAll({
		where: { userId, gameId: gameIds },
		attributes: ["gameId"],
		group: ["gameId"]
	});
	return rows.map(row => row.gameId);
}

export async function findBacklogSummariesByUserAndGameIds(
	userId: string,
	gameIds: string[],
	publicOnly = false
): Promise<BacklogSummary[]> {
	if (gameIds.length === 0) return [];

	return sequelize.query<BacklogSummary>(
		`SELECT DISTINCT ON ("gameId") "gameId", status, score, "realDuration"
		 FROM "Backlogs"
		 WHERE "userId" = :userId AND "gameId" IN (:gameIds)${
				publicOnly ? ` AND "isPublic" = true` : ""
			}
		 ORDER BY "gameId",
		   CASE status
		     WHEN 'completed' THEN 1
		     WHEN 'playing' THEN 2
		     WHEN 'endless' THEN 2
		     WHEN 'abandoned' THEN 3
		     WHEN 'not_started' THEN 4
		   END,
		   "createdAt" DESC`,
		{
			replacements: { userId, gameIds },
			type: QueryTypes.SELECT
		}
	);
}

export async function countDistinctGamesByUserStatusAndGameIds(
	userId: string,
	gameIds: string[],
	statuses: string[],
	publicOnly = false
) {
	if (gameIds.length === 0 || statuses.length === 0) return 0;
	const where: Record<string, unknown> = {
		userId,
		gameId: { [Op.in]: gameIds },
		status: { [Op.in]: statuses }
	};
	if (publicOnly) where.isPublic = true;
	return Backlog.count({ where, distinct: true, col: "gameId" });
}

export async function findDistinctGameIdsByUserAndStatuses(
	userId: string,
	statuses: string[],
	publicOnly = false
) {
	if (statuses.length === 0) return [];
	const where: Record<string, unknown> = {
		userId,
		status: { [Op.in]: statuses }
	};
	if (publicOnly) where.isPublic = true;

	const rows = (await Backlog.findAll({
		where,
		attributes: [[fn("DISTINCT", col("gameId")), "gameId"]],
		raw: true
	})) as unknown as { gameId: string }[];
	return rows.map(row => row.gameId);
}

export async function findAggregatedRealDurationsByGame() {
	return (await Backlog.findAll({
		attributes: [
			"gameId",
			[sequelize.fn("AVG", sequelize.col("realDuration")), "avgDuration"],
			[sequelize.fn("COUNT", sequelize.col("realDuration")), "entryCount"]
		],
		where: { realDuration: { [Op.not]: null, [Op.gt]: 0 } },
		group: ["gameId"],
		raw: true
	})) as unknown as {
		gameId: string;
		avgDuration: number;
		entryCount: number;
	}[];
}

export async function createNotStartedBacklog(
	userId: string,
	gameId: string,
	platformId: string,
	transaction: Transaction
) {
	return Backlog.create(
		{ userId, gameId, platformId, status: "not_started" },
		{ transaction }
	);
}

const QUEUE_PLATFORM_ATTRS = ["id", "abbreviation"];

export function buildQueueBacklogInclude(
	search?: string,
	publicOnly = false
): IncludeOptions[] {
	const titleWhere = search
		? buildTextSearchWhere(search, ["Backlog->Game.title"])
		: null;
	if (titleWhere) {
		return [
			{
				model: Backlog,
				required: true,
				where: publicOnly ? { isPublic: true } : undefined,
				include: [
					{
						...gamesService.gameInclude(),
						required: true,
						attributes: BACKLOG_GAME_ATTRS,
						where: titleWhere
					},
					{ ...platformsService.platformInclude(), attributes: QUEUE_PLATFORM_ATTRS }
				]
			}
		];
	}

	return [
		{
			model: Backlog,
			...(publicOnly && { required: true, where: { isPublic: true } }),
			include: [
				{ ...gamesService.gameInclude(), attributes: BACKLOG_GAME_ATTRS },
				{ ...platformsService.platformInclude(), attributes: QUEUE_PLATFORM_ATTRS }
			]
		}
	];
}

export function buildQueueExportBacklogInclude(
	search?: string
): IncludeOptions[] {
	const titleWhere = search
		? buildTextSearchWhere(search, ["Backlog->Game.title"])
		: null;
	return [
		{
			model: Backlog,
			attributes: ["id", "status", "score", "duration"],
			required: titleWhere !== null,
			include: [
				{
					...gamesService.gameInclude(),
					attributes: ["id", "title"],
					...(titleWhere && { required: true, where: titleWhere })
				},
				{ ...platformsService.platformInclude(), attributes: ["id", "name"] }
			]
		}
	];
}

function buildIncludes(filters: BacklogQuery) {
	const gameInclude: Record<string, unknown> = {
		...gamesService.gameInclude(),
		attributes: BACKLOG_GAME_ATTRS
	};
	const titleWhere = filters.search
		? buildTextSearchWhere(filters.search, ["Game.title"])
		: null;
	if (titleWhere) gameInclude.where = titleWhere;
	return [
		gameInclude,
		{ ...platformsService.platformInclude(), attributes: BACKLOG_PLATFORM_ATTRS },
		{
			...gamesService.gameInclude(),
			as: "CompilationGame",
			attributes: BACKLOG_GAME_ATTRS,
			required: false
		}
	];
}

const NULLABLE_SORT_FIELDS = new Set([
	"startedAt",
	"finishedAt",
	"realDuration",
	"userRating",
	"score",
	"duration"
]);

function buildOrder(filters: BacklogQuery): Order {
	const sortBy = filters.sort_by ?? "createdAt";
	const sortOrder = (filters.sort_order ?? "desc").toUpperCase() as
		"ASC" | "DESC";

	if (sortBy === "title") {
		return [gamesService.gameTitleOrder(sortOrder)];
	}
	if (sortBy === "ratio") {
		return [
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."duration", 0)) ${sortOrder} NULLS LAST`
			)
		];
	}
	if (sortBy === "personalRatio") {
		return [
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) ${sortOrder} NULLS LAST`
			)
		];
	}
	if (NULLABLE_SORT_FIELDS.has(sortBy)) {
		return [literal(`"Backlog"."${sortBy}" ${sortOrder} NULLS LAST`)];
	}
	return [[sortBy, sortOrder]];
}

export async function findBacklogForExport(
	userId: string,
	filters: BacklogExportQuery = {}
) {
	return Backlog.findAll({
		where: buildBacklogWhere({ userId }, filters),
		include: buildIncludes(filters),
		order: buildOrder(filters)
	});
}

async function findBacklogPage(
	baseWhere: Record<string, unknown>,
	filters: BacklogQuery
) {
	const { rows, count } = await Backlog.findAndCountAll({
		where: buildBacklogWhere(baseWhere, filters),
		include: buildIncludes(filters),
		order: buildOrder(filters),
		limit: filters.limit ?? DEFAULT_BACKLOG_PAGE_SIZE,
		offset: filters.offset ?? 0
	});
	return { rows, total: count };
}

export async function findBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	return findBacklogPage({ userId }, filters);
}

export async function findPublicBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	return findBacklogPage({ userId, isPublic: true }, filters);
}

export async function updateBacklog(
	id: string,
	userId: string,
	updateBacklog: UpdateBacklogDto
) {
	return sequelize.transaction(async transaction => {
		await queueService.lockUserQueue(userId, transaction);

		const backlogEntry = await findBacklogById(id, transaction);
		if (!backlogEntry || backlogEntry.userId !== userId)
			throw backlogServiceError.notFoundError();
		const previousStatus = backlogEntry.status;

		if (
			updateBacklog.compilationGameId !== undefined &&
			updateBacklog.compilationGameId !== null
		) {
			await assertCompilationContext(
				backlogEntry.gameId,
				updateBacklog.compilationGameId
			);
		}

		await backlogEntry.update(updateBacklog, { transaction });

		const queueRemoved = leavesQueue(updateBacklog.status)
			? (
					await queueService.removeByBacklogIds(
						[id],
						userId,
						transaction
					)
				).length > 0
			: false;

		return { backlog: backlogEntry, queueRemoved, previousStatus };
	});
}

export async function bulkUpdateBacklog(
	userId: string,
	ids: string[],
	changes: BulkUpdateBacklogDto["changes"]
) {
	return sequelize.transaction(async transaction => {
		await queueService.lockUserQueue(userId, transaction);
		const owned = await findBacklogsByUserAndIds(userId, ids, transaction);
		const { present: succeeded, missing } = splitByPresence(
			ids,
			owned.map(backlog => backlog.id)
		);

		if (succeeded.length > 0)
			await Backlog.update(changes, {
				where: { id: succeeded, userId },
				transaction
			});

		const queueRemoved =
			succeeded.length > 0 && leavesQueue(changes.status)
				? await queueService.removeByBacklogIds(
						succeeded,
						userId,
						transaction
					)
				: [];

		const statusChanged = changes.status
			? owned.filter(backlog => backlog.status !== changes.status)
			: [];

		return {
			succeeded,
			skipped: toBulkSkipped(
				missing,
				backlogServiceError.notFoundError().code
			),
			queueRemoved,
			statusChanged
		};
	});
}

export async function removeBacklog(id: string, userId: string) {
	await sequelize.transaction(async transaction => {
		await queueService.lockUserQueue(userId, transaction);
		const backlogEntry = await Backlog.findOne({
			where: { id, userId },
			attributes: ["id"],
			transaction
		});
		if (!backlogEntry) throw backlogServiceError.notFoundError();

		await destroyOwnedBacklogs(userId, [id], transaction);
	});
	return true;
}

async function destroyOwnedBacklogs(
	userId: string,
	ids: string[],
	transaction: Transaction
) {
	await queueService.lockUserQueue(userId, transaction);
	await Backlog.destroy({ where: { id: ids, userId }, transaction });
	await queueService.compactPositions(userId, transaction);
}

export async function bulkDeleteBacklog(
	userId: string,
	ids: string[]
): Promise<BulkResult> {
	return sequelize.transaction(async transaction => {
		await queueService.lockUserQueue(userId, transaction);
		const owned = await findBacklogsByUserAndIds(userId, ids, transaction);
		const { present: succeeded, missing } = splitByPresence(
			ids,
			owned.map(backlog => backlog.id)
		);

		if (succeeded.length > 0)
			await destroyOwnedBacklogs(userId, succeeded, transaction);

		return {
			succeeded,
			skipped: toBulkSkipped(
				missing,
				backlogServiceError.notFoundError().code
			)
		};
	});
}

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await Backlog.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}

export async function existsByCompilationGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await Backlog.findOne({
			where: { compilationGameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}

export async function findBacklogForDataExport(userId: string) {
	return Backlog.findAll({
		where: { userId },
		include: [
			{ ...gamesService.gameInclude(), attributes: GAME_REFERENCE_ATTRS },
			{ ...platformsService.platformInclude(), attributes: ["id", "name"] },
			{
				...gamesService.gameInclude(),
				as: "CompilationGame",
				attributes: GAME_REFERENCE_ATTRS,
				required: false
			}
		],
		order: CHRONOLOGICAL_ORDER
	});
}

export async function findFriendsActivityForGame(
	followingIds: string[],
	mutualIds: string[],
	gameId: string
) {
	if (followingIds.length === 0) return [];

	const rows = await Backlog.findAll({
		where: { gameId, isPublic: true, userId: { [Op.in]: followingIds } },
		include: [
			{
				...usersService.userInclude(),
				where: {
					isActive: true,
					[Op.or]: [
						{
							profileVisibility: "public",
							backlogVisibility: "public"
						},
						{
							id: { [Op.in]: mutualIds },
							profileVisibility: {
								[Op.in]: ["public", "friends"]
							},
							backlogVisibility: {
								[Op.in]: ["public", "friends"]
							}
						}
					]
				},
				attributes: USER_PUBLIC_ATTRS
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});

	const seen = new Set<string>();
	return rows.filter(row => {
		if (seen.has(row.userId)) return false;
		seen.add(row.userId);
		return true;
	});
}

export async function findRandomPlayersForGame(
	gameId: string,
	viewerId: string,
	excludeUserIds: string[] = [],
	limit = RANDOM_PLAYERS_DEFAULT_LIMIT
) {
	const excluded = [...new Set([viewerId, ...excludeUserIds])];

	const picked = await sequelize.query<{ id: string }>(
		`SELECT "id" FROM (
			SELECT DISTINCT ON (b."userId") b."id"
			FROM "Backlogs" b
			JOIN "Users" u ON u."id" = b."userId"
			WHERE b."gameId" = :gameId
			  AND b."isPublic" = true
			  AND b."userId" NOT IN (:excluded)
			  AND u."isActive" = true
			  AND u."profileVisibility" = 'public'
			  AND u."backlogVisibility" = 'public'
			ORDER BY b."userId", b."createdAt" DESC, b."id" DESC
		) AS latest
		ORDER BY RANDOM()
		LIMIT :limit`,
		{
			replacements: { gameId, excluded, limit },
			type: QueryTypes.SELECT
		}
	);
	if (picked.length === 0) return [];

	return Backlog.findAll({
		where: { id: picked.map(row => row.id) },
		include: [{ ...usersService.userInclude(), attributes: USER_PUBLIC_ATTRS }]
	});
}

export async function findLatestCompletedDurations(
	pairs: { userId: string; gameId: string }[],
	options: { visibleTo?: string } = {}
): Promise<Map<string, number>> {
	if (pairs.length === 0) return new Map();
	const visibilityFilter = "visibleTo" in options
		? `AND ${sectionVisibleToViewerSql("backlog", options.visibleTo, '"Backlogs"."userId"')}`
		: "";

	const userIds = Array.from(new Set(pairs.map(p => p.userId)));
	const gameIds = Array.from(new Set(pairs.map(p => p.gameId)));

	const rows = await sequelize.query<{
		userId: string;
		gameId: string;
		realDuration: number;
	}>(
		`SELECT DISTINCT ON ("userId", "gameId") "userId", "gameId", "realDuration"
		 FROM "Backlogs"
		 WHERE "userId" IN (:userIds)
		   AND "gameId" IN (:gameIds)
		   AND status = 'completed'
		   AND "realDuration" IS NOT NULL
		   ${visibilityFilter}
		 ORDER BY "userId", "gameId", "createdAt" DESC`,
		{
			replacements: { userIds, gameIds },
			type: QueryTypes.SELECT
		}
	);

	const map = new Map<string, number>();
	for (const row of rows) {
		map.set(`${row.userId}:${row.gameId}`, row.realDuration);
	}
	return map;
}
