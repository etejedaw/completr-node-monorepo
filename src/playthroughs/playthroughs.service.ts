import { Op } from "sequelize";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Playthrough } from "./playthrough.model";
import { RegisterPlaythroughDto } from "./dtos/register-playthrough.dto";
import { UpdatePlaythroughDto } from "./dtos/update-playthrough.dto";
import * as playthroughServiceError from "./errors/playthroughs.service-error";

export async function createPlaythrough(
	userId: string,
	dto: RegisterPlaythroughDto
) {
	const playthrough = await Playthrough.create({ ...dto, userId });
	await playthrough.reload({
		include: [{ model: Game }, { model: Platform }]
	});
	return playthrough;
}

export async function findPlaythroughById(id: string) {
	return Playthrough.findOne({
		where: { id },
		include: [{ model: Game }, { model: Platform }]
	});
}

export async function findPlaythroughsByUserId(
	userId: string,
	filters: {
		status?: string;
		game_id?: string;
		from?: string;
		to?: string;
	} = {}
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

	return Playthrough.findAll({
		where,
		include: [{ model: Game }, { model: Platform }],
		order: [["createdAt", "DESC"]]
	});
}

export async function findPublicPlaythroughsByUserId(
	userId: string,
	filters: {
		status?: string;
		game_id?: string;
		from?: string;
		to?: string;
	} = {}
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

	return Playthrough.findAll({
		where,
		include: [{ model: Game }, { model: Platform }],
		order: [["createdAt", "DESC"]]
	});
}

export async function updatePlaythrough(
	id: string,
	userId: string,
	dto: UpdatePlaythroughDto
) {
	const playthrough = await Playthrough.findOne({ where: { id } });
	if (!playthrough) throw playthroughServiceError.notFoundError();
	if (playthrough.userId !== userId)
		throw playthroughServiceError.forbiddenError();

	await playthrough.update(dto);
	return findPlaythroughById(id);
}

export async function removePlaythrough(id: string, userId: string) {
	const playthrough = await Playthrough.findOne({ where: { id } });
	if (!playthrough) throw playthroughServiceError.notFoundError();
	if (playthrough.userId !== userId)
		throw playthroughServiceError.forbiddenError();

	await Playthrough.destroy({ where: { id } });
	return true;
}

export async function countPlaythroughsByUserAndGame(
	userId: string,
	gameId: string
) {
	return Playthrough.count({ where: { userId, gameId } });
}
