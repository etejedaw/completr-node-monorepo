import { rawgDomainToHttpMapper } from "../../src/rawg/errors/rawg.domain-to-http.mapper";
import { rawgErrorDomainNormalizer } from "../../src/rawg/errors/rawg.error-domain.normalizer";
import { rawgServiceToDomainMapper } from "../../src/rawg/errors/rawg.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Rawg",
	service: "RAWG Provider",
	mapper: rawgServiceToDomainMapper,
	normalizer: rawgErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "RAWG_DISABLED",
			module: "RAWG Provider",
			code: "RAWG_DISABLED",
			message: "RAWG integration is disabled"
		},
		{
			serviceCode: "RAWG_NOT_FOUND",
			module: "RAWG Provider",
			code: "RAWG_NOT_FOUND",
			message: "Game not found in RAWG"
		},
		{
			serviceCode: "RAWG_RATE_LIMITED",
			module: "RAWG Provider",
			code: "RAWG_RATE_LIMITED",
			message: "RAWG rate limit reached"
		},
		{
			serviceCode: "RAWG_REQUEST_ERROR",
			module: "RAWG Provider",
			code: "RAWG_REQUEST_ERROR",
			message: "RAWG request failed"
		},
		{
			serviceCode: "RAWG_PARSE_ERROR",
			module: "RAWG Provider",
			code: "RAWG_PARSE_ERROR",
			message: "Unexpected RAWG response"
		}
	],
	fallback: {
		module: "RAWG Provider",
		code: "RAWG_INTERNAL_ERROR",
		message: "Unexpected RAWG Provider error"
	}
});

describeDomainToHttpMapper({
	name: "Rawg",
	mapper: rawgDomainToHttpMapper,
	cases: [
		{ code: "RAWG_DISABLED", status: 503 },
		{ code: "RAWG_NOT_FOUND", status: 404 },
		{ code: "RAWG_RATE_LIMITED", status: 429 },
		{ code: "RAWG_REQUEST_ERROR", status: 502 },
		{ code: "RAWG_PARSE_ERROR", status: 502 }
	]
});
