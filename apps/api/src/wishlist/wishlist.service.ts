import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ExportPlatformSearchQuery } from "../common/schemas/export-platform-search-query.schema";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { buildPlatformFilterWhere } from "../common/utils/platform-filter-where.util";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { GAME_REFERENCE_ATTRS } from "../games/games.constants";
import * as gamesService from "../games/games.service";
import * as platformsService from "../platforms/platforms.service";
import { resolvePremiumAccess } from "../premium-access/premium-access.service";
import * as wishlistServiceError from "./errors/wishlist.service-error";
import { FREE_WISHLIST_LIMIT, WISHLIST_ORDER } from "./wishlist.constants";
import { Wishlist } from "./wishlist.model";

function wishlistInclude() {
	return [gamesService.gameInclude(), platformsService.platformInclude()];
}

async function lockUserWishlist(userId: string, transaction: Transaction) {
	await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:lockKey))", {
		replacements: { lockKey: `wishlist:${userId}` },
		transaction
	});
}

async function compactPositions(userId: string, transaction: Transaction) {
	await sequelize.query(
		`UPDATE "Wishlists" AS w
		SET "position" = ranked."position", "updatedAt" = NOW()
		FROM (
			SELECT "id", ROW_NUMBER() OVER (ORDER BY "position", "createdAt", "id") AS "position"
			FROM "Wishlists"
			WHERE "userId" = :userId
		) AS ranked
		WHERE w."id" = ranked."id" AND w."position" <> ranked."position"`,
		{ replacements: { userId }, transaction }
	);
}

export async function replaceWishlist(user: RequestUser, gameIds: string[]) {
	if (gameIds.length > 0) {
		const premiumAccess = await resolvePremiumAccess(
			user,
			"wishlist.unlimited"
		);
		if (!premiumAccess.allowed && gameIds.length > FREE_WISHLIST_LIMIT)
			throw wishlistServiceError.limitReachedError();

		const games = await gamesService.findGamesByIds(gameIds);
		if (games.length !== gameIds.length) {
			const foundIds = new Set(games.map(g => g.id));
			const missing = gameIds.filter(id => !foundIds.has(id));
			throw wishlistServiceError.gamesNotFoundError(missing);
		}
	}

	await sequelize.transaction(async transaction => {
		await lockUserWishlist(user.id, transaction);
		const current = await Wishlist.findAll({
			where: { userId: user.id },
			attributes: ["gameId", "platformId"],
			transaction
		});
		const platformByGameId = new Map(
			current.map(entry => [entry.gameId, entry.platformId])
		);

		await Wishlist.destroy({ where: { userId: user.id }, transaction });
		await Wishlist.bulkCreate(
			gameIds.map((gameId, index) => ({
				userId: user.id,
				gameId,
				platformId: platformByGameId.get(gameId) ?? null,
				position: index + 1
			})),
			{ transaction }
		);
	});

	if (gameIds.length === 0) return [];
	return Wishlist.findAll({
		where: { userId: user.id },
		include: wishlistInclude(),
		order: WISHLIST_ORDER
	});
}

async function addEntry(
	user: RequestUser,
	gameId: string,
	platformId: string | null,
	unlimited: boolean,
	transaction: Transaction
) {
	await lockUserWishlist(user.id, transaction);

	const existing = await Wishlist.findOne({
		where: { userId: user.id, gameId },
		transaction
	});
	if (existing) throw wishlistServiceError.alreadyExistsError();

	const count = await Wishlist.count({
		where: { userId: user.id },
		transaction
	});
	if (!unlimited && count >= FREE_WISHLIST_LIMIT)
		throw wishlistServiceError.limitReachedError();

	const lastPosition = await Wishlist.max<number | null, Wishlist>(
		"position",
		{ where: { userId: user.id }, transaction }
	);
	await Wishlist.create(
		{
			userId: user.id,
			gameId,
			platformId,
			position: (lastPosition ?? 0) + 1
		},
		{ transaction }
	);
	return Wishlist.findOne({
		where: { userId: user.id, gameId },
		include: wishlistInclude(),
		transaction
	});
}

export async function addToWishlist(
	user: RequestUser,
	gameId: string,
	platformId?: string
) {
	const game = await gamesService.findGameRecordById(gameId);
	if (!game) throw wishlistServiceError.gamesNotFoundError([gameId]);

	if (platformId) {
		const platform = await platformsService.findPlatformById(platformId);
		if (!platform) throw wishlistServiceError.platformNotFoundError();
	}

	const premiumAccess = await resolvePremiumAccess(
		user,
		"wishlist.unlimited"
	);

	try {
		return await sequelize.transaction(transaction =>
			addEntry(
				user,
				gameId,
				platformId ?? null,
				premiumAccess.allowed,
				transaction
			)
		);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => wishlistServiceError.alreadyExistsError()
		});
	}
}

export async function removeFromWishlist(user: RequestUser, gameId: string) {
	await sequelize.transaction(async transaction => {
		await lockUserWishlist(user.id, transaction);
		const deleted = await Wishlist.destroy({
			where: { userId: user.id, gameId },
			transaction
		});
		if (deleted === 0) throw wishlistServiceError.notFoundError();
		await compactPositions(user.id, transaction);
	});
}

export async function findWishlistByUserId(userId: string) {
	return Wishlist.findAll({
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

	return Wishlist.findAll({
		where,
		attributes: ["gameId"],
		include: [
			{
				...gamesService.gameInclude(),
				attributes: ["id", "code", "title", "backgroundUrl"]
			}
		],
		order: WISHLIST_ORDER
	});
}

export async function findWishlistByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {}
) {
	const gameInclude: Record<string, unknown> = { ...gamesService.gameInclude() };
	const titleWhere = pagination.search
		? buildTextSearchWhere(pagination.search, ["Game.title"])
		: null;
	if (titleWhere) {
		gameInclude.where = titleWhere;
		gameInclude.required = true;
	}

	const query: Record<string, unknown> = {
		where: { userId },
		include: [gameInclude, { ...platformsService.platformInclude() }],
		order: WISHLIST_ORDER
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await Wishlist.findAndCountAll(query);
	return { rows, total: count };
}

export async function findWishlistForExport(
	userId: string,
	filters: ExportPlatformSearchQuery = {}
) {
	const titleWhere = filters.search
		? buildTextSearchWhere(filters.search, ["Game.title"])
		: null;

	return Wishlist.findAll({
		where: { userId, ...buildPlatformFilterWhere(filters.platform) },
		include: [
			{
				...gamesService.gameInclude(),
				attributes: ["id", "title"],
				...(titleWhere && { required: true, where: titleWhere })
			},
			{ ...platformsService.platformInclude(), attributes: ["id", "name"] }
		],
		order: WISHLIST_ORDER
	});
}

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await Wishlist.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}

export async function findWishlistForDataExport(userId: string) {
	return Wishlist.findAll({
		where: { userId },
		include: [
			{ ...gamesService.gameInclude(), attributes: GAME_REFERENCE_ATTRS },
			{ ...platformsService.platformInclude(), attributes: ["id", "name"] }
		],
		order: WISHLIST_ORDER
	});
}
