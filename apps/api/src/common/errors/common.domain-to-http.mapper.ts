import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function commonDomainToHttpMapper(
	error: DomainError,
	request: Request
): HttpError {
	const baseOptions = {
		type: error.code,
		title: error.message,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.locals?.correlationId as string,
		context: error.context,
		issues: error.issues
	};

	if (error.code === "COMMON_SCHEMA_INVALID")
		return new HttpError({ ...baseOptions, status: 422 });

	if (error.code === "COMMON_RESOURCE_IN_USE")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "COMMON_REFERENCE_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 422 });

	return new HttpError({ ...baseOptions, status: 500 });
}
