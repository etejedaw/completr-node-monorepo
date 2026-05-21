import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as wishlistDomainError from "./wishlist.domain-error";

export function wishlistServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "WISHLIST_LIMIT_REACHED")
		return wishlistDomainError.wishlistLimitReached(context);

	if (error.code === "WISHLIST_GAMES_NOT_FOUND")
		return wishlistDomainError.wishlistGamesNotFound(context);

	if (error.code === "WISHLIST_ALREADY_EXISTS")
		return wishlistDomainError.wishlistAlreadyExists(context);

	if (error.code === "WISHLIST_NOT_FOUND")
		return wishlistDomainError.wishlistNotFound(context);

	return wishlistDomainError.wishlistInternalError(context);
}
