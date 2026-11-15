import { savedFiltersDomainToHttpMapper } from "../../src/saved-filters/errors/saved-filters.domain-to-http.mapper";
import { savedFiltersErrorDomainNormalizer } from "../../src/saved-filters/errors/saved-filters.error-domain.normalizer";
import { savedFiltersServiceToDomainMapper } from "../../src/saved-filters/errors/saved-filters.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "SavedFilters write errors",
	service: "SavedFilter Service",
	mapper: savedFiltersServiceToDomainMapper,
	normalizer: savedFiltersErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "SAVED_FILTER_UNIQUE_CONSTRAINT",
			module: "SavedFilter Module",
			code: "SAVED_FILTER_UNIQUE_CONSTRAINT",
			message: "This saved filter already exists"
		}
	],
	fallback: {
		module: "SavedFilter Module",
		code: "SAVED_FILTER_INTERNAL_ERROR",
		message: "Unexpected SavedFilter Service error"
	}
});

describeDomainToHttpMapper({
	name: "SavedFilters write errors",
	mapper: savedFiltersDomainToHttpMapper,
	cases: [{ code: "SAVED_FILTER_UNIQUE_CONSTRAINT", status: 409 }]
});
