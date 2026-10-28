import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function iaDomainToHttpMapper(
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

	if (error.code === "IA_NOT_CONFIGURED")
		return new HttpError({ ...baseOptions, status: 503 });

	if (error.code === "IA_INVALID_INPUT")
		return new HttpError({ ...baseOptions, status: 422 });

	if (
		error.code === "IA_PROVIDER_UNAVAILABLE" ||
		error.code === "IA_INVALID_RESPONSE"
	)
		return new HttpError({ ...baseOptions, status: 502 });

	if (error.code === "IA_TIMEOUT")
		return new HttpError({ ...baseOptions, status: 504 });

	return new HttpError({ ...baseOptions, status: 500 });
}
