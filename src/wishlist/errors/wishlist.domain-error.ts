import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Wishlist Module";

export function wishlistLimitReached(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_LIMIT_REACHED",
		"Wishlist limit reached for free plan",
		context
	);
}

export function wishlistGamesNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_GAMES_NOT_FOUND",
		"One or more games not found",
		context
	);
}

export function wishlistAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_ALREADY_EXISTS",
		"Game is already in your wishlist",
		context
	);
}

export function wishlistNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_NOT_FOUND",
		"Wishlist entry not found",
		context
	);
}

export function wishlistInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_INTERNAL_ERROR",
		"Unexpected Wishlist Service error",
		context
	);
}
