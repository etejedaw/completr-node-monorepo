import { iaDomainToHttpMapper } from "../../src/ia/errors/ia.domain-to-http.mapper";
import { iaErrorDomainNormalizer } from "../../src/ia/errors/ia.error-domain.normalizer";
import { iaServiceToDomainMapper } from "../../src/ia/errors/ia.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "IA",
	service: "IA Provider",
	mapper: iaServiceToDomainMapper,
	normalizer: iaErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "IA_NOT_CONFIGURED",
			module: "IA Provider",
			code: "IA_NOT_CONFIGURED",
			message: "AI features are not configured"
		},
		{
			serviceCode: "IA_INVALID_INPUT",
			module: "IA Provider",
			code: "IA_INVALID_INPUT",
			message: "Invalid AI generation request"
		},
		{
			serviceCode: "IA_PROVIDER_UNAVAILABLE",
			module: "IA Provider",
			code: "IA_PROVIDER_UNAVAILABLE",
			message: "AI provider is unavailable"
		},
		{
			serviceCode: "IA_TIMEOUT",
			module: "IA Provider",
			code: "IA_TIMEOUT",
			message: "AI provider timed out"
		},
		{
			serviceCode: "IA_INVALID_RESPONSE",
			module: "IA Provider",
			code: "IA_INVALID_RESPONSE",
			message: "Unexpected AI provider response"
		},
		{
			serviceCode: "IA_INVALID_OUTPUT",
			module: "IA Provider",
			code: "IA_INVALID_OUTPUT",
			message:
				"AI provider returned output that does not match the expected shape"
		}
	],
	fallback: {
		module: "IA Provider",
		code: "IA_INTERNAL_ERROR",
		message: "Unexpected IA Provider error"
	}
});

describeDomainToHttpMapper({
	name: "IA",
	mapper: iaDomainToHttpMapper,
	cases: [
		{ code: "IA_NOT_CONFIGURED", status: 503 },
		{ code: "IA_INVALID_INPUT", status: 422 },
		{ code: "IA_PROVIDER_UNAVAILABLE", status: 502 },
		{ code: "IA_INVALID_RESPONSE", status: 502 },
		{ code: "IA_INVALID_OUTPUT", status: 502 },
		{ code: "IA_TIMEOUT", status: 504 }
	]
});
