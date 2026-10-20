import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function invitationsDomainToHttpMapper(
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
		error.code === "INVITATION_NOT_FOUND" ||
		error.code === "INVITATION_INVALID_TOKEN"
	)
		return new HttpError({ ...baseOptions, status: 404 });

	if (
		error.code === "INVITATION_EMAIL_REGISTERED" ||
		error.code === "INVITATION_UNIQUE_CONSTRAINT"
	)
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "INVITATION_VALIDATION_ERROR")
		return new HttpError({ ...baseOptions, status: 400 });

	return new HttpError({ ...baseOptions, status: 500 });
}
