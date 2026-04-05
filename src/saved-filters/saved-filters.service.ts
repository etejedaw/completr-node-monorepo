import { SavedFilter } from "./saved-filter.model";
import { RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import * as savedFilterServiceError from "./errors/saved-filters.service-error";

const FREE_FILTER_LIMIT = 5;

export async function createSavedFilter(
	userId: string,
	role: string,
	dto: RegisterSavedFilterDto
) {
	if (role !== "premium" && role !== "admin") {
		const count = await SavedFilter.count({ where: { userId } });
		if (count >= FREE_FILTER_LIMIT)
			throw savedFilterServiceError.limitReachedError();
	}

	return SavedFilter.create({ ...dto, userId });
}

export async function findSavedFiltersByUserId(userId: string) {
	return SavedFilter.findAll({
		where: { userId },
		order: [["createdAt", "DESC"]]
	});
}

export async function findSavedFilterById(id: string) {
	return SavedFilter.findOne({ where: { id } });
}

export async function updateSavedFilter(
	id: string,
	userId: string,
	dto: UpdateSavedFilterDto
) {
	const filter = await findSavedFilterById(id);
	if (!filter) throw savedFilterServiceError.notFoundError();
	if (filter.userId !== userId)
		throw savedFilterServiceError.forbiddenError();

	await filter.update(dto);
	return filter;
}

export async function removeSavedFilter(id: string, userId: string) {
	const filter = await findSavedFilterById(id);
	if (!filter) throw savedFilterServiceError.notFoundError();
	if (filter.userId !== userId)
		throw savedFilterServiceError.forbiddenError();

	await SavedFilter.destroy({ where: { id } });
	return true;
}
