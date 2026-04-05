import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import * as savedFiltersService from "./saved-filters.service";
import { RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import { SavedFilterIdParams } from "./schemas/saved-filter-id-params.schema";

export async function postSavedFilter(request: Request, response: Response) {
	const dto = request.locals.body as RegisterSavedFilterDto;
	const user = request.locals.user as RequestUser;

	const filter = await savedFiltersService.createSavedFilter(
		user.id,
		user.role,
		dto
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: filterPlain };
	return response.status(201).json({ data });
}

export async function getMeSavedFilters(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const { filters, frozen } =
		await savedFiltersService.findSavedFiltersByUserId(user.id, user.role);
	const filtersPlain = filters.map(filter => filter.get({ plain: true }));

	const data = { savedFilters: filtersPlain, frozen };
	return response.status(200).json({ data });
}

export async function patchSavedFilter(request: Request, response: Response) {
	const params = request.locals.params as SavedFilterIdParams;
	const dto = request.locals.body as UpdateSavedFilterDto;
	const user = request.locals.user as RequestUser;

	const filter = await savedFiltersService.updateSavedFilter(
		params.filterId,
		user.id,
		user.role,
		dto
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: filterPlain };
	return response.status(200).json({ data });
}

export async function deleteSavedFilter(request: Request, response: Response) {
	const params = request.locals.params as SavedFilterIdParams;
	const user = request.locals.user as RequestUser;

	await savedFiltersService.removeSavedFilter(params.filterId, user.id);
	return response.sendStatus(204);
}
