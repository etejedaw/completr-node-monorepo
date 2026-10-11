import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function scoreSourcesDomainToHttpMapper(
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

	if (error.code === "SCORE_SOURCE_ALREADY_EXISTS")
		return new HttpError({ ...baseOptions, status: 409 });

	return new HttpError({ ...baseOptions, status: 500 });
}
