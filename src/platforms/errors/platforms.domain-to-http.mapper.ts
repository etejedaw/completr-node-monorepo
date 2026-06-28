import { Request } from "express";

import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function platformsDomainToHttpMapper(
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

	if (error.code === "PLATFORM_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "PLATFORM_UNIQUE_CONSTRAINT")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "PLATFORM_VALIDATION_ERROR")
		return new HttpError({ ...baseOptions, status: 400 });

	return new HttpError({ ...baseOptions, status: 500 });
}
