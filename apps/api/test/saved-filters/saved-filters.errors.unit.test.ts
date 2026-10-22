import { savedFiltersDomainToHttpMapper } from "../../src/saved-filters/errors/saved-filters.domain-to-http.mapper";
import { savedFiltersErrorDomainNormalizer } from "../../src/saved-filters/errors/saved-filters.error-domain.normalizer";
import { savedFiltersServiceToDomainMapper } from "../../src/saved-filters/errors/saved-filters.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "SavedFilters",
	service: "SavedFilter Service",
	mapper: savedFiltersServiceToDomainMapper,
	normalizer: savedFiltersErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "SAVED_FILTER_NOT_FOUND",
			module: "SavedFilter Module",
			code: "SAVED_FILTER_NOT_FOUND",
			message: "Saved filter not found"
		},
		{
			serviceCode: "SAVED_FILTER_FORBIDDEN",
			module: "SavedFilter Module",
			code: "SAVED_FILTER_FORBIDDEN",
			message: "You do not have permission to modify this saved filter"
		},
		{
			serviceCode: "SAVED_FILTER_LIMIT_REACHED",
			module: "SavedFilter Module",
			code: "SAVED_FILTER_LIMIT_REACHED",
			message:
				"Free users can save up to 5 filters. Upgrade to premium for unlimited."
		},
		{
			serviceCode: "SAVED_FILTER_FROZEN",
			module: "SavedFilter Module",
			code: "SAVED_FILTER_FROZEN",
			message:
				"This filter is frozen. Delete filters until you have 5 or less, or upgrade to premium."
		},
		{
			serviceCode: "SAVED_FILTER_VALIDATION_ERROR",
			module: "SavedFilter Module",
			code: "SAVED_FILTER_VALIDATION_ERROR",
			message: "The stored filters are not valid"
		}
	],
	fallback: {
		module: "SavedFilter Module",
		code: "SAVED_FILTER_INTERNAL_ERROR",
		message: "Unexpected SavedFilter Service error"
	}
});

describeDomainToHttpMapper({
	name: "SavedFilters",
	mapper: savedFiltersDomainToHttpMapper,
	cases: [
		{ code: "SAVED_FILTER_NOT_FOUND", status: 404 },
		{ code: "SAVED_FILTER_FORBIDDEN", status: 403 },
		{ code: "SAVED_FILTER_LIMIT_REACHED", status: 402 },
		{ code: "SAVED_FILTER_FROZEN", status: 402 },
		{ code: "SAVED_FILTER_VALIDATION_ERROR", status: 422 }
	]
});
