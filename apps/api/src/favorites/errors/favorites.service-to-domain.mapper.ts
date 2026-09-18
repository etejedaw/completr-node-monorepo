import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as favoriteDomainError from "./favorites.domain-error";

export function favoritesServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "FAVORITE_LIMIT_REACHED")
		return favoriteDomainError.favoriteLimitReached(context);

	if (error.code === "FAVORITE_GAMES_NOT_FOUND")
		return favoriteDomainError.favoriteGamesNotFound(context);

	return favoriteDomainError.favoriteInternalError(context);
}
