import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Favorite Module";

export function favoriteLimitReached(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"FAVORITE_LIMIT_REACHED",
		"Favorites limit reached for free plan",
		context
	);
}

export function favoriteGamesNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"FAVORITE_GAMES_NOT_FOUND",
		"One or more games not found",
		context
	);
}

export function favoriteInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"FAVORITE_INTERNAL_ERROR",
		"Unexpected Favorite Service error",
		context
	);
}
