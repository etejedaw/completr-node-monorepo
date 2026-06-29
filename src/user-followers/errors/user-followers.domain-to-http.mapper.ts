import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function userFollowersDomainToHttpMapper(
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

	if (error.code === "USER_FOLLOWER_USER_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "USER_FOLLOWER_NOT_FOLLOWING")
		return new HttpError({ ...baseOptions, status: 404 });

	return new HttpError({ ...baseOptions, status: 500 });
}
