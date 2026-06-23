import { Op, Order, literal, QueryTypes } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { User } from "../users/user.model";
import { Backlog } from "./backlog.model";
import { Queue } from "../queue/queue.model";
import * as gamesService from "../games/games.service";
import { RegisterBacklogDto } from "./dtos/register-backlog.dto";
import { UpdateBacklogDto } from "./dtos/update-backlog.dto";
import { BacklogQuery } from "./schemas/backlog-query.schema";
import * as backlogServiceError from "./errors/backlog.service-error";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import {
	buildDateRangeWhere,
	buildRangeWhere
} from "../common/utils/sequelize-range.util";

const BACKLOG_GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
const BACKLOG_PLATFORM_ATTRS = ["id", "abbreviation"];

const backlogInclude = [
	{ model: Game, attributes: BACKLOG_GAME_ATTRS },
	{ model: Platform, attributes: BACKLOG_PLATFORM_ATTRS },
	{
		model: Game,
		as: "CompilationGame",
		attributes: BACKLOG_GAME_ATTRS,
		required: false
	}
];

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

export async function createBacklog(
	userId: string,
	registerBacklog: RegisterBacklogDto
) {
	if (registerBacklog.compilationGameId) {
		await assertCompilationContext(
			registerBacklog.gameId,
			registerBacklog.compilationGameId
		);
	}

	let backlogEntry: Backlog;
	try {
		backlogEntry = await Backlog.create({
			...registerBacklog,
			userId
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: backlogServiceError.uniqueConstraintError,
			validation: backlogServiceError.validationError
		});
	}

	await backlogEntry.reload({ include: backlogInclude });
	return backlogEntry;
}

export async function findBacklogById(id: string) {
	return Backlog.findOne({
		where: { id },
		include: backlogInclude
	});
}

function buildWhere(base: Record<string, unknown>, filters: BacklogQuery) {
	const where: Record<string, unknown> = { ...base };
	const andConditions: object[] = [];

	if (filters.status)
		where.status =
			filters.status.length === 1
				? filters.status[0]
				: { [Op.in]: filters.status };
	if (filters.game_id) where.gameId = filters.game_id;
	if (filters.platform_id) where.platformId = filters.platform_id;

	if (filters.platforms && filters.platforms.length > 0) {
		const escaped = filters.platforms
			.map(p => sequelize.escape(p))
			.join(", ");
		andConditions.push({
			platformId: {
				[Op.in]: literal(
					`(SELECT id FROM "Platforms" WHERE code IN (${escaped}))`
				)
			}
		});
	}

	if (filters.genres && filters.genres.length > 0) {
		const escaped = filters.genres.map(g => sequelize.escape(g)).join(", ");
		andConditions.push({
			gameId: {
				[Op.in]: literal(
					`(SELECT DISTINCT gg."gameId" FROM "GameGenres" gg JOIN "Genres" g ON g.id = gg."genreId" WHERE g.code IN (${escaped}))`
				)
			}
		});
	}

	if (
		filters.release_year_from !== undefined ||
		filters.release_year_to !== undefined
	) {
		const conditions: string[] = [];
		if (filters.release_year_from !== undefined)
			conditions.push(
				`EXTRACT(YEAR FROM g."releaseAt") >= ${filters.release_year_from}`
			);
		if (filters.release_year_to !== undefined)
			conditions.push(
				`EXTRACT(YEAR FROM g."releaseAt") <= ${filters.release_year_to}`
			);
		andConditions.push({
			gameId: {
				[Op.in]: literal(
					`(SELECT g.id FROM "Games" g WHERE ${conditions.join(" AND ")})`
				)
			}
		});
	}

	const startedAt = buildDateRangeWhere(
		filters.started_from,
		filters.started_to
	);
	if (startedAt) where.startedAt = startedAt;

	if (filters.no_finished_date) {
		where.finishedAt = { [Op.is]: null };
	} else {
		const finishedAt = buildDateRangeWhere(
			filters.finished_from,
			filters.finished_to
		);
		if (finishedAt) where.finishedAt = finishedAt;
	}

	const score = buildRangeWhere(filters.min_score, filters.max_score);
	if (score) where.score = score;

	const duration = buildRangeWhere(
		filters.min_duration,
		filters.max_duration
	);
	if (duration) where.duration = duration;

	const realDuration = buildRangeWhere(
		filters.min_real_duration,
		filters.max_real_duration
	);
	if (realDuration) where.realDuration = realDuration;

	const userRating = buildRangeWhere(filters.min_rating, filters.max_rating);
	if (userRating) where.userRating = userRating;

	if (filters.min_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."duration", 0)) >= ${filters.min_ratio}`
			)
		);
	if (filters.max_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."duration", 0)) <= ${filters.max_ratio}`
			)
		);
	if (filters.min_personal_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) >= ${filters.min_personal_ratio}`
			)
		);
	if (filters.max_personal_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) <= ${filters.max_personal_ratio}`
			)
		);

	if (andConditions.length > 0)
		where[Op.and as unknown as string] = andConditions;

	return where;
}

function buildIncludes(filters: BacklogQuery) {
	const gameInclude: Record<string, unknown> = {
		model: Game,
		attributes: BACKLOG_GAME_ATTRS
	};
	if (filters.search) {
		gameInclude.where = {
			title: { [Op.iLike]: `%${filters.search}%` }
		};
	}
	return [
		gameInclude,
		{ model: Platform, attributes: BACKLOG_PLATFORM_ATTRS },
		{
			model: Game,
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
		| "ASC"
		| "DESC";

	if (sortBy === "title") {
		return [[Game, "title", sortOrder]];
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

export async function countBacklogByStatus(userId: string, publicOnly = false) {
	const where: Record<string, unknown> = { userId };
	if (publicOnly) where.isPublic = true;
	const rows = (await Backlog.findAll({
		where,
		attributes: [
			"status",
			[sequelize.fn("COUNT", sequelize.col("id")), "count"]
		],
		group: ["status"],
		raw: true
	})) as unknown as { status: string; count: string }[];

	const result = {
		not_started: 0,
		playing: 0,
		completed: 0,
		abandoned: 0,
		endless: 0,
		total: 0
	};
	for (const row of rows) {
		const n = Number(row.count);
		if (row.status in result) {
			result[row.status as keyof typeof result] = n;
		}
		result.total += n;
	}
	return result;
}

export async function findBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	const query: Record<string, unknown> = {
		where: buildWhere({ userId }, filters),
		include: buildIncludes(filters),
		order: buildOrder(filters),
		limit: filters.limit ?? 100,
		offset: filters.offset ?? 0
	};

	const { rows, count } = await Backlog.findAndCountAll(query);
	return { rows, total: count };
}

export async function findFriendsActivityForGame(
	friendIds: string[],
	gameId: string
) {
	if (friendIds.length === 0) return [];

	const rows = await Backlog.findAll({
		where: { gameId, isPublic: true, userId: { [Op.in]: friendIds } },
		include: [
			{
				model: User,
				where: {
					profileVisibility: { [Op.in]: ["public", "friends"] },
					backlogVisibility: { [Op.in]: ["public", "friends"] }
				},
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		],
		order: [["createdAt", "DESC"]]
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
	limit = 10
) {
	const excluded = [...new Set([viewerId, ...excludeUserIds])];

	const rows = await Backlog.findAll({
		where: { gameId, isPublic: true, userId: { [Op.notIn]: excluded } },
		include: [
			{
				model: User,
				where: {
					profileVisibility: { [Op.in]: ["public", "friends"] },
					backlogVisibility: { [Op.in]: ["public", "friends"] }
				},
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		],
		order: [["createdAt", "DESC"]]
	});

	const byUser = new Map<string, (typeof rows)[number]>();
	for (const row of rows) {
		if (!byUser.has(row.userId)) byUser.set(row.userId, row);
	}

	const unique = Array.from(byUser.values());
	for (let i = unique.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = unique[i]!;
		unique[i] = unique[j]!;
		unique[j] = tmp;
	}
	return unique.slice(0, limit);
}

export async function findCommonCompletedGames(
	viewerId: string,
	targetId: string
) {
	const viewerCompleted = await Backlog.findAll({
		where: { userId: viewerId, status: "completed" },
		attributes: ["gameId"]
	});
	const viewerGameIds = [...new Set(viewerCompleted.map(row => row.gameId))];
	if (viewerGameIds.length === 0) return [];

	const targetCompleted = await Backlog.findAll({
		where: {
			userId: targetId,
			status: "completed",
			isPublic: true,
			gameId: { [Op.in]: viewerGameIds }
		},
		include: [
			{
				model: Game,
				attributes: ["id", "code", "title", "backgroundUrl"]
			}
		],
		order: [["finishedAt", "DESC"]]
	});

	const seen = new Set<string>();
	return targetCompleted.filter(row => {
		if (seen.has(row.gameId)) return false;
		seen.add(row.gameId);
		return true;
	});
}

export async function findHighlightsByUserId(
	userId: string,
	includePrivate: boolean,
	options: { recentLimit?: number; year?: number; month?: number } = {}
) {
	const { recentLimit = 6 } = options;
	const now = new Date();
	const targetYear = options.year ?? now.getUTCFullYear();
	const targetMonth =
		options.month !== undefined ? options.month - 1 : now.getUTCMonth();
	const monthStart = new Date(Date.UTC(targetYear, targetMonth, 1));
	const monthEnd = new Date(
		Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)
	);

	const baseWhere: Record<string, unknown> = {
		userId,
		status: "completed",
		finishedAt: { [Op.ne]: null }
	};
	if (!includePrivate) baseWhere.isPublic = true;

	const recent = await Backlog.findAll({
		where: baseWhere,
		include: backlogInclude,
		order: [["finishedAt", "DESC"]],
		limit: recentLimit
	});

	const monthEntries = await Backlog.findAll({
		where: {
			...baseWhere,
			finishedAt: { [Op.gte]: monthStart, [Op.lte]: monthEnd }
		},
		include: backlogInclude,
		order: [["finishedAt", "DESC"]]
	});

	let mostPlayed: Backlog | null = null;
	let highestRated: Backlog | null = null;
	for (const entry of monthEntries) {
		if (
			entry.realDuration != null &&
			(mostPlayed == null ||
				(mostPlayed.realDuration ?? 0) < entry.realDuration)
		) {
			mostPlayed = entry;
		}
		if (
			entry.userRating != null &&
			(highestRated == null ||
				(highestRated.userRating ?? 0) < entry.userRating)
		) {
			highestRated = entry;
		}
	}

	return {
		recent,
		month: {
			startsAt: monthStart,
			endsAt: monthEnd,
			completedCount: monthEntries.length,
			mostPlayed,
			highestRated
		}
	};
}

export async function findCompletionsByUserIdPaginated(
	userId: string,
	includePrivate: boolean,
	options: { limit?: number; offset?: number } = {}
) {
	const { limit = 20, offset = 0 } = options;
	const where: Record<string, unknown> = {
		userId,
		status: "completed",
		finishedAt: { [Op.ne]: null }
	};
	if (!includePrivate) where.isPublic = true;

	const { rows, count } = await Backlog.findAndCountAll({
		where,
		include: backlogInclude,
		order: [["finishedAt", "DESC"]],
		limit,
		offset,
		distinct: true
	});

	return { rows, total: count };
}

export async function findPublicBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	const query: Record<string, unknown> = {
		where: buildWhere({ userId, isPublic: true }, filters),
		include: buildIncludes(filters),
		order: buildOrder(filters),
		limit: filters.limit ?? 100,
		offset: filters.offset ?? 0
	};

	const { rows, count } = await Backlog.findAndCountAll(query);
	return { rows, total: count };
}

export async function updateBacklog(
	id: string,
	userId: string,
	updateBacklog: UpdateBacklogDto
) {
	const backlogEntry = await findBacklogById(id);
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	if (
		updateBacklog.compilationGameId !== undefined &&
		updateBacklog.compilationGameId !== null
	) {
		await assertCompilationContext(
			backlogEntry.gameId,
			updateBacklog.compilationGameId
		);
	}

	await backlogEntry.update(updateBacklog);

	let queueRemoved = false;
	if (
		updateBacklog.status === "playing" ||
		updateBacklog.status === "completed" ||
		updateBacklog.status === "abandoned" ||
		updateBacklog.status === "endless"
	) {
		const deletedCount = await Queue.destroy({
			where: { backlogId: id }
		});
		queueRemoved = deletedCount > 0;
	}

	return { backlog: backlogEntry, queueRemoved };
}

export async function findLatestCompletedDurations(
	pairs: { userId: string; gameId: string }[]
): Promise<Map<string, number>> {
	if (pairs.length === 0) return new Map();

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

export async function removeBacklog(id: string, userId: string) {
	const backlogEntry = await Backlog.findOne({
		where: { id },
		attributes: ["id", "userId"]
	});
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	await Backlog.destroy({ where: { id } });
	return true;
}
