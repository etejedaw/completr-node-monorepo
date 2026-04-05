import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import * as savedFiltersService from "./saved-filters.service";
import { RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import { SavedFilterIdParams } from "./schemas/saved-filter-id-params.schema";

export async function postSavedFilter(request: Request, response: Response) {
	const dto = request.locals.body as RegisterSavedFilterDto;
	const { id: userId, role } = request.locals.user as RequestUser;

	const filter = await savedFiltersService.createSavedFilter(
		userId,
		role,
		dto
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: filterPlain };
	return response.status(201).json({ data });
}

export async function getMeSavedFilters(request: Request, response: Response) {
	const { id: userId, role } = request.locals.user as RequestUser;

	const { filters, frozen } =
		await savedFiltersService.findSavedFiltersByUserId(userId, role);
	const filtersPlain = filters.map(f => f.get({ plain: true }));

	const data = { savedFilters: filtersPlain, frozen };
	return response.status(200).json({ data });
}

export async function patchSavedFilter(request: Request, response: Response) {
	const params = request.locals.params as SavedFilterIdParams;
	const dto = request.locals.body as UpdateSavedFilterDto;
	const { id: userId, role } = request.locals.user as RequestUser;

	const filter = await savedFiltersService.updateSavedFilter(
		params.filterId,
		userId,
		role,
		dto
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: filterPlain };
	return response.status(200).json({ data });
}

export async function deleteSavedFilter(request: Request, response: Response) {
	const params = request.locals.params as SavedFilterIdParams;
	const userId = (request.locals.user as RequestUser as RequestUser).id;

	await savedFiltersService.removeSavedFilter(params.filterId, userId);
	return response.sendStatus(204);
}
