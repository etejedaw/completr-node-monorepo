import { SavedFilter } from "./saved-filter.model";
import { RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import * as savedFilterServiceError from "./errors/saved-filters.service-error";

const FREE_FILTER_LIMIT = 5;

function isPremium(role: string) {
	return role === "premium" || role === "admin";
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

	return SavedFilter.create({ ...dto, userId });
}

export async function findSavedFiltersByUserId(userId: string, role: string) {
	const filters = await SavedFilter.findAll({
		where: { userId },
		order: [["createdAt", "DESC"]]
	});

	const frozen = await areFrozen(userId, role);

	return { filters, frozen };
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

async function clearDefault(userId: string) {
	await SavedFilter.update(
		{ isDefault: false },
		{ where: { userId, isDefault: true } }
	);
}

export async function removeSavedFilter(id: string, userId: string) {
	const filter = await findSavedFilterById(id);
	if (!filter) throw savedFilterServiceError.notFoundError();
	if (filter.userId !== userId)
		throw savedFilterServiceError.forbiddenError();

	await SavedFilter.destroy({ where: { id } });
	return true;
}
