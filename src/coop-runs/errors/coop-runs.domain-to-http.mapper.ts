import { Request } from "express";

import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function coopRunsDomainToHttpMapper(
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

	if (
		error.code === "COOP_BACKLOG_NOT_FOUND" ||
		error.code === "COOP_TARGET_USER_NOT_FOUND" ||
		error.code === "COOP_MEMBER_NOT_FOUND" ||
		error.code === "COOP_SOURCE_NOT_IN_RUN"
	)
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "COOP_FORBIDDEN")
		return new HttpError({ ...baseOptions, status: 403 });

	if (
		error.code === "COOP_TARGET_NOT_FOLLOWED" ||
		error.code === "COOP_SELF_TAG" ||
		error.code === "COOP_ALREADY_TAGGED"
	)
		return new HttpError({ ...baseOptions, status: 422 });

	return new HttpError({ ...baseOptions, status: 500 });
}
