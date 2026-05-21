import { Op, Order, literal, QueryTypes } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Backlog } from "./backlog.model";
import { Queue } from "../queue/queue.model";
import { RegisterBacklogDto } from "./dtos/register-backlog.dto";
import { UpdateBacklogDto } from "./dtos/update-backlog.dto";
import { BacklogQuery } from "./schemas/backlog-query.schema";
import * as backlogServiceError from "./errors/backlog.service-error";

export async function createBacklog(
	userId: string,
	registerBacklog: RegisterBacklogDto
) {
	const backlogEntry = await Backlog.create({
		...registerBacklog,
		userId
	});

	await backlogEntry.reload({
		include: [{ model: Game }, { model: Platform }]
	});
	return backlogEntry;
}

export async function findBacklogById(id: string) {
	return Backlog.findOne({
		where: { id },
		include: [{ model: Game }, { model: Platform }]
	});
}

function buildRangeFilter(min?: number, max?: number) {
	if (!min && !max) return undefined;
	const filter: Record<symbol, number> = {};
	if (min) filter[Op.gte] = min;
	if (max) filter[Op.lte] = max;
	return filter;
}

function buildDateFilter(from?: string, to?: string) {
	if (!from && !to) return undefined;
	const filter: Record<symbol, Date> = {};
	if (from) filter[Op.gte] = new Date(from);
	if (to) filter[Op.lte] = new Date(to);
	return filter;
}

function buildWhere(base: Record<string, unknown>, filters: BacklogQuery) {
	const where: Record<string, unknown> = { ...base };

	if (filters.status)
		where.status =
			filters.status.length === 1
				? filters.status[0]
				: { [Op.in]: filters.status };
	if (filters.game_id) where.gameId = filters.game_id;
	if (filters.platform_id) where.platformId = filters.platform_id;

	const startedAt = buildDateFilter(filters.started_from, filters.started_to);
	if (startedAt) where.startedAt = startedAt;

	if (filters.no_finished_date) {
		where.finishedAt = { [Op.is]: null };
	} else {
		const finishedAt = buildDateFilter(
			filters.finished_from,
			filters.finished_to
		);
		if (finishedAt) where.finishedAt = finishedAt;
	}

	const score = buildRangeFilter(filters.min_score, filters.max_score);
	if (score) where.score = score;

	const duration = buildRangeFilter(
		filters.min_duration,
		filters.max_duration
	);
	if (duration) where.duration = duration;

	const realDuration = buildRangeFilter(
		filters.min_real_duration,
		filters.max_real_duration
	);
	if (realDuration) where.realDuration = realDuration;

	const userRating = buildRangeFilter(filters.min_rating, filters.max_rating);
	if (userRating) where.userRating = userRating;

	return where;
}

function buildIncludes(filters: BacklogQuery) {
	const gameInclude: Record<string, unknown> = { model: Game };
	if (filters.search) {
		gameInclude.where = {
			title: { [Op.iLike]: `%${filters.search}%` }
		};
	}
	return [gameInclude, { model: Platform }];
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

	await backlogEntry.update(updateBacklog);

	let queueRemoved = false;
	if (
		updateBacklog.status === "completed" ||
		updateBacklog.status === "abandoned"
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
	const backlogEntry = await Backlog.findOne({ where: { id } });
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	await Backlog.destroy({ where: { id } });
	return true;
}
