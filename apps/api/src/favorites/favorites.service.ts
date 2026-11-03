import { Op, type Transaction } from "sequelize";

import { type BulkResult } from "../common/interfaces/bulk-result.interface";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ExportSearchQuery } from "../common/schemas/export-search-query.schema";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { splitByPresence } from "../common/utils/split-by-presence.util";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { toBulkSkipped } from "../common/utils/to-bulk-skipped.util";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import { resolvePremiumAccess } from "../premium-access/premium-access.service";
import * as favoritesServiceError from "./errors/favorites.service-error";
import { Favorite } from "./favorite.model";

const FREE_FAVORITE_LIMIT = 10;

export async function replaceFavorites(user: RequestUser, gameIds: string[]) {
	if (gameIds.length === 0) {
		await Favorite.destroy({ where: { userId: user.id } });
		return [];
	}

	const premiumAccess = await resolvePremiumAccess(
		user,
		"favorites.unlimited"
	);
	if (!premiumAccess.allowed && gameIds.length > FREE_FAVORITE_LIMIT)
		throw favoritesServiceError.limitReachedError();

	const games = await gamesService.findGamesByIds(gameIds);
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

async function lockUserFavorites(userId: string, transaction: Transaction) {
	await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:lockKey))", {
		replacements: { lockKey: `favorites:${userId}` },
		transaction
	});
}

async function checkBulkLimit(
	user: RequestUser,
	incomingCount: number,
	transaction: Transaction
) {
	const premiumAccess = await resolvePremiumAccess(
		user,
		"favorites.unlimited"
	);
	if (premiumAccess.allowed) return;
	const count = await Favorite.count({
		where: { userId: user.id },
		transaction
	});
	if (count + incomingCount > FREE_FAVORITE_LIMIT)
		throw favoritesServiceError.limitReachedError();
}

async function compactPositions(userId: string, transaction: Transaction) {
	await sequelize.query(
		`UPDATE "Favorites" AS f
		SET "position" = ranked."position", "updatedAt" = NOW()
		FROM (
			SELECT "id", ROW_NUMBER() OVER (ORDER BY "position", "createdAt", "id") AS "position"
			FROM "Favorites"
			WHERE "userId" = :userId
		) AS ranked
		WHERE f."id" = ranked."id" AND f."position" <> ranked."position"`,
		{ replacements: { userId }, transaction }
	);
}

export async function bulkAddFavorites(user: RequestUser, gameIds: string[]) {
	const games = await gamesService.findGamesByIds(gameIds);
	const { present: existingGameIds, missing } = splitByPresence(
		gameIds,
		games.map(game => game.id)
	);

	return sequelize.transaction(async transaction => {
		await lockUserFavorites(user.id, transaction);
		const alreadyFavorite = await Favorite.findAll({
			where: { userId: user.id, gameId: existingGameIds },
			attributes: ["gameId"],
			transaction
		});
		const { missing: added } = splitByPresence(
			existingGameIds,
			alreadyFavorite.map(entry => entry.gameId)
		);

		if (added.length > 0) {
			await checkBulkLimit(user, added.length, transaction);
			const lastPosition = await Favorite.max<number | null, Favorite>(
				"position",
				{ where: { userId: user.id }, transaction }
			);
			await Favorite.bulkCreate(
				added.map((gameId, index) => ({
					userId: user.id,
					gameId,
					position: (lastPosition ?? 0) + index + 1
				})),
				{ transaction }
			);
		}

		return {
			succeeded: existingGameIds,
			skipped: toBulkSkipped(
				missing,
				favoritesServiceError.gamesNotFoundError(missing).code
			),
			added
		};
	});
}

export async function bulkRemoveFavorites(
	userId: string,
	gameIds: string[]
): Promise<BulkResult> {
	return sequelize.transaction(async transaction => {
		await lockUserFavorites(userId, transaction);
		const favorites = await Favorite.findAll({
			where: { userId, gameId: gameIds },
			attributes: ["gameId"],
			transaction
		});
		const { present: succeeded, missing } = splitByPresence(
			gameIds,
			favorites.map(entry => entry.gameId)
		);

		if (succeeded.length > 0) {
			await Favorite.destroy({
				where: { userId, gameId: succeeded },
				transaction
			});
			await compactPositions(userId, transaction);
		}

		return {
			succeeded,
			skipped: toBulkSkipped(
				missing,
				favoritesServiceError.gamesNotFoundError(missing).code
			)
		};
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

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await Favorite.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}
