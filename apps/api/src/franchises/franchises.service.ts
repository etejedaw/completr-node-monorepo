import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import { type RegisterFranchiseDto } from "./dtos/register-franchise.dto";
import { type UpdateFranchiseDto } from "./dtos/update-franchise.dto";
import * as franchiseServiceError from "./errors/franchises.service-error";
import { Franchise } from "./franchise.model";
import { UserFranchise } from "./user-franchise.model";

async function replaceFranchiseGames(
	franchiseId: string,
	gameIds: string[],
	transaction: Transaction
) {
	const targetGameIds = [...new Set(gameIds)];

	const existingGames = await Game.findAll({
		where: { id: { [Op.in]: targetGameIds } },
		attributes: ["id"],
		transaction
	});
	const existingGameIds = new Set(existingGames.map(game => game.id));
	const missingGameIds = targetGameIds.filter(id => !existingGameIds.has(id));
	if (missingGameIds.length > 0)
		throw franchiseServiceError.gamesNotFoundError(missingGameIds);

	const keptGamesFilter =
		targetGameIds.length > 0 ? { id: { [Op.notIn]: targetGameIds } } : {};
	await Game.update(
		{ franchiseId: null },
		{ where: { franchiseId, ...keptGamesFilter }, transaction }
	);
	await Game.update(
		{ franchiseId },
		{ where: { id: { [Op.in]: targetGameIds } }, transaction }
	);
}

export async function registerFranchise({
	gameIds,
	...franchiseValues
}: RegisterFranchiseDto) {
	try {
		const code = titleToSlug(franchiseValues.name);
		if (!gameIds)
			return await Franchise.create({ ...franchiseValues, code });

		return await sequelize.transaction(async transaction => {
			const franchise = await Franchise.create(
				{ ...franchiseValues, code },
				{ transaction }
			);
			await replaceFranchiseGames(franchise.id, gameIds, transaction);
			return franchise;
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: franchiseServiceError.uniqueConstraintError,
			validation: franchiseServiceError.validationError
		});
	}
}

export async function findFranchiseByCode(code: string) {
	return await Franchise.findOne({ where: { code } });
}

export async function findFranchiseById(id: string) {
	return await Franchise.findOne({ where: { id } });
}

export async function findAllFranchises(pagination: PaginatedSearchQuery = {}) {
	const where = pagination.search
		? (buildTextSearchWhere(pagination.search, ["Franchise.name"]) ??
			undefined)
		: undefined;

	const query: Record<string, unknown> = {
		where,
		order: [
			["name", "ASC"],
			["id", "ASC"]
		]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await Franchise.findAndCountAll(query);
	return { rows, total: count };
}

export async function updateFranchise(
	id: string,
	{ gameIds, ...franchiseValues }: UpdateFranchiseDto
) {
	const franchise = await findFranchiseById(id);
	if (!franchise) throw franchiseServiceError.notFoundError();

	try {
		const code = titleToSlug(franchiseValues.name);
		if (!gameIds) {
			await franchise.update({ ...franchiseValues, code });
			return franchise;
		}

		return await sequelize.transaction(async transaction => {
			await franchise.update(
				{ ...franchiseValues, code },
				{ transaction }
			);
			await replaceFranchiseGames(franchise.id, gameIds, transaction);
			return franchise;
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: franchiseServiceError.uniqueConstraintError,
			validation: franchiseServiceError.validationError
		});
	}
}

export async function removeFranchise(id: string) {
	const franchise = await findFranchiseById(id);
	if (!franchise) return false;

	await Franchise.destroy({ where: { id } });
	return true;
}

export interface FranchiseProgressEntry {
	franchise: { id: string; name: string; code: string };
	completed: number;
	total: number;
}

export async function trackFranchise(userId: string, franchiseId: string) {
	await UserFranchise.findOrCreate({
		where: { userId, franchiseId }
	});
}

export async function untrackFranchise(userId: string, franchiseId: string) {
	await UserFranchise.destroy({ where: { userId, franchiseId } });
}

export async function isTrackingFranchise(userId: string, franchiseId: string) {
	const row = await UserFranchise.findOne({
		where: { userId, franchiseId },
		attributes: ["id"]
	});
	return !!row;
}

export async function findTrackedFranchiseIds(userId: string) {
	const rows = await UserFranchise.findAll({
		where: { userId },
		attributes: ["franchiseId"]
	});
	return rows.map(row => row.franchiseId);
}

export async function findTrackedFranchiseProgress(
	trackedFranchiseIds: string[],
	completedGameIds: string[]
): Promise<FranchiseProgressEntry[]> {
	if (trackedFranchiseIds.length === 0) return [];

	const franchiseIdsOfCompleted =
		await gamesService.findFranchiseIdsForGameIds(completedGameIds);
	const completedByFranchise = new Map<string, number>();
	for (const franchiseId of franchiseIdsOfCompleted) {
		completedByFranchise.set(
			franchiseId,
			(completedByFranchise.get(franchiseId) ?? 0) + 1
		);
	}

	const [totalByFranchise, franchises] = await Promise.all([
		gamesService.countActiveGamesByFranchiseIds(trackedFranchiseIds),
		Franchise.findAll({ where: { id: { [Op.in]: trackedFranchiseIds } } })
	]);

	return franchises
		.map(franchise => ({
			franchise: {
				id: franchise.id,
				name: franchise.name,
				code: franchise.code
			},
			completed: completedByFranchise.get(franchise.id) ?? 0,
			total: totalByFranchise.get(franchise.id) ?? 0
		}))
		.sort((a, b) => b.completed - a.completed);
}
