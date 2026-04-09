import { Favorite } from "./favorite.model";
import { Game } from "../games/game.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as favoritesServiceError from "./errors/favorites.service-error";

const FREE_FAVORITE_LIMIT = 10;

function isPremium(role: string) {
	return role === "premium" || role === "admin";
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
		include: [{ model: Game }],
		order: [["position", "ASC"]]
	});
}
