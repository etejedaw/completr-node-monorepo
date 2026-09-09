import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function rawgDomainToHttpMapper(
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

	if (error.code === "RAWG_DISABLED")
		return new HttpError({ ...baseOptions, status: 503 });

	if (error.code === "RAWG_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "RAWG_RATE_LIMITED")
		return new HttpError({ ...baseOptions, status: 429 });

	if (
		error.code === "RAWG_REQUEST_ERROR" ||
		error.code === "RAWG_PARSE_ERROR"
	)
		return new HttpError({ ...baseOptions, status: 502 });

	return new HttpError({ ...baseOptions, status: 500 });
}
