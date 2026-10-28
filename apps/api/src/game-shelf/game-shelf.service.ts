import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ExportPlatformSearchQuery } from "../common/schemas/export-platform-search-query.schema";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { type PaginationQuery } from "../common/schemas/pagination-query.schema";
import { buildPlatformFilterWhere } from "../common/utils/platform-filter-where.util";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { type RegisterGameShelfDto } from "./dtos/register-game-shelf.dto";
import { type UpdateGameShelfDto } from "./dtos/update-game-shelf.dto";
import * as gameShelfServiceError from "./errors/game-shelf.service-error";
import { GameShelf } from "./game-shelf.model";

const GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
const PLATFORM_ATTRS = [
	"id",
	"name",
	"code",
	"abbreviation",
	"generation",
	"logoUrl",
	"releaseAt"
];

const FREE_SHELF_LIMIT = 250;

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

const shelfInclude = [
	{ model: Game, attributes: GAME_ATTRS },
	{ model: Platform, attributes: PLATFORM_ATTRS }
];

export async function registerGameShelf(
	user: RequestUser,
	registerGameShelfDto: RegisterGameShelfDto,
	transaction?: Transaction
) {
	if (!isPremium(user.role)) {
		const count = await GameShelf.count({
			where: { userId: user.id },
			transaction
		});
		if (count >= FREE_SHELF_LIMIT)
			throw gameShelfServiceError.limitReachedError();
	}

	try {
		return await GameShelf.create(
			{
				...registerGameShelfDto,
				userId: user.id
			},
			{ transaction }
		);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameShelfServiceError.uniqueConstraintError,
			validation: gameShelfServiceError.validationError
		});
	}
}

export async function existsGameShelfEntry(
	userId: string,
	gameId: string,
	platformId: string,
	transaction?: Transaction
) {
	const count = await GameShelf.count({
		where: { userId, gameId, platformId },
		transaction
	});
	return count > 0;
}

export async function findGameShelfById(id: string) {
	return await GameShelf.findOne({ where: { id } });
}

export async function findGameShelfByUserId(userId: string) {
	return await GameShelf.findAll({
		where: { userId },
		include: shelfInclude
	});
}

export async function findGameEntriesByUserId(
	userId: string,
	publicOnly: boolean,
	gameIds?: string[]
) {
	const where: Record<string, unknown> = { userId };
	if (publicOnly) where.isPublic = true;
	if (gameIds) where.gameId = { [Op.in]: gameIds };

	return GameShelf.findAll({
		where,
		attributes: ["gameId"],
		include: [
			{
				model: Game,
				attributes: ["id", "code", "title", "backgroundUrl"]
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function findGameShelfByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {}
) {
	const gameInclude: Record<string, unknown> = {
		model: Game,
		attributes: GAME_ATTRS
	};
	const titleWhere = pagination.search
		? buildTextSearchWhere(pagination.search, ["Game.title"])
		: null;
	if (titleWhere) gameInclude.where = titleWhere;

	const query: Record<string, unknown> = {
		where: { userId },
		include: [gameInclude, { model: Platform, attributes: PLATFORM_ATTRS }],
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
		include: shelfInclude,
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

export async function findGameShelfForExport(
	userId: string,
	filters: ExportPlatformSearchQuery = {}
) {
	const titleWhere = filters.search
		? buildTextSearchWhere(filters.search, ["Game.title"])
		: null;

	return GameShelf.findAll({
		where: { userId, ...buildPlatformFilterWhere(filters.platform) },
		include: [
			{
				model: Game,
				attributes: ["id", "title"],
				...(titleWhere && { required: true, where: titleWhere })
			},
			{ model: Platform, attributes: ["id", "name"] }
		],
		order: [
			[Game, "title", "ASC"],
			["createdAt", "ASC"]
		]
	});
}

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await GameShelf.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}
