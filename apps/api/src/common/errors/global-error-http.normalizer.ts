import { type Request } from "express";

import { commonDomainToHttpMapper } from "./common.domain-to-http.mapper";
import { type DomainError } from "./domain-error";
import { DOMAIN_ERROR_HTTP_MAPPERS } from "./error-registry";
import { HttpError } from "./http-error";

const COMMON_MODULE_NAMES = new Set(["Common Module", "COMMON"]);

export function globalErrorHttpNormalizer(
	error: DomainError,
	request: Request
) {
	if (COMMON_MODULE_NAMES.has(error.module))
		return commonDomainToHttpMapper(error, request);

	const mapper = Object.hasOwn(DOMAIN_ERROR_HTTP_MAPPERS, error.module)
		? DOMAIN_ERROR_HTTP_MAPPERS[error.module]
		: undefined;
	if (mapper) return mapper(error, request);

	return new HttpError({
		type: error.code,
		title: error.message,
		status: 500,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.locals?.correlationId as string,
		context: error.context
	});
}
