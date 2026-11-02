import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function rewindDomainToHttpMapper(
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

	if (error.code === "REWIND_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "USER_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "USER_PRIVATE")
		return new HttpError({ ...baseOptions, status: 403 });

	if (error.code === "REWIND_NOT_GENERATED")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "REWIND_GENERATION_CONFLICT")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "REWIND_REGENERATION_LIMIT")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "REWIND_AI_RECAP_PREMIUM_REQUIRED")
		return new HttpError({ ...baseOptions, status: 402 });

	if (error.code === "REWIND_AI_RECAP_EXISTS")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "REWIND_AI_RECAP_IN_PROGRESS")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "REWIND_AI_RECAP_FAILED")
		return new HttpError({ ...baseOptions, status: 503 });

	return new HttpError({ ...baseOptions, status: 500 });
}
