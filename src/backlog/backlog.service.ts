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

export async function findBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	const where: Record<string, unknown> = { userId };

	if (filters.status) where.status = filters.status;
	if (filters.game_id) where.gameId = filters.game_id;

	if (filters.from || filters.to) {
		const dateFilter: Record<symbol, Date> = {};
		if (filters.from) dateFilter[Op.gte] = new Date(filters.from);
		if (filters.to) dateFilter[Op.lte] = new Date(filters.to);
		where.finishedAt = dateFilter;
	}

	return Backlog.findAll({
		where,
		include: [{ model: Game }, { model: Platform }],
		order: [["createdAt", "DESC"]]
	});
}

export async function findPublicBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	const where: Record<string, unknown> = { userId, isPublic: true };

	if (filters.status) where.status = filters.status;
	if (filters.game_id) where.gameId = filters.game_id;

	if (filters.from || filters.to) {
		const dateFilter: Record<symbol, Date> = {};
		if (filters.from) dateFilter[Op.gte] = new Date(filters.from);
		if (filters.to) dateFilter[Op.lte] = new Date(filters.to);
		where.finishedAt = dateFilter;
	}

	return Backlog.findAll({
		where,
		include: [{ model: Game }, { model: Platform }],
		order: [["createdAt", "DESC"]]
	});
}

export async function updateBacklog(
	id: string,
	userId: string,
	dto: UpdateBacklogDto
) {
	const backlogEntry = await Backlog.findOne({ where: { id } });
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	await backlogEntry.update(dto);
	return findBacklogById(id);
}

export async function removeBacklog(id: string, userId: string) {
	const backlogEntry = await Backlog.findOne({ where: { id } });
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	await Backlog.destroy({ where: { id } });
	return true;
}

export async function countBacklogByUserAndGame(
	userId: string,
	gameId: string
) {
	return Backlog.count({ where: { userId, gameId } });
}
