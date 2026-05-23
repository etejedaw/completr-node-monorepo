import { Request } from "express";
import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function queueDomainToHttpMapper(
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

	if (error.code === "QUEUE_BACKLOG_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "QUEUE_BACKLOG_NOT_OWNED")
		return new HttpError({ ...baseOptions, status: 403 });

	if (error.code === "QUEUE_GAME_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "QUEUE_PLATFORM_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "QUEUE_ALREADY_EXISTS")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "QUEUE_LIMIT_REACHED")
		return new HttpError({ ...baseOptions, status: 402 });

	if (error.code === "QUEUE_BACKLOGS_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "QUEUE_SOURCE_MISMATCH")
		return new HttpError({ ...baseOptions, status: 400 });

	if (error.code === "QUEUE_BACKLOG_NOT_STARTED")
		return new HttpError({ ...baseOptions, status: 409 });

	return new HttpError({ ...baseOptions, status: 500 });
}
