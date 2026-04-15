import { Request } from "express";
import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function authDomainToHttpMapper(
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

	if (error.code === "AUTH_USER_ALREADY_EXISTS")
		return new HttpError({
			...baseOptions,
			detail: "The email or username are already registered. Use a different",
			status: 409
		});

	if (error.code === "AUTH_INVALID_CREDENTIALS")
		return new HttpError({
			...baseOptions,
			detail: "Invalid email or password",
			status: 401
		});

	if (error.code === "AUTH_INVALID_TOKEN")
		return new HttpError({
			...baseOptions,
			detail: "The access token is invalid or expired",
			status: 401
		});

	if (error.code === "AUTH_SCHEMA_INVALID")
		return new HttpError({
			...baseOptions,
			detail: "The provided authentication data does not match the required format",
			status: 422
		});

	if (error.code === "AUTH_RATE_LIMITED")
		return new HttpError({
			...baseOptions,
			detail: "Too many authentication attempts. Please try again later.",
			status: 429
		});

	if (error.code === "AUTH_FORBIDDEN")
		return new HttpError({
			...baseOptions,
			detail: "Your role does not grant permission",
			status: 403
		});

	if (error.code === "AUTH_INVALID_REFRESH_TOKEN")
		return new HttpError({
			...baseOptions,
			detail: "The refresh token is invalid, expired or has already been used",
			status: 401
		});

	return new HttpError({ ...baseOptions, status: 500 });
}
