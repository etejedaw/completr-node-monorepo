import { Op } from "sequelize";
import { Game } from "../games/game.model";
import { Genre } from "../genres/genres.model";
import { Platform } from "../platforms/platform.model";
import { User } from "../users";
import { RegisterGameShelfDto } from "./dtos/register-game-shelf.dto";
import { UpdateGameShelfDto } from "./dtos/update-game-shelf.dto";
import { GameShelf } from "./game-shelf.model";
import { PaginationQuery } from "../common/schemas/pagination-query.schema";
import { PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import * as gameShelfServiceError from "./errors/game-shelf.service-error";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";

export async function registerGameShelf(
	userId: string,
	registerGameShelfDto: RegisterGameShelfDto
) {
	try {
		return await GameShelf.create({ ...registerGameShelfDto, userId });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameShelfServiceError.uniqueConstraintError,
			validation: gameShelfServiceError.validationError
		});
	}
}

export async function findGameShelfById(id: string) {
	return await GameShelf.findOne({ where: { id } });
}

export async function findGameShelfByUserId(userId: string) {
	return await GameShelf.findAll({
		where: { userId },
		include: [
			{ model: Game, include: [{ model: Genre }] },
			{ model: Platform },
			{ model: User }
		]
	});
}

export async function findGameShelfByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {}
) {
	const gameInclude: Record<string, unknown> = {
		model: Game,
		include: [{ model: Genre }]
	};
	if (pagination.search) {
		gameInclude.where = {
			title: { [Op.iLike]: `%${pagination.search}%` }
		};
	}

	const query: Record<string, unknown> = {
		where: { userId },
		include: [gameInclude, { model: Platform }, { model: User }],
		distinct: true
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await GameShelf.findAndCountAll(query);
	return { rows, total: count };
}

export async function findPublicGameShelfByUserId(
	userId: string,
	pagination: PaginationQuery = {}
) {
	const query: Record<string, unknown> = {
		where: { userId, isPublic: true },
		include: [
			{ model: Game, include: [{ model: Genre }] },
			{ model: Platform },
			{ model: User }
		],
		distinct: true
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await GameShelf.findAndCountAll(query);
	return { rows, total: count };
}

export async function updateGameShelf(
	id: string,
	userId: string,
	updateGameShelfDto: UpdateGameShelfDto
) {
	const gameShelf = await findGameShelfById(id);
	if (!gameShelf) throw gameShelfServiceError.notFoundError();
	if (gameShelf.userId !== userId)
		throw gameShelfServiceError.forbiddenError();

	await gameShelf.update(updateGameShelfDto);
	return gameShelf;
}

export async function removeGameShelf(id: string, userId: string) {
	const gameShelf = await findGameShelfById(id);
	if (!gameShelf) return false;
	if (gameShelf.userId !== userId) return false;

	await GameShelf.destroy({ where: { id, userId } });
	return true;
}
