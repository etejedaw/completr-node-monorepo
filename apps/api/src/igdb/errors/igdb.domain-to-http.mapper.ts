import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function igdbDomainToHttpMapper(
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

	if (error.code === "IGDB_DISABLED")
		return new HttpError({ ...baseOptions, status: 503 });

	if (error.code === "IGDB_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "IGDB_RATE_LIMITED")
		return new HttpError({ ...baseOptions, status: 429 });

	if (
		error.code === "IGDB_AUTH_ERROR" ||
		error.code === "IGDB_REQUEST_ERROR" ||
		error.code === "IGDB_PARSE_ERROR"
	)
		return new HttpError({ ...baseOptions, status: 502 });

	return new HttpError({ ...baseOptions, status: 500 });
}
