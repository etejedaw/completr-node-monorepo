import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function rewindEditionsDomainToHttpMapper(
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

	if (error.code === "REWIND_EDITION_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "REWIND_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "REWIND_EDITION_EXISTS")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "REWIND_EDITION_OVERLAP")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "REWIND_EDITION_FROZEN")
		return new HttpError({ ...baseOptions, status: 409 });

	return new HttpError({ ...baseOptions, status: 500 });
}
