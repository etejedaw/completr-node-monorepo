import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as wishlistDomainError from "./wishlist.domain-error";

export function wishlistServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "WISHLIST_BACKLOG_NOT_FOUND")
		return wishlistDomainError.wishlistBacklogNotFound(context);

	if (error.code === "WISHLIST_BACKLOG_NOT_OWNED")
		return wishlistDomainError.wishlistBacklogNotOwned(context);

	if (error.code === "WISHLIST_GAME_NOT_FOUND")
		return wishlistDomainError.wishlistGameNotFound(context);

	if (error.code === "WISHLIST_PLATFORM_NOT_FOUND")
		return wishlistDomainError.wishlistPlatformNotFound(context);

	if (error.code === "WISHLIST_ALREADY_EXISTS")
		return wishlistDomainError.wishlistAlreadyExists(context);

	if (error.code === "WISHLIST_LIMIT_REACHED")
		return wishlistDomainError.wishlistLimitReached(context);

	if (error.code === "WISHLIST_BACKLOGS_NOT_FOUND")
		return wishlistDomainError.wishlistBacklogsNotFound(context);

	if (
		error.code === "WISHLIST_SOURCE_GAME_MISMATCH" ||
		error.code === "WISHLIST_SOURCE_BACKLOG_MISMATCH"
	)
		return wishlistDomainError.wishlistSourceMismatch(context);

	return wishlistDomainError.wishlistInternalError(context);
}
