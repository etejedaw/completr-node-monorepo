import { Op } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { BacklogQuerySchema } from "../backlog/schemas/backlog-query.schema";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { sequelize } from "../database/sequelize.database";
import { type RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { type UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import * as savedFilterServiceError from "./errors/saved-filters.service-error";
import { SavedFilter } from "./saved-filter.model";

const FREE_FILTER_LIMIT = 5;

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

async function areFrozen(userId: string, role: string) {
	if (isPremium(role)) return false;
	const count = await SavedFilter.count({ where: { userId } });
	return count > FREE_FILTER_LIMIT;
}

export async function createSavedFilter(
	userId: string,
	role: string,
	dto: RegisterSavedFilterDto
) {
	if (!isPremium(role)) {
		const count = await SavedFilter.count({ where: { userId } });
		if (count >= FREE_FILTER_LIMIT)
			throw savedFilterServiceError.limitReachedError();
	}

	if (dto.isDefault) {
		dto = { ...dto, showInBacklog: true };
		await clearDefault(userId);
	}

	const maxPosition = (await SavedFilter.max("position", {
		where: { userId }
	})) as number | null;
	const position = (maxPosition ?? 0) + 1;

	try {
		return await SavedFilter.create({ ...dto, userId, position });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: savedFilterServiceError.uniqueConstraintError,
			validation: savedFilterServiceError.validationError
		});
	}
}

export async function findSavedFiltersByUserId(
	userId: string,
	role: string,
	pagination: PaginatedSearchQuery = {}
) {
	const where: Record<string, unknown> = { userId };
	if (pagination.search) {
		where[Op.or as unknown as string] = [
			{ name: { [Op.iLike]: `%${pagination.search}%` } },
			{ description: { [Op.iLike]: `%${pagination.search}%` } }
		];
	}

	const query: Record<string, unknown> = {
		where,
		order: [
			["position", "ASC"],
			["createdAt", "DESC"]
		]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await SavedFilter.findAndCountAll(query);
	const frozen = await areFrozen(userId, role);

	return { filters: rows, total: count, frozen };
}

export async function findSavedFilterById(id: string) {
	return SavedFilter.findOne({ where: { id } });
}

export async function updateSavedFilter(
	id: string,
	userId: string,
	role: string,
	dto: UpdateSavedFilterDto
) {
	const filter = await findSavedFilterById(id);
	if (!filter) throw savedFilterServiceError.notFoundError();
	if (filter.userId !== userId)
		throw savedFilterServiceError.forbiddenError();

	const frozen = await areFrozen(userId, role);
	if (frozen) throw savedFilterServiceError.frozenError();

	if (dto.isDefault) {
		dto = { ...dto, showInBacklog: true };
		await clearDefault(userId);
	}

	if (dto.showInBacklog === false && filter.isDefault) {
		dto = { ...dto, isDefault: false };
	}

	await filter.update(dto);
	return filter;
}

export async function reorderSavedFilters(userId: string, ids: string[]) {
	const filters = await SavedFilter.findAll({
		where: { userId, id: { [Op.in]: ids } }
	});
	if (filters.length !== ids.length)
		throw savedFilterServiceError.notFoundError();

	const positionById = new Map(ids.map((id, index) => [id, index + 1]));

	await sequelize.transaction(async transaction => {
		await Promise.all(
			filters
				.filter(
					filter => filter.position !== positionById.get(filter.id)
				)
				.map(filter =>
					filter.update(
						{ position: positionById.get(filter.id) },
						{ transaction }
					)
				)
		);
	});

	return SavedFilter.findAll({
		where: { userId },
		order: [
			["position", "ASC"],
			["createdAt", "DESC"]
		]
	});
}

async function clearDefault(userId: string) {
	await SavedFilter.update(
		{ isDefault: false },
		{ where: { userId, isDefault: true } }
	);
}

export async function getSavedFilterStats(id: string, userId: string) {
	const filter = await findSavedFilterById(id);
	if (!filter) throw savedFilterServiceError.notFoundError();
	if (filter.userId !== userId)
		throw savedFilterServiceError.forbiddenError();

	const parsed = BacklogQuerySchema.safeParse(filter.filters);
	if (!parsed.success)
		throw savedFilterServiceError.validationError(parsed.error);

	return backlogService.computeBacklogStats(userId, parsed.data);
}

export async function removeSavedFilter(id: string, userId: string) {
	const filter = await findSavedFilterById(id);
	if (!filter) throw savedFilterServiceError.notFoundError();
	if (filter.userId !== userId)
		throw savedFilterServiceError.forbiddenError();

	await SavedFilter.destroy({ where: { id } });
	return true;
}
