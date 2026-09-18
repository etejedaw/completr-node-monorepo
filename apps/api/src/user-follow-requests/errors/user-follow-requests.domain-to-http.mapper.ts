import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function userFollowRequestsDomainToHttpMapper(
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

	if (error.code === "USER_FOLLOW_REQUEST_USER_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF")
		return new HttpError({ ...baseOptions, status: 400 });

	if (error.code === "USER_FOLLOW_REQUEST_ALREADY_REQUESTED")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "USER_FOLLOW_REQUEST_ALREADY_FOLLOWING")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "USER_FOLLOW_REQUEST_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "USER_FOLLOW_REQUEST_NOT_ACCEPTING")
		return new HttpError({ ...baseOptions, status: 403 });

	return new HttpError({ ...baseOptions, status: 500 });
}
