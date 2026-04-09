import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Wishlist Module";

export function wishlistBacklogNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_BACKLOG_NOT_FOUND",
		"Backlog entry not found",
		context
	);
}

export function wishlistBacklogNotOwned(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_BACKLOG_NOT_OWNED",
		"Backlog entry does not belong to you",
		context
	);
}

export function wishlistGameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_GAME_NOT_FOUND",
		"Game not found",
		context
	);
}

export function wishlistPlatformNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_PLATFORM_NOT_FOUND",
		"Platform not found",
		context
	);
}

export function wishlistAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_ALREADY_EXISTS",
		"This entry is already in your wishlist",
		context
	);
}

export function wishlistLimitReached(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_LIMIT_REACHED",
		"Wishlist limit reached for free plan",
		context
	);
}

export function wishlistBacklogsNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_BACKLOGS_NOT_FOUND",
		"One or more backlog entries not found",
		context
	);
}

export function wishlistSourceMismatch(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WISHLIST_SOURCE_MISMATCH",
		"Body field does not match source query param",
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
