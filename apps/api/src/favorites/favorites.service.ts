import { Op } from "sequelize";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ExportSearchQuery } from "../common/schemas/export-search-query.schema";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import * as favoritesServiceError from "./errors/favorites.service-error";
import { Favorite } from "./favorite.model";

const FREE_FAVORITE_LIMIT = 10;

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

export async function replaceFavorites(user: RequestUser, gameIds: string[]) {
	if (gameIds.length === 0) {
		await Favorite.destroy({ where: { userId: user.id } });
		return [];
	}

	if (!isPremium(user.role) && gameIds.length > FREE_FAVORITE_LIMIT)
		throw favoritesServiceError.limitReachedError();

	const games = await Game.findAll({ where: { id: gameIds } });
	if (games.length !== gameIds.length) {
		const foundIds = new Set(games.map(g => g.id));
		const missing = gameIds.filter(id => !foundIds.has(id));
		throw favoritesServiceError.gamesNotFoundError(missing);
	}

	const entries = gameIds.map((gameId, index) => ({
		userId: user.id,
		gameId,
		position: index + 1
	}));
	await sequelize.transaction(async transaction => {
		await Favorite.destroy({ where: { userId: user.id }, transaction });
		await Favorite.bulkCreate(entries, { transaction });
	});

	return Favorite.findAll({
		where: { userId: user.id },
		include: [{ model: Game }],
		order: [
			["position", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function findFavoritesByUserId(userId: string) {
	return Favorite.findAll({
		where: { userId },
		attributes: ["gameId"]
	});
}

export async function findGameEntriesByUserId(
	userId: string,
	gameIds?: string[]
) {
	const where: Record<string, unknown> = { userId };
	if (gameIds) where.gameId = { [Op.in]: gameIds };

	return Favorite.findAll({
		where,
		attributes: ["gameId"],
		include: [
			{
				model: Game,
				attributes: ["id", "code", "title", "backgroundUrl"]
			}
		],
		order: [
			["position", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function findFavoritesByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {}
) {
	const gameInclude: Record<string, unknown> = { model: Game };
	const titleWhere = pagination.search
		? buildTextSearchWhere(pagination.search, ["Game.title"])
		: null;
	if (titleWhere) {
		gameInclude.where = titleWhere;
		gameInclude.required = true;
	}

	const query: Record<string, unknown> = {
		where: { userId },
		include: [gameInclude],
		order: [
			["position", "ASC"],
			["id", "ASC"]
		]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await Favorite.findAndCountAll(query);
	return { rows, total: count };
}

export async function findFavoritesForExport(
	userId: string,
	filters: ExportSearchQuery = {}
) {
	const titleWhere = filters.search
		? buildTextSearchWhere(filters.search, ["Game.title"])
		: null;

	return Favorite.findAll({
		where: { userId },
		include: [
			{
				model: Game,
				attributes: ["id", "title"],
				...(titleWhere && { required: true, where: titleWhere })
			}
		],
		order: [
			["position", "ASC"],
			["id", "ASC"]
		]
	});
}
