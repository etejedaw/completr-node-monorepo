import { Request } from "express";

import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function wishlistDomainToHttpMapper(
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

	if (error.code === "WISHLIST_LIMIT_REACHED")
		return new HttpError({ ...baseOptions, status: 402 });

	if (error.code === "WISHLIST_GAMES_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "WISHLIST_ALREADY_EXISTS")
		return new HttpError({ ...baseOptions, status: 409 });

	if (error.code === "WISHLIST_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "WISHLIST_PLATFORM_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	return new HttpError({ ...baseOptions, status: 500 });
}
