import { Request } from "express";
import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function gamesDomainToHttpMapper(
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

	if (error.code === "GAME_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "GAME_PLATFORM_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "GAME_GENRE_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "GAME_UNIQUE_CONSTRAINT")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "GAME_VALIDATION_ERROR")
		return new HttpError({ ...baseOptions, status: 400 });

	if (error.code === "GAME_FORBIDDEN")
		return new HttpError({ ...baseOptions, status: 403 });

	if (error.code === "GAME_VARIANT_REQUIRED")
		return new HttpError({ ...baseOptions, status: 422 });

	if (error.code === "GAME_SPLIT_INVALID")
		return new HttpError({ ...baseOptions, status: 400 });

	return new HttpError({ ...baseOptions, status: 500 });
}
