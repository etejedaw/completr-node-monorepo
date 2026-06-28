import { Request } from "express";

import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function savedFiltersDomainToHttpMapper(
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

	if (error.code === "SAVED_FILTER_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "SAVED_FILTER_FORBIDDEN")
		return new HttpError({ ...baseOptions, status: 403 });

	if (error.code === "SAVED_FILTER_LIMIT_REACHED")
		return new HttpError({ ...baseOptions, status: 402 });

	if (error.code === "SAVED_FILTER_FROZEN")
		return new HttpError({ ...baseOptions, status: 402 });

	return new HttpError({ ...baseOptions, status: 500 });
}
