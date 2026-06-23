import { Op } from "sequelize";
import { Favorite } from "./favorite.model";
import { Game } from "../games/game.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import * as favoritesServiceError from "./errors/favorites.service-error";

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

	await Favorite.destroy({ where: { userId: user.id } });

	const entries = gameIds.map((gameId, index) => ({
		userId: user.id,
		gameId,
		position: index + 1
	}));
	await Favorite.bulkCreate(entries);

	return Favorite.findAll({
		where: { userId: user.id },
		include: [{ model: Game }],
		order: [["position", "ASC"]]
	});
}

export async function findFavoritesByUserId(userId: string) {
	return Favorite.findAll({
		where: { userId },
		attributes: ["gameId"]
	});
}

export async function findFavoritesByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {}
) {
	const gameInclude: Record<string, unknown> = { model: Game };
	if (pagination.search) {
		gameInclude.where = {
			title: { [Op.iLike]: `%${pagination.search}%` }
		};
		gameInclude.required = true;
	}

	const query: Record<string, unknown> = {
		where: { userId },
		include: [gameInclude],
		order: [["position", "ASC"]]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await Favorite.findAndCountAll(query);
	return { rows, total: count };
}
