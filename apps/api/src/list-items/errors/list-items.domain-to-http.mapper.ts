import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function listItemsDomainToHttpMapper(
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

	if (error.code === "LIST_ITEM_LIST_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "LIST_ITEM_GAMES_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "LIST_ITEM_FROZEN")
		return new HttpError({ ...baseOptions, status: 402 });

	if (error.code === "LIST_ITEM_UNIQUE_CONSTRAINT")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "LIST_ITEM_VALIDATION_ERROR")
		return new HttpError({ ...baseOptions, status: 422 });

	return new HttpError({ ...baseOptions, status: 500 });
}
