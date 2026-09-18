import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function usersDomainToHttpMapper(
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

	if (error.code === "USER_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "USER_VALIDATION_ERROR")
		return new HttpError({ ...baseOptions, status: 400 });

	if (error.code === "USER_PRIVATE")
		return new HttpError({ ...baseOptions, status: 403 });

	if (error.code === "USER_THEME_FORBIDDEN")
		return new HttpError({ ...baseOptions, status: 403 });

	if (error.code === "USER_ALREADY_EXISTS")
		return new HttpError({ ...baseOptions, status: 409 });

	return new HttpError({ ...baseOptions, status: 500 });
}
