import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function wikidataDomainToHttpMapper(
	error: DomainError,
	request: Request
): HttpError {
	const baseOptions = {
		type: error.code,
		title: error.message,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.locals?.correlationId as string,
		context: error.context
	};

	if (error.code === "WIKIDATA_RATE_LIMITED")
		return new HttpError({ ...baseOptions, status: 429 });

	if (
		error.code === "WIKIDATA_REQUEST_ERROR" ||
		error.code === "WIKIDATA_PARSE_ERROR" ||
		error.code === "WIKIDATA_BLOCKED"
	)
		return new HttpError({ ...baseOptions, status: 502 });

	if (error.code === "WIKIDATA_TIMEOUT" || error.code === "WIKIDATA_ABORTED")
		return new HttpError({ ...baseOptions, status: 504 });

	return new HttpError({ ...baseOptions, status: 500 });
}
