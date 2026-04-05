import { Op } from "sequelize";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Backlog } from "./backlog.model";
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

function buildOrder(filters: BacklogQuery): [string, string][] {
	const sortBy = filters.sort_by ?? "createdAt";
	const sortOrder = filters.sort_order ?? "DESC";
	return [[sortBy, sortOrder.toUpperCase()]];
}

export async function findBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	return Backlog.findAll({
		where: buildWhere({ userId }, filters),
		include: [{ model: Game }, { model: Platform }],
		order: buildOrder(filters)
	});
}

export async function findPublicBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	return Backlog.findAll({
		where: buildWhere({ userId, isPublic: true }, filters),
		include: [{ model: Game }, { model: Platform }],
		order: buildOrder(filters)
	});
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
	return backlogEntry;
}

export async function removeBacklog(id: string, userId: string) {
	const backlogEntry = await Backlog.findOne({ where: { id } });
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	await Backlog.destroy({ where: { id } });
	return true;
}
