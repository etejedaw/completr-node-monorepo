import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type RegisterSavedFilterDto } from "./dtos/register-saved-filter.dto";
import { type ReorderSavedFiltersDto } from "./dtos/reorder-saved-filters.dto";
import { type UpdateSavedFilterDto } from "./dtos/update-saved-filter.dto";
import { savedFilterSerializer } from "./saved-filters.serializer";
import * as savedFiltersService from "./saved-filters.service";
import { type SavedFilterIdParams } from "./schemas/saved-filter-id-params.schema";

export async function postSavedFilter(request: Request, response: Response) {
	const registerSavedFilter = request.locals.body as RegisterSavedFilterDto;
	const user = request.locals.user as RequestUser;

	const filter = await savedFiltersService.createSavedFilter(
		user.id,
		user.role,
		registerSavedFilter
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: savedFilterSerializer(filterPlain) };
	return response.status(201).json({ data });
}

export async function getMeSavedFilters(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { filters, total, frozen } =
		await savedFiltersService.findSavedFiltersByUserId(
			user.id,
			user.role,
			query
		);
	const filtersPlain = filters.map(filter => filter.get({ plain: true }));

	const data = {
		savedFilters: filtersPlain.map(savedFilterSerializer),
		total,
		frozen
	};
	return response.status(200).json({ data });
}

export async function patchSavedFilter(request: Request, response: Response) {
	const params = request.locals.params as SavedFilterIdParams;
	const updateSavedFilter = request.locals.body as UpdateSavedFilterDto;
	const user = request.locals.user as RequestUser;

	const filter = await savedFiltersService.updateSavedFilter(
		params.filterId,
		user.id,
		user.role,
		updateSavedFilter
	);
	const filterPlain = filter.get({ plain: true });

	const data = { savedFilter: savedFilterSerializer(filterPlain) };
	return response.status(200).json({ data });
}

export async function putReorderSavedFilters(
	request: Request,
	response: Response
) {
	const { ids } = request.locals.body as ReorderSavedFiltersDto;
	const user = request.locals.user as RequestUser;

	const filters = await savedFiltersService.reorderSavedFilters(user.id, ids);
	const filtersPlain = filters.map(filter => filter.get({ plain: true }));

	const data = { savedFilters: filtersPlain.map(savedFilterSerializer) };
	return response.status(200).json({ data });
}

export async function getSavedFilterStats(
	request: Request,
	response: Response
) {
	const params = request.locals.params as SavedFilterIdParams;
	const user = request.locals.user as RequestUser;

	const stats = await savedFiltersService.getSavedFilterStats(
		params.filterId,
		user.id
	);

	return response.status(200).json({ data: { stats } });
}

export async function deleteSavedFilter(request: Request, response: Response) {
	const params = request.locals.params as SavedFilterIdParams;
	const user = request.locals.user as RequestUser;

	await savedFiltersService.removeSavedFilter(params.filterId, user.id);
	return response.sendStatus(204);
}
