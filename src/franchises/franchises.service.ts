import { Op } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import * as gamesService from "../games/games.service";
import { type RegisterFranchiseDto } from "./dtos/register-franchise.dto";
import { type UpdateFranchiseDto } from "./dtos/update-franchise.dto";
import * as franchiseServiceError from "./errors/franchises.service-error";
import { Franchise } from "./franchise.model";

export async function registerFranchise(
	registerFranchise: RegisterFranchiseDto
) {
	try {
		const code = titleToSlug(registerFranchise.name);
		return await Franchise.create({ ...registerFranchise, code });
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
		? { name: { [Op.iLike]: `%${pagination.search}%` } }
		: undefined;

	const query: Record<string, unknown> = {
		where,
		order: [["name", "ASC"]]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await Franchise.findAndCountAll(query);
	return { rows, total: count };
}

export async function updateFranchise(
	id: string,
	updateFranchiseDto: UpdateFranchiseDto
) {
	const franchise = await findFranchiseById(id);
	if (!franchise) throw franchiseServiceError.notFoundError();

	try {
		const code = titleToSlug(updateFranchiseDto.name);
		await franchise.update({ ...updateFranchiseDto, code });
		return franchise;
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

export async function findUserFranchiseProgress(
	completedGameIds: string[]
): Promise<FranchiseProgressEntry[]> {
	if (completedGameIds.length === 0) return [];

	const franchiseIdsOfCompleted =
		await gamesService.findFranchiseIdsForGameIds(completedGameIds);
	if (franchiseIdsOfCompleted.length === 0) return [];

	const completedByFranchise = new Map<string, number>();
	for (const franchiseId of franchiseIdsOfCompleted) {
		completedByFranchise.set(
			franchiseId,
			(completedByFranchise.get(franchiseId) ?? 0) + 1
		);
	}

	const franchiseIds = [...completedByFranchise.keys()];
	const [totalByFranchise, franchises] = await Promise.all([
		gamesService.countActiveGamesByFranchiseIds(franchiseIds),
		Franchise.findAll({ where: { id: { [Op.in]: franchiseIds } } })
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
