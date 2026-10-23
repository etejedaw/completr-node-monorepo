import { platformsDomainToHttpMapper } from "../../src/platforms/errors/platforms.domain-to-http.mapper";
import { platformsErrorDomainNormalizer } from "../../src/platforms/errors/platforms.error-domain.normalizer";
import { platformsServiceToDomainMapper } from "../../src/platforms/errors/platforms.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Platforms",
	service: "Platform Service",
	mapper: platformsServiceToDomainMapper,
	normalizer: platformsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "PLATFORM_NOT_FOUND",
			module: "Platform Module",
			code: "PLATFORM_NOT_FOUND",
			message: "Platform not found"
		},
		{
			serviceCode: "PLATFORM_UNIQUE_CONSTRAINT",
			module: "Platform Module",
			code: "PLATFORM_UNIQUE_CONSTRAINT",
			message: "Platform already exists"
		},
		{
			serviceCode: "PLATFORM_VALIDATION_ERROR",
			module: "Platform Module",
			code: "PLATFORM_VALIDATION_ERROR",
			message: "Platform validation failed"
		},
		{
			serviceCode: "PLATFORM_IN_USE",
			module: "Platform Module",
			code: "PLATFORM_IN_USE",
			message: "Platform is in use and cannot be deleted"
		}
	],
	fallback: {
		module: "Platform Module",
		code: "PLATFORM_INTERNAL_ERROR",
		message: "Unexpected Platform Service error"
	}
});

describeDomainToHttpMapper({
	name: "Platforms",
	mapper: platformsDomainToHttpMapper,
	cases: [
		{ code: "PLATFORM_NOT_FOUND", status: 404 },
		{ code: "PLATFORM_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "PLATFORM_VALIDATION_ERROR", status: 400 },
		{ code: "PLATFORM_IN_USE", status: 409 }
	]
});
