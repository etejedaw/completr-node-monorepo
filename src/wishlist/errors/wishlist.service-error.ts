import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Wishlist Service" };

export function backlogNotFoundError() {
	return new ServiceError("WISHLIST_BACKLOG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function backlogNotOwnedError() {
	return new ServiceError("WISHLIST_BACKLOG_NOT_OWNED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function gameNotFoundError() {
	return new ServiceError("WISHLIST_GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function platformNotFoundError() {
	return new ServiceError("WISHLIST_PLATFORM_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyInWishlistError() {
	return new ServiceError("WISHLIST_ALREADY_EXISTS", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function limitReachedError() {
	return new ServiceError("WISHLIST_LIMIT_REACHED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function backlogsNotFoundError(missing: string[]) {
	return new ServiceError("WISHLIST_BACKLOGS_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: { missing }
	});
}

export function sourceGameMismatchError() {
	return new ServiceError("WISHLIST_SOURCE_GAME_MISMATCH", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function sourceBacklogMismatchError() {
	return new ServiceError("WISHLIST_SOURCE_BACKLOG_MISMATCH", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
