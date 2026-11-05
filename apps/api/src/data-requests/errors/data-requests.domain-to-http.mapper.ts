import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function dataRequestsDomainToHttpMapper(
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

	if (error.code === "DATA_REQUEST_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (
		error.code === "DATA_REQUEST_ALREADY_PENDING" ||
		error.code === "DATA_REQUEST_NOT_PENDING" ||
		error.code === "DATA_REQUEST_NOT_DOWNLOADABLE"
	)
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "DATA_REQUEST_EXPIRED")
		return new HttpError({ ...baseOptions, status: 410 });

	if (error.code === "DATA_REQUEST_VALIDATION_ERROR")
		return new HttpError({ ...baseOptions, status: 400 });

	return new HttpError({ ...baseOptions, status: 500 });
}
