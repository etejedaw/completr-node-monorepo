import { franchisesDomainToHttpMapper } from "../../src/franchises/errors/franchises.domain-to-http.mapper";
import { franchisesErrorDomainNormalizer } from "../../src/franchises/errors/franchises.error-domain.normalizer";
import { franchisesServiceToDomainMapper } from "../../src/franchises/errors/franchises.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Franchises",
	service: "Franchise Service",
	mapper: franchisesServiceToDomainMapper,
	normalizer: franchisesErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "FRANCHISE_NOT_FOUND",
			module: "Franchise Module",
			code: "FRANCHISE_NOT_FOUND",
			message: "Franchise not found"
		},
		{
			serviceCode: "FRANCHISE_GAMES_NOT_FOUND",
			module: "Franchise Module",
			code: "FRANCHISE_GAMES_NOT_FOUND",
			message: "Some games of the franchise were not found"
		},
		{
			serviceCode: "FRANCHISE_UNIQUE_CONSTRAINT",
			module: "Franchise Module",
			code: "FRANCHISE_UNIQUE_CONSTRAINT",
			message: "Franchise already exists"
		},
		{
			serviceCode: "FRANCHISE_VALIDATION_ERROR",
			module: "Franchise Module",
			code: "FRANCHISE_VALIDATION_ERROR",
			message: "Franchise validation failed"
		}
	],
	fallback: {
		module: "Franchise Module",
		code: "FRANCHISE_INTERNAL_ERROR",
		message: "Unexpected Franchise Service error"
	}
});

describeDomainToHttpMapper({
	name: "Franchises",
	mapper: franchisesDomainToHttpMapper,
	cases: [
		{ code: "FRANCHISE_NOT_FOUND", status: 404 },
		{ code: "FRANCHISE_GAMES_NOT_FOUND", status: 404 },
		{ code: "FRANCHISE_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "FRANCHISE_VALIDATION_ERROR", status: 400 }
	]
});
