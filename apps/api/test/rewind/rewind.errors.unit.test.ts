import { rewindDomainToHttpMapper } from "../../src/rewind/errors/rewind.domain-to-http.mapper";
import { rewindErrorDomainNormalizer } from "../../src/rewind/errors/rewind.error-domain.normalizer";
import { rewindServiceToDomainMapper } from "../../src/rewind/errors/rewind.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Rewind",
	service: "Rewind Service",
	mapper: rewindServiceToDomainMapper,
	normalizer: rewindErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "REWIND_NOT_FOUND",
			module: "Rewind Module",
			code: "REWIND_NOT_FOUND",
			message: "Rewind not found"
		},
		{
			serviceCode: "USER_NOT_FOUND",
			module: "Rewind Module",
			code: "USER_NOT_FOUND",
			message: "User not found"
		},
		{
			serviceCode: "USER_PRIVATE",
			module: "Rewind Module",
			code: "USER_PRIVATE",
			message: "This account is private"
		},
		{
			serviceCode: "REWIND_PERIOD_CLOSED",
			module: "Rewind Module",
			code: "REWIND_PERIOD_CLOSED",
			message: "The Rewind period is closed"
		},
		{
			serviceCode: "REWIND_YEAR_REQUIRES_PREMIUM",
			module: "Rewind Module",
			code: "REWIND_YEAR_REQUIRES_PREMIUM",
			message:
				"Generating the Rewind of a previous year requires a premium account"
		},
		{
			serviceCode: "REWIND_REGENERATION_LIMIT",
			module: "Rewind Module",
			code: "REWIND_REGENERATION_LIMIT",
			message: "No regenerations left for this Rewind"
		}
	],
	fallback: {
		module: "Rewind Module",
		code: "REWIND_INTERNAL_ERROR",
		message: "Unexpected Rewind Service error"
	}
});

describeDomainToHttpMapper({
	name: "Rewind",
	mapper: rewindDomainToHttpMapper,
	cases: [
		{ code: "REWIND_NOT_FOUND", status: 404 },
		{ code: "USER_NOT_FOUND", status: 404 },
		{ code: "USER_PRIVATE", status: 403 },
		{ code: "REWIND_PERIOD_CLOSED", status: 409 },
		{ code: "REWIND_YEAR_REQUIRES_PREMIUM", status: 403 },
		{ code: "REWIND_REGENERATION_LIMIT", status: 409 }
	]
});
