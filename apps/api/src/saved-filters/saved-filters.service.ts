import { type Transaction } from "sequelize";

import { BacklogQuerySchema } from "../backlog/schemas/backlog-query.schema";
import * as backlogStatsService from "../backlog/services/backlog-stats.service";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { resolvePremiumAccess } from "../premium-access/services/premium-access.service";
import { type RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { type UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import * as savedFilterServiceError from "./errors/saved-filters.service-error";
import { SavedFilter } from "./saved-filter.model";
import { FREE_FILTER_LIMIT, SAVED_FILTER_ORDER } from "./saved-filters.constants";

async function hasPremiumAccess(userId: string, role: string) {
	return resolvePremiumAccess(
		{ id: userId, role },
		"saved-filters.unlimited"
	);
}

async function areFrozen(userId: string, role: string) {
	const premiumAccess = await hasPremiumAccess(userId, role);
	if (premiumAccess.allowed) return false;
	const count = await SavedFilter.count({ where: { userId } });
	return count > FREE_FILTER_LIMIT;
}

async function lockUserFilters(userId: string, transaction: Transaction) {
	await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:lockKey))", {
		replacements: { lockKey: `saved-filters:${userId}` },
		transaction
	});
}

export async function createSavedFilter(
	userId: string,
	role: string,
	dto: RegisterSavedFilterDto
) {
	const premiumAccess = await hasPremiumAccess(userId, role);

	try {
		return await sequelize.transaction(async transaction => {
			await lockUserFilters(userId, transaction);

			if (!premiumAccess.allowed) {
				const count = await SavedFilter.count({
					where: { userId },
					transaction
				});
				if (count >= FREE_FILTER_LIMIT)
					throw savedFilterServiceError.limitReachedError();
			}

			if (dto.isDefault) {
				dto = { ...dto, showInBacklog: true };
				await clearDefault(userId, transaction);
			}

			const maxPosition = (await SavedFilter.max("position", {
				where: { userId },
				transaction
			})) as number | null;
			const position = (maxPosition ?? 0) + 1;

			return SavedFilter.create(
				{ ...dto, userId, position },
				{ transaction }
			);
		});
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
	const searchWhere = pagination.search
		? buildTextSearchWhere(pagination.search, [
				"SavedFilter.name",
				"SavedFilter.description"
			])
		: null;
	if (searchWhere) Object.assign(where, searchWhere);

	const query: Record<string, unknown> = {
		where,
		order: SAVED_FILTER_ORDER
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await SavedFilter.findAndCountAll(query);
	const frozen = await areFrozen(userId, role);

	return { filters: rows, total: count, frozen };
}

async function findSavedFilterById(id: string) {
	return SavedFilter.findOne({ where: { id } });
}

export async function updateSavedFilter(
	id: string,
	userId: string,
	role: string,
	dto: UpdateSavedFilterDto
) {
	const premiumAccess = await hasPremiumAccess(userId, role);

	return sequelize.transaction(async transaction => {
		await lockUserFilters(userId, transaction);

		const filter = await SavedFilter.findOne({
			where: { id, userId },
			transaction
		});
		if (!filter) throw savedFilterServiceError.notFoundError();

		if (!premiumAccess.allowed) {
			const count = await SavedFilter.count({
				where: { userId },
				transaction
			});
			if (count > FREE_FILTER_LIMIT)
				throw savedFilterServiceError.frozenError();
		}

		if (dto.isDefault) {
			dto = { ...dto, showInBacklog: true };
			await clearDefault(userId, transaction);
		}

		if (dto.showInBacklog === false && filter.isDefault) {
			dto = { ...dto, isDefault: false };
		}

		await filter.update(dto, { transaction });
		return filter;
	});
}

export async function reorderSavedFilters(userId: string, ids: string[]) {
	await sequelize.transaction(async transaction => {
		await lockUserFilters(userId, transaction);

		const filters = await SavedFilter.findAll({
			where: { userId },
			order: SAVED_FILTER_ORDER,
			transaction
		});
		const knownIds = new Set(filters.map(filter => filter.id));
		if (ids.some(id => !knownIds.has(id)))
			throw savedFilterServiceError.notFoundError();

		const requested = new Set(ids);
		const fullOrder = [
			...ids,
			...filters.map(filter => filter.id).filter(id => !requested.has(id))
		];
		const positionById = new Map(
			fullOrder.map((id, index) => [id, index + 1])
		);
		const movedFilters = filters.filter(
			filter => filter.position !== positionById.get(filter.id)
		);
		if (movedFilters.length === 0) return;

		const values = movedFilters
			.map(() => "(?::uuid, ?::integer)")
			.join(", ");
		await sequelize.query(
			`UPDATE "SavedFilters" AS sf
			SET "position" = v."position", "updatedAt" = NOW()
			FROM (VALUES ${values}) AS v("id", "position")
			WHERE sf."id" = v."id"`,
			{
				replacements: movedFilters.flatMap(filter => [
					filter.id,
					positionById.get(filter.id)!
				]),
				transaction
			}
		);
	});

	return SavedFilter.findAll({
		where: { userId },
		order: SAVED_FILTER_ORDER
	});
}

async function clearDefault(userId: string, transaction: Transaction) {
	await SavedFilter.update(
		{ isDefault: false },
		{ where: { userId, isDefault: true }, transaction }
	);
}

export async function getSavedFilterStats(id: string, userId: string) {
	const filter = await findSavedFilterById(id);
	if (!filter || filter.userId !== userId)
		throw savedFilterServiceError.notFoundError();

	const parsed = BacklogQuerySchema.safeParse(filter.filters);
	if (!parsed.success)
		throw savedFilterServiceError.validationError(parsed.error);

	return backlogStatsService.computeBacklogStats(userId, parsed.data);
}

export async function removeSavedFilter(id: string, userId: string) {
	const filter = await findSavedFilterById(id);
	if (!filter || filter.userId !== userId)
		throw savedFilterServiceError.notFoundError();

	await SavedFilter.destroy({ where: { id } });
	return true;
}

export async function findSavedFiltersForDataExport(userId: string) {
	return SavedFilter.findAll({
		where: { userId },
		order: [
			["position", "ASC"],
			["createdAt", "ASC"],
			["id", "ASC"]
		]
	});
}
