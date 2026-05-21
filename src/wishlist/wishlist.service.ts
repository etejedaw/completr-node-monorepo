import { Op } from "sequelize";
import { Wishlist } from "./wishlist.model";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import * as wishlistServiceError from "./errors/wishlist.service-error";

const FREE_WISHLIST_LIMIT = 20;
const INCLUDE = [{ model: Game }, { model: Platform }];

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

export async function replaceWishlist(user: RequestUser, gameIds: string[]) {
	if (gameIds.length === 0) {
		await Wishlist.destroy({ where: { userId: user.id } });
		return [];
	}

	if (!isPremium(user.role) && gameIds.length > FREE_WISHLIST_LIMIT)
		throw wishlistServiceError.limitReachedError();

	const games = await Game.findAll({ where: { id: gameIds } });
	if (games.length !== gameIds.length) {
		const foundIds = new Set(games.map(g => g.id));
		const missing = gameIds.filter(id => !foundIds.has(id));
		throw wishlistServiceError.gamesNotFoundError(missing);
	}

	await Wishlist.destroy({ where: { userId: user.id } });

	const entries = gameIds.map((gameId, index) => ({
		userId: user.id,
		gameId,
		position: index + 1
	}));
	await Wishlist.bulkCreate(entries);

	return Wishlist.findAll({
		where: { userId: user.id },
		include: INCLUDE,
		order: [["position", "ASC"]]
	});
}

export async function addToWishlist(
	user: RequestUser,
	gameId: string,
	platformId?: string
) {
	const game = await Game.findOne({ where: { id: gameId } });
	if (!game) throw wishlistServiceError.gamesNotFoundError([gameId]);

	if (platformId) {
		const platform = await Platform.findOne({ where: { id: platformId } });
		if (!platform) throw wishlistServiceError.platformNotFoundError();
	}

	const existing = await Wishlist.findOne({
		where: { userId: user.id, gameId }
	});
	if (existing) throw wishlistServiceError.alreadyExistsError();

	const count = await Wishlist.count({ where: { userId: user.id } });
	if (!isPremium(user.role) && count >= FREE_WISHLIST_LIMIT)
		throw wishlistServiceError.limitReachedError();

	await Wishlist.create({
		userId: user.id,
		gameId,
		platformId: platformId ?? null,
		position: count + 1
	});

	return Wishlist.findOne({
		where: { userId: user.id, gameId },
		include: INCLUDE
	});
}

export async function removeFromWishlist(user: RequestUser, gameId: string) {
	const deleted = await Wishlist.destroy({
		where: { userId: user.id, gameId }
	});
	if (deleted === 0) throw wishlistServiceError.notFoundError();
}

export async function findWishlistByUserId(userId: string) {
	return Wishlist.findAll({
		where: { userId },
		include: INCLUDE,
		order: [["position", "ASC"]]
	});
}

export async function findWishlistByUserIdPaginated(
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
		include: [gameInclude, { model: Platform }],
		order: [["position", "ASC"]]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await Wishlist.findAndCountAll(query);
	return { rows, total: count };
}
