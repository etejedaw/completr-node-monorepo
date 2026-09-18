import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function moodTagsDomainToHttpMapper(
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

	if (error.code === "MOOD_TAGS_GAME_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "MOOD_TAGS_TOO_MANY")
		return new HttpError({ ...baseOptions, status: 422 });

	if (error.code === "MOOD_TAGS_TAG_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "MOOD_TAGS_INVALID_TAG")
		return new HttpError({ ...baseOptions, status: 422 });

	return new HttpError({ ...baseOptions, status: 500 });
}
