import { Request, Response } from "express";
import * as savedFiltersService from "./saved-filters.service";
import { RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import { SavedFilterIdParams } from "./schemas/saved-filter-id-params.schema";
import { CustomRequest } from "../common/interfaces/custom-request.interface";

export async function postSavedFilter(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const dto = request.body as RegisterSavedFilterDto;
	const { id: userId, role } = customRequest.user;

	const filter = await savedFiltersService.createSavedFilter(
		userId,
		role,
		dto
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: filterPlain };
	return response.status(201).json({ data });
}

export async function getMeSavedFilters(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const userId = customRequest.user.id;

	const filters = await savedFiltersService.findSavedFiltersByUserId(
		userId
	);
	const filtersPlain = filters.map(f => f.get({ plain: true }));

	const data = { savedFilters: filtersPlain };
	return response.status(200).json({ data });
}

export async function patchSavedFilter(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const params = request.params as SavedFilterIdParams;
	const dto = request.body as UpdateSavedFilterDto;
	const userId = customRequest.user.id;

	const filter = await savedFiltersService.updateSavedFilter(
		params.filterId,
		userId,
		dto
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: filterPlain };
	return response.status(200).json({ data });
}

export async function deleteSavedFilter(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const params = request.params as SavedFilterIdParams;
	const userId = customRequest.user.id;

	await savedFiltersService.removeSavedFilter(params.filterId, userId);
	return response.sendStatus(204);
}
